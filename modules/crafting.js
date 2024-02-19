class CraftingTracker {
    static id = "crafting_tracker";
    static displayName = "Crafting Tracker";
    static icon = "<img src='images/ui/crafting_icon.png' alt='Crafting Tracker Icon'/>";
    static category = "recipe";
    css = `
.crafting-container {
    grid-template-rows: 1fr max-content;
}

.mobile-layout .crafting-container {
    display: block;
}

.crafting-info-table {
    position: relative;
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
            this.settings.min_row === undefined ||
            this.settings.median_row === undefined ||
            this.settings.max_row === undefined
        ) {
            this.settings.min_row = true;
            this.settings.median_row = true;
            this.settings.max_row = true;
        }
        this.cssNode = injectCSS(this.css);

        this.lastCraftedApiId = null;
        this.lastSelectedNavTab = null;

        this.playAreaObserver = new MutationObserver((mutations) => {
            this.checkForCrafting(mutations);
        });
    }

    onGameReady() {
        const playAreaContainer = getPlayAreaContainer();
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
        const rows = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Min Row
                </div>
                ${Templates.checkboxTemplate(CraftingTracker.id + "-min_row", this.settings.min_row)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Median Row
                </div>
                ${Templates.checkboxTemplate(CraftingTracker.id + "-median_row", this.settings.median_row)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Max Row
                </div>
                ${Templates.checkboxTemplate(CraftingTracker.id + "-max_row", this.settings.max_row)}
            </div>`;
        return [profitType, goldPerXP, rows];
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
        let recipeNode = document.getElementsByClassName("crafting-recipe")[0];
        if (!recipeNode) {
            this.lastCraftedApiId = null;
            return;
        }
        const craftedItem = recipeNode.querySelector(".crafting-item-icon > .item");
        const craftedApiId = convertApiId(craftedItem);
        // prevent repeated calls
        if (!forceUpdate && craftedApiId === this.lastCraftedApiId) {
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
        this.lastCraftedApiId = craftedApiId;
        const craftedItemIcon = craftedItem.getElementsByTagName("img")[0].src;
        const productCount = parseInt(document.querySelector(".crafting-item-icon .centered")?.textContent ?? 1);

        const resourceItemNodes = recipeNode.getElementsByClassName("anchor-resource-cost");
        let resourceApiIds = [];
        let resourceItemIcons = [];
        let resourceItemCounts = [];
        for (let i = 0; i < resourceItemNodes.length; i++) {
            resourceApiIds.push(convertApiId(resourceItemNodes[i]));
            resourceItemIcons.push(resourceItemNodes[i].getElementsByClassName("anchor-resource-cost-icon")[0].src);
            resourceItemCounts.push(
                parseNumberString(
                    resourceItemNodes[i].getElementsByClassName("anchor-resource-cost-amount")[0].textContent
                )
            );
        }

        const recipePrices = this.storage.handleRecipe(resourceApiIds, craftedApiId);

        // crafting info table
        document.getElementsByClassName("crafting-info-table")[0]?.remove();
        const recipeContainer = document.getElementsByClassName("crafting-recipe")[0];
        const ingredients = Object.assign(recipePrices.ingredients, {
            icons: resourceItemIcons,
            counts: resourceItemCounts,
        });
        const product = Object.assign(recipePrices.products, { icons: [craftedItemIcon], counts: [productCount] });
        saveInsertAdjacentHTML(
            recipeContainer,
            "afterend",
            Templates.infoTableTemplate(
                "crafting",
                [this.settings.min_row, this.settings.median_row, this.settings.max_row],
                ingredients,
                product,
                this.settings.profit,
                false,
                false,
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
        const experienceNode = recipeNode.getElementsByClassName("crafting-item-exp")[0];
        const experience = parseNumberString(experienceNode.childNodes[1].textContent);
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
