class SmithingTracker {
    static id = "smithing_tracker";
    static displayName = "Smithing Tracker";
    static icon = "<img src='/images/smithing/smithing_icon.png' alt='Smithing Tracker Icon'>";
    static category = "recipe";
    css = `
.theme-smithing .resource-list {
    grid-template-columns: repeat(auto-fill, 300px);
}

.theme-smithing .resource-wrapper {
    position: unset;
    height: unset;
    width: unset;
    overflow: unset;
}

.theme-smithing .resource-container {
    width: 100%;
    height: unset;
}

.theme-smithing .resource-required-resources {
    position: unset;
    display: flex;
    flex-direction: column;
    height: 6rem;
    width: min-content;
    float: left;
    justify-content: flex-end;
}

.theme-smithing .resource-property {
    width: fit-content;
    margin-top: 3px;
    margin-bottom: unset;
}

.theme-smithing .resource-container-image {
    height: 6rem;
    margin: 0 5px 5px 0;
    float: right;
}

.theme-smithing .resource-container-progress[aria-valuenow="0"] {
    display: none;
}

.theme-smithing .resource-container-button {
    position: unset;
}

.smithing-info-table {
    display: grid;
    /* Grid Layout specified by js */
    grid-gap: 3px;
    margin: 5px;
    padding: 5px;
    background-color: rgba(66, 66, 66, .2);
    border: 2px solid rgba(99, 99, 99, .2);
    border-radius: 10px;
    clear: both;
    font-size: 13px;
}

.smithing-info-table-content {
    text-align: center;
    margin: auto;
    display: flex;
}

.smithing-info-table-content:first-child {
    grid-column: 2;
}

.smithing-item-resource-icon {
    height: 16px;
    padding-right: 2px;
}
    `;

    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        if (!this.settings.profit) {
            this.settings.profit = "percent";
        }
        this.cssNode = injectCSS(this.css);

        this.observer = new MutationObserver(mutations => {
            const selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab')[0];
            if (!selectedSkill) {
                return;
            }
            if (selectedSkill.innerText !== 'Smithing') {
                return;
            }
            this.smithingTracker();
        });
    }
    
    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.observer.observe(playAreaContainer, {
            childList: true,
            subtree: true
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.observer.disconnect();
    }

    settingsMenuContent() {
        let moduleSetting = document.createElement('div');
        moduleSetting.classList.add('tracker-module-setting');
        moduleSetting.insertAdjacentHTML('beforeend', `
<div class="tracker-module-setting-name">
    Profit
</div>
        `);
        moduleSetting.append(this.tracker.selectMenu(SmithingTracker.id + "-profit", {
            none: "None",
            percent: "Percent",
            flat: "Flat",
            per_hour: "Per Hour",
        }, this.settings.profit));
        return moduleSetting;
    }

   smithingTracker() {
        let recipes = document.getElementsByClassName('resource-container');
        for (let i = 0; i < recipes.length; i++) {
            this.processSmithingRecipe(recipes[i]);
        }
    }

    processSmithingRecipe(recipe) {
        if (recipe.getElementsByClassName("smithing-info-table").length !== 0) {
            return;
        }
        const barId = convertItemId(recipe.getElementsByClassName('resource-container-image')[0].src);
        const barIcon = recipe.getElementsByClassName('resource-container-image')[0].src;
        let resourceNodes = recipe.getElementsByClassName('resource-node-time-tooltip');
        let resourceIds = [];
        let resourceIcons = [];
        let resourceCounts = [];
        // Scrape resource info, skip level and time
        for (let i = 2; i < resourceNodes.length; i++) {
            resourceIds.push(convertItemId(resourceNodes[i].firstChild.src));
            resourceIcons.push(resourceNodes[i].firstChild.src);
            resourceCounts.push(parseInt(resourceNodes[i].lastChild.innerText));
        }
        // Delete resource nodes except level and time
        for (let i = resourceNodes.length - 1; i >= 2; i--) {
            resourceNodes[i].parentNode.remove();
        }
        // Move level and time nodes up
        let craftingImage = recipe.getElementsByClassName('resource-container-image')[0];
        let requiredResourceNode = recipe.getElementsByClassName('resource-required-resources')[0];
        craftingImage.parentNode.insertBefore(requiredResourceNode, craftingImage);
        let response = storageRequest({
            type: 'smithing-recipe',
            barId: barId,
            resourceIds: resourceIds
        });
        saveInsertAdjacentHTML(craftingImage, 'afterend', this.smithingInfoTemplate(response.craftedItemMinPrice,
                                                                                    response.craftedItemMaxPrice,
                                                                                    barIcon,
                                                                                    response.resourceItemMinPrices,
                                                                                    response.resourceItemMaxPrices,
                                                                                    resourceCounts,
                                                                                    resourceIcons));
    }

    smithingInfoTemplate(barMinPrice,
                            barMaxPrice,
                            barIcon,
                            resourceMinPrices,
                            resourceMaxPrices,
                            resourceCounts,
                            resourceIcons) {
        let resourceImgs = "";
        for (let i = 0; i < resourceIcons.length; i++) {
            resourceImgs += `
<div class="smithing-info-table-content">
    <img class="smithing-item-resource-icon" src="${resourceIcons[i]}">
    <span>${resourceCounts[i]}</span>
</div>
            `;
        }
        const resourceMinHTML = resourceMinPrices.map(price => `<span class="smithing-info-table-content">${numberWithSeparators(limitDecimalPlaces(price, 2))}</span>`).join("");
        const resourceMaxHTML = resourceMaxPrices.map(price => `<span class="smithing-info-table-content">${numberWithSeparators(limitDecimalPlaces(price, 2))}</span>`).join("");
        const [totalResourceMinPrice, totalResourceMaxPrice] = totalRecipePrice(resourceMinPrices, resourceMaxPrices, resourceCounts);
        let profitHeaderHTML = "";
        let minProfitHTML = "";
        let maxProfitHTML = "";
        // Profit includes 5% market fee
        if (this.settings.profit !== "none") {
            profitHeaderHTML = `<span class="smithing-info-table-content"><img src="/images/money_icon.png" class="smithing-item-resource-icon" alt="Profit"></span>`;
            minProfitHTML = `<span class="smithing-info-table-content">${numberWithSeparators(shortenNumber(profit(this.settings.profit, totalResourceMinPrice, barMinPrice, 2, 1)))}</span>`; // TODO
            maxProfitHTML = `<span class="smithing-info-table-content">${numberWithSeparators(shortenNumber(profit(this.settings.profit, totalResourceMaxPrice, barMaxPrice, 2, 1)))}</span>`; // Get Time
        }
        return `
<div class="smithing-info-table" style="grid-template-columns: max-content repeat(${resourceMinPrices.length + 2 + (this.settings.profit !== "none")}, 1fr)">
    <!-- header -->
    ${resourceImgs}
    <span class="smithing-info-table-content">
        &Sigma;
    </span>
    <div class="smithing-info-table-content">
        <img class="smithing-info-table-content smithing-item-resource-icon" src="${barIcon}">
    </div>
    ${profitHeaderHTML}

    <!-- min prices -->
    <span class="enchanting-info-table-content">
        Min
    </span>
    ${resourceMinHTML}
    <span class="smithing-info-table-content">
        ${numberWithSeparators(shortenNumber(totalResourceMinPrice))}
    </span>
    <span class="smithing-info-table-content">
        ${numberWithSeparators(shortenNumber(barMinPrice))}
    </span>
    ${minProfitHTML}
    
    <!-- max prices -->
    <span class="enchanting-info-table-content">
        Max
    </span>
    ${resourceMaxHTML}
    <span class="smithing-info-table-content">
        ${numberWithSeparators(shortenNumber(totalResourceMaxPrice))}
    </span>
    <span class="smithing-info-table-content">
        ${numberWithSeparators(shortenNumber(barMaxPrice))}
    </span>
    ${maxProfitHTML}
</div>
        `;
    }
}
