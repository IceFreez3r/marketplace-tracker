class CraftingTracker {
    static id = "crafting_tracker";
    static displayName = "Crafting Tracker";
    static icon = "<img src='images/ui/crafting_icon.png' alt='Crafting Tracker Icon'/>";
    static category = "recipe";
    css = `
.crafting-container {
    grid-template-rows: 1fr max-content;
}

.crafting-info-table {
    grid-column: span 2;
    display: grid; /* Grid Layout specified by js */
    grid-gap: 5px;
    padding: 15px 20px;
    margin-top: 6px;
    border-radius: 6px;
    place-items: center;
}

.crafting-info-table-content:first-child {
    grid-column: 2;
}

.crafting-info-table-content {
    display: flex;
}

.crafting-info-table-icon {
    margin: 4px 10px;
    width: 32px;
    height: 32px;
    object-fit: contain;
}

.crafting-info-table-vendor-icon {
    width: 16px;
    height: 16px;
    object-fit: contain;
}

.crafting-info-table-font {
    font-size: 2.25rem;
    line-height: 2.5rem;
}

/* Gold per experience */
.crafting-gold-per-exp {
    text-align: center;
    font-size: 16px;
}

.crafting-gold-per-exp-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
}
    `;

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;
        if (this.settings.profit === undefined) {
            this.settings.profit = "off";
        }
        if (this.settings.goldPerXP === undefined) {
            this.settings.goldPerXP = 1;
        }
        if (
            this.settings.min_column === undefined ||
            this.settings.median_column === undefined ||
            this.settings.max_column === undefined
        ) {
            this.settings.min_column = true;
            this.settings.median_column = true;
            this.settings.max_column = true;
        }
        this.cssNode = injectCSS(this.css);

        this.lastCraftedItemId = null;
        this.lastSelectedNavTab = null;

        this.playAreaObserver = new MutationObserver((mutations) => {
            this.checkForCrafting(mutations);
        });
    }

    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.playAreaObserver.observe(playAreaContainer, {
            attributes: true,
            attributeFilter: ["src"],
            childList: true,
            subtree: true,
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
    }

    settingsMenuContent() {
        let profitType = document.createElement("div");
        profitType.classList.add("tracker-module-setting");
        profitType.insertAdjacentHTML(
            "beforeend",
            `
            <div class="tracker-module-setting-name">
                Profit
            </div>`
        );
        profitType.append(
            Templates.selectMenu(
                CraftingTracker.id + "-profit",
                {
                    off: "Off",
                    percent: "Percent",
                    flat: "Flat",
                },
                this.settings.profit
            )
        );

        const goldPerXP = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Show Gold Per Experience
                </div>
                ${Templates.checkboxTemplate(CraftingTracker.id + "-goldPerXP", this.settings.goldPerXP)}
            </div>`;
        const columns = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Min Column
                </div>
                ${Templates.checkboxTemplate(CraftingTracker.id + "-min_column", this.settings.min_column)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Median Column
                </div>
                ${Templates.checkboxTemplate(CraftingTracker.id + "-median_column", this.settings.median_column)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Max Column
                </div>
                ${Templates.checkboxTemplate(CraftingTracker.id + "-max_column", this.settings.max_column)}
            </div>`;
        return [profitType, goldPerXP, columns];
    }

    settingChanged(settingId, value) {
        return;
    }

    onAPIUpdate() {
        this.checkForCrafting(null, true);
    }

    checkForCrafting(mutations, forceUpdate = false) {
        if (getSelectedSkill() === "Crafting") {
            if (mutations && detectInfiniteLoop(mutations)) {
                return;
            }
            this.craftingTracker(forceUpdate);
        }
    }

    craftingTracker(forceUpdate = false) {
        let recipeNode = document.getElementsByClassName("crafting-container")[0];
        if (!recipeNode) {
            this.lastCraftedItemId = null;
            return;
        }
        const craftedItemIcon = recipeNode
            .getElementsByClassName("crafting-item-icon")[0]
            .getElementsByTagName("img")[0].src;
        let craftedItemId = convertItemId(craftedItemIcon);
        if (this.storage.itemRequiresFallback(craftedItemId)) {
            craftedItemId = recipeNode.getElementsByClassName("crafting-item-name")[0].innerText;
        }
        // prevent repeated calls
        if (!forceUpdate && craftedItemId === this.lastCraftedItemId) {
            // for items with multiple recipes
            const selectedNavTab = recipeNode.getElementsByClassName("selected-tab")[0];
            if (!selectedNavTab) {
                return;
            }
            if (this.lastSelectedNavTab === selectedNavTab.innerText) {
                return;
            }
            this.lastSelectedNavTab = selectedNavTab.innerText;
        }
        this.lastCraftedItemId = craftedItemId;
        const craftingAmount = parseInt(document.getElementById("craftCount").value);
        const productCount = parseInt(document.querySelector(".crafting-item-icon > .centered")?.textContent) || 1;

        const resourceItemNodes = recipeNode.getElementsByClassName("crafting-item-resource");
        let resourceItemIds = [];
        let resourceItemIcons = [];
        let resourceItemCounts = [];
        for (let i = 0; i < resourceItemNodes.length; i++) {
            let resourceItemId = convertItemId(resourceItemNodes[i].childNodes[1].src);
            resourceItemIds.push(resourceItemId);
            resourceItemIcons.push(resourceItemNodes[i].childNodes[1].src);
            resourceItemCounts.push(parseNumberString(resourceItemNodes[i].firstChild.textContent) / craftingAmount);
        }

        const recipePrices = this.storage.handleRecipe(resourceItemIds, craftedItemId);
        // TODO: use vendor price where appropriate

        // crafting info table
        document.getElementsByClassName("crafting-info-table")[0]?.remove();
        const craftingContainer = document.getElementsByClassName("crafting-container")[0];
        const ingredients = Object.assign(recipePrices.ingredients, {
            icons: resourceItemIcons,
            counts: resourceItemCounts,
        });
        const product = Object.assign(recipePrices.product, { icon: craftedItemIcon, count: productCount });
        saveInsertAdjacentHTML(
            craftingContainer,
            "beforeend",
            Templates.infoTableTemplate(
                "crafting",
                [this.settings.min_column, this.settings.median_column, this.settings.max_column],
                ingredients,
                product,
                this.settings.profit,
                false,
                false,
                undefined,
                undefined,
                "idlescape-container"
            )
        );

        if (this.settings.goldPerXP) {
            this.goldPerXP(recipeNode, ingredients, product, resourceItemCounts, productCount);
        }
    }

    goldPerXP(recipeNode, ingredients, product, resourceItemCounts, productCount) {
        document.getElementsByClassName("crafting-gold-per-exp")[0]?.remove();
        const experienceNode = recipeNode.getElementsByClassName("crafting-item-exp small")[0];
        const experience = parseNumberString(experienceNode.childNodes[0].textContent);
        if (experience === 0) {
            return;
        }
        const betterVendorThanMin = profit("flat", product.vendorPrice, product.minPrice) < 0;
        const betterMinSellPrice = (betterVendorThanMin ? product.vendorPrice : product.minPrice) * productCount;
        const betterVendorThanMax = profit("flat", product.vendorPrice, product.maxPrice) < 0;
        const betterMaxSellPrice = (betterVendorThanMax ? product.vendorPrice : product.maxPrice) * productCount;
        let minCost = -profit(
            "flat",
            totalRecipePrice(ingredients.minPrices, resourceItemCounts),
            betterMinSellPrice,
            undefined,
            betterVendorThanMin
        );
        let maxCost = -profit(
            "flat",
            totalRecipePrice(ingredients.maxPrices, resourceItemCounts),
            betterMaxSellPrice,
            undefined,
            betterVendorThanMax
        );
        // swap min and max if min is higher than max
        if (minCost > maxCost) {
            [minCost, maxCost] = [maxCost, minCost];
        }
        saveInsertAdjacentHTML(
            experienceNode,
            "afterend",
            `
            <div class="crafting-gold-per-exp">
                <span>
                    ${formatNumber(minCost / experience, true)} ~ ${formatNumber(maxCost / experience, true)}
                </span>
                <img class="crafting-gold-per-exp-icon" src="/images/money_icon.png">
                <span>/</span>
                <img class="crafting-gold-per-exp-icon" src="/images/total_level.png">
            </div>`
        );
    }
}
