class CraftingTracker {
    static id = "crafting_tracker"
    static displayName = "Crafting Tracker";
    static icon = "<img src='images/ui/crafting_icon.png' alt='Crafting Tracker Icon'/>";
    static category = "recipe";
    css = `
.crafting-item-container {
    display: flex;
    flex-direction: column;
}

body .crafting-container {
    height: auto;
    flex: 1 0 auto;
}

.crafting-info-table {
    display: grid; /* Grid Layout specified by js */
    grid-gap: 5px;
    /* combination of rgba(36, 36, 36, .671) in front of rgba(0, 0, 0, .705) */
    background: rgba(24.156, 24.156, 24.156, .902945);
    border: 2px solid gray;
    padding: 6px;
    margin-top: 6px;
    border-radius: 6px;
}

.crafting-info-table-content {
    text-align: center;
}

.crafting-info-table-content:first-child {
    grid-column: 2;
}

.text-4xl {
    font-size: 2.25rem;
    line-height: 2.5rem;
}
    `;

    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        if (!this.settings.profit) {
            this.settings.profit = "none";
        }
        this.cssNode = injectCSS(this.css);

        this.lastCraftedItemId = null;
        this.lastSelectedNavTab = null;

        this.observer = new MutationObserver(mutations => {
            const selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab')[0];
            if (!selectedSkill) {
                return;
            }
            if (selectedSkill.innerText !== 'Crafting') {
                return;
            }
            this.craftingTracker();
        });
    }

    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.observer.observe(playAreaContainer, {
            attributes: true,
            attributeFilter: ['src'],
            childList: true,
            subtree: true,
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.observer.disconnect();
    }

    settingsMenuContent() {
        let extensionSetting = document.createElement('div');
        extensionSetting.classList.add('tracker-extension-setting');
        extensionSetting.insertAdjacentHTML('beforeend',`
<div class="tracker-extension-setting-name">
    Profit
</div>
        `);
        extensionSetting.append(this.tracker.selectMenu(CraftingTracker.id + "-profit", {
                none: "None",
                percent: "Percent",
                flat: "Flat",
            }, this.settings.profit));
        return extensionSetting;
    }

    craftingTracker(){
        let recipeNode = document.getElementsByClassName("crafting-container")[0];
        if (!recipeNode) {
            this.lastCraftedItemId = null;
            return;
        }
        const craftedItemId = convertItemId(recipeNode.getElementsByClassName("crafting-item-icon")[0].firstChild.src);
        // prevent repeated calls
        if (craftedItemId === this.lastCraftedItemId) {
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

        const craftedItemIcon = recipeNode.getElementsByClassName("crafting-item-icon")[0].firstChild.src;
        let craftedItemCount = 1;
        // for recipes which result in more than one item (usually baits)
        const description = recipeNode.getElementsByClassName('crafting-item-description')[0].innerText;
        const regex = /(?<=Each craft results in )\d+/.exec(description);
        if (regex !== null) {
            craftedItemCount = parseInt(regex[0]);
        }

        const resourceItemNodes = recipeNode.getElementsByClassName("crafting-item-resource");
        let resourceItemIds = [];
        let resourceItemIcons = [];
        let resourceItemCounts = [];
        for (let i = 0; i < resourceItemNodes.length; i++) {
            let resourceItemId = convertItemId(resourceItemNodes[i].childNodes[1].src);
            if (resourceItemId.includes('essence')) {
                continue;
            }
            resourceItemIds.push(resourceItemId);
            resourceItemIcons.push(resourceItemNodes[i].childNodes[1].src);
            resourceItemCounts.push(parseInt(resourceItemNodes[i].firstChild.textContent.replace(/\./g, '')));
        }

        let response = storageRequest({
            type: 'crafting-recipe',
            craftedItemId: craftedItemId,
            resourceItemIds: resourceItemIds
        });
        // remove existing table
        if (document.getElementsByClassName("crafting-info-table").length !== 0) {
            document.getElementsByClassName("crafting-info-table")[0].remove();
        }
        let craftingContainer = document.getElementsByClassName("crafting-item-container")[0];
        saveInsertAdjacentHTML(craftingContainer, 'beforeend', this.craftingInfoTemplate(response.craftedItemMinPrice,
                                                                                            response.craftedItemMaxPrice,
                                                                                            craftedItemCount,
                                                                                            craftedItemIcon,
                                                                                            response.resourceItemMinPrices,
                                                                                            response.resourceItemMaxPrices,
                                                                                            resourceItemCounts,
                                                                                            resourceItemIcons));
    }

    craftingInfoTemplate(craftedItemMinPrice,
                            craftedItemMaxPrice,
                            craftedItemCount,
                            craftedItemIcon,
                            resourceItemMinPrices,
                            resourceItemMaxPrices,
                            resourceItemCounts,
                            resourceItemIcons) {
        const resourceImgs = resourceItemIcons.map(icon => `
            <div class="crafting-info-table-content">
                <img class="crafting-item-resource-icon" src="${icon}">
            </div>`).join("");
        const resourceMinHTML = resourceItemMinPrices.map(price => `<span class="crafting-info-table-content">${numberWithSeparators(limitDecimalPlaces(price, 2))}</span>`).join("");
        const resourceMaxHTML = resourceItemMaxPrices.map(price => `<span class="crafting-info-table-content">${numberWithSeparators(limitDecimalPlaces(price, 2))}</span>`).join("");
        const [totalResourceMinPrice, totalResourceMaxPrice] = totalRecipePrice(resourceItemMinPrices, resourceItemMaxPrices, resourceItemCounts);

        let totalCraftedItemHeaderHTML = "";
        let totalCraftedItemMinHTML = "";
        let totalCraftedItemMaxHTML = "";
        if (craftedItemCount > 1) {
            const totalCraftedItemMinPrice = (craftedItemMinPrice !== "?") ? craftedItemMinPrice * craftedItemCount : "?";
            const totalCraftedItemMaxPrice = (craftedItemMinPrice !== "?") ? craftedItemMaxPrice * craftedItemCount : "?";
            totalCraftedItemHeaderHTML = `<span class="crafting-info-table-content text-4xl">&Sigma;</span>`;
            totalCraftedItemMinHTML = `<span class="crafting-info-table-content">${numberWithSeparators(limitDecimalPlaces(totalCraftedItemMinPrice, 2))}</span>`;
            totalCraftedItemMaxHTML = `<span class="crafting-info-table-content">${numberWithSeparators(limitDecimalPlaces(totalCraftedItemMaxPrice, 2))}</span>`;
        }
        let profitHeaderHTML = "";
        let minProfitHTML = ""
        let maxProfitHTML = ""
        // Profit includes 5% market fee
        if (this.settings.profit !== "none") {
            profitHeaderHTML = `<span class="crafting-info-table-content"><img src="/images/money_icon.png" class="crafting-item-resource-icon" alt="Profit"></span>`;
            minProfitHTML = `<span class="crafting-info-table-content">${numberWithSeparators(profit(this.settings.profit, totalResourceMinPrice, craftedItemMinPrice))}</span>`;
            maxProfitHTML = `<span class="crafting-info-table-content">${numberWithSeparators(profit(this.settings.profit, totalResourceMaxPrice, craftedItemMaxPrice))}</span>`;
        }
        return `
<div class="crafting-info-table" style="grid-template-columns: 150px repeat(${resourceItemMinPrices.length + 2 + (craftedItemCount > 1) + (this.settings.profit !== "none")}, 1fr)">
    <!-- header -->
    ${resourceImgs}
    <span class="crafting-info-table-content text-4xl">
        &Sigma;
    </span>
    <div class="crafting-info-table-content">
        <img class="crafting-info-table-content crafting-item-resource-icon" src="${craftedItemIcon}">
    </div>
    ${totalCraftedItemHeaderHTML}
    ${profitHeaderHTML}

    <!-- min -->
    <span class="crafting-info-table-content">
        Minimal Marketprice
    </span>
    ${resourceMinHTML}
    <span class="crafting-info-table-content">
        ${numberWithSeparators(limitDecimalPlaces(totalResourceMinPrice, 2))}
    </span>
    <span class="crafting-info-table-content">
        ${numberWithSeparators(limitDecimalPlaces(craftedItemMinPrice, 2))}
    </span>
    ${totalCraftedItemMinHTML}
    ${minProfitHTML}

    <!-- max -->
    <span class="crafting-info-table-content">
        Maximal Marketprice
    </span>
    ${resourceMaxHTML}
    <span class="crafting-info-table-content">
        ${numberWithSeparators(limitDecimalPlaces(totalResourceMaxPrice, 2))}
    </span>
    <span class="crafting-info-table-content">
        ${numberWithSeparators(limitDecimalPlaces(craftedItemMaxPrice, 2))}
    </span>
    ${totalCraftedItemMaxHTML}
    ${maxProfitHTML}
</div>
        `;
    }
}
