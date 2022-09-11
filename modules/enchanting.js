class EnchantingTracker {
    static id = "enchanting_tracker"
    static displayName = "Enchanting Tracker";
    static icon = "<img src='/images/enchanting/enchanting_logo.png' alt='Enchanting Tracker Icon'>";
    static category = "recipe";
    css = `
body .scrollcrafting-container {
    grid-template-rows: 70px 8px auto auto;
    grid-template-areas: "image title resources button"
                        "bar bar bar bar"
                        "totals totals totals totals"
                        "info info info info";
}

.enchanting-info-table {
    display: grid;
    /* Grid Layout specified by js */
    grid-gap: 5px;
    border: 2px solid hsla(0, 0%, 100%, .452);
    padding: 6px;
    margin: 6px;
    border-radius: 10px;
    grid-area: info;
    place-items: center;
}

.enchanting-info-table-content {
    display: flex;
}

.enchanting-info-table-content:first-child {
    grid-column: 2;
}

.text-2xl {
    font-size: 1.5rem;
    line-height: 2rem;
}

.text-xl {
    font-size: 1.25rem;
    line-height: 1.75rem;
}

.enchanting-item-resource-icon{
    height: 24px;
    width: 24px;
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
            if (selectedSkill.innerText !== 'Enchanting') {
                return;
            }
            this.enchantingTracker();
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
        moduleSetting.append(this.tracker.selectMenu(EnchantingTracker.id + "-profit", {
            none: "None",
            percent: "Percent",
            flat: "Flat",
            per_hour: "Per Hour",
        }, this.settings.profit));
        return moduleSetting;
    }

    enchantingTracker() {
        let recipes = document.getElementsByClassName("scrollcrafting-container");
        for (let i = 0; i < recipes.length; i++) {
            this.processEnchantment(recipes[i]);
        }
    }

    processEnchantment(recipe) {
        // Table already exists
        if (recipe.getElementsByClassName("enchanting-info-table")[0]) {
            return;
        }
        const scrollId = convertItemId(recipe.firstChild.src);
        const scrollIcon = recipe.firstChild.src;

        let standardResources = this.getStandardResources(recipe.childNodes[4].childNodes[0]);
        let dynamicResources = this.getDynamicResources(recipe.childNodes[4].childNodes[1]);
        // combine lists of objects into separate lists
        let resourceItemIds = ["scroll"].concat(dynamicResources.map(resource => resource.itemId));
        let resourceItemIcons = ["/images/enchanting/scroll.png"].concat(dynamicResources.map(resource => resource.icon));
        let resourceItemCounts = [standardResources.scrolls].concat(dynamicResources.map(resource => resource.amount));
        let response = storageRequest({
            type: "enchanting-recipe",
            scrollId: scrollId,
            resourceItemIds: resourceItemIds
        });
        saveInsertAdjacentHTML(recipe, 'beforeend', this.enchantingInfoTemplate(response.craftedItemMinPrice,
                                                                                response.craftedItemMaxPrice,
                                                                                scrollIcon,
                                                                                response.resourceItemMinPrices,
                                                                                response.resourceItemMaxPrices,
                                                                                resourceItemCounts,
                                                                                resourceItemIcons,
                                                                                standardResources.chance,
                                                                                standardResources.timePerAction));
    }

    getStandardResources(node) {
        return {
            scrolls: this.getResource(node.childNodes[3].firstChild).amount,
            chance: parseFloat(this.getResource(node.childNodes[2].firstChild).amount) / 100,
            timePerAction: parseFloat(this.getResource(node.childNodes[1].firstChild).amount)
        };
    }

    getDynamicResources(node) {
        let resources = [];
        for (let i = 0; i < node.childNodes.length; i++) {
            resources.push(this.getResource(node.childNodes[i].firstChild));
        }
        return resources;
    }

    getResource(node) {
        return {
            itemId: convertItemId(node.childNodes[0].src),
            icon: node.childNodes[0].src,
            amount: node.childNodes[1].innerText
        };
    }

    enchantingInfoTemplate(craftedItemMinPrice,
                            craftedItemMaxPrice,
                            craftedItemIcon,
                            resourceItemMinPrices,
                            resourceItemMaxPrices,
                            resourceItemCounts,
                            resourceItemIcons,
                            chance,
                            timePerAction) {
        const resourceImgs = resourceItemIcons.map(icon => `
            <div class="enchanting-info-table-content">
                <img class="enchanting-item-resource-icon" src="${icon}">
            </div>`).join("");
        const resourceMinHTML = resourceItemMinPrices.map(price => `<span class="enchanting-info-table-content">${numberWithSeparators(price)}</span>`).join("");
        const resourceMaxHTML = resourceItemMaxPrices.map(price => `<span class="enchanting-info-table-content">${numberWithSeparators(price)}</span>`).join("");
        let [totalResourceMinPrice, totalResourceMaxPrice] = totalRecipePrice(resourceItemMinPrices, resourceItemMaxPrices, resourceItemCounts);
        // Total effective price is higher if the chance is < 100%
        totalResourceMinPrice = Math.round((totalResourceMinPrice / chance));
        totalResourceMaxPrice = Math.round((totalResourceMaxPrice / chance));
        let profitHeaderHTML = "";
        let minProfitHTML = ""
        let maxProfitHTML = ""
        // Profit includes 5% market fee
        if (this.settings.profit !== "none") {
            profitHeaderHTML = `
<span class="enchanting-info-table-content">
    <img src="/images/money_icon.png" class="enchanting-item-resource-icon" alt="Profit">
    ${this.settings.profit === "per_hour" ? "<span class='text-xl'>/h</span>" : ""}
</span>`;
            minProfitHTML = `<span class="enchanting-info-table-content">${numberWithSeparators(profit(this.settings.profit, totalResourceMinPrice, craftedItemMinPrice, 2, timePerAction))}</span>`;
            maxProfitHTML = `<span class="enchanting-info-table-content">${numberWithSeparators(profit(this.settings.profit, totalResourceMaxPrice, craftedItemMaxPrice, 2, timePerAction))}</span>`;
        }
        return `
<div class="enchanting-info-table" style="grid-template-columns: 150px repeat(${resourceItemMinPrices.length + 2 + (this.settings.profit !== "none")}, 1fr)">
    <!-- header -->
    ${resourceImgs}
    <span class="enchanting-info-table-content text-2xl">
        &Sigma;
    </span>
    <div class="enchanting-info-table-content">
        <img class="enchanting-item-resource-icon" src="${craftedItemIcon}">
    </div>
    ${profitHeaderHTML}

    <!-- min prices -->
    <span class="enchanting-info-table-content">
        Minimal Marketprice
    </span>
    ${resourceMinHTML}
    <span class="enchanting-info-table-content">
        ${numberWithSeparators(totalResourceMinPrice)}
    </span>
    <span class="enchanting-info-table-content">
        ${numberWithSeparators(craftedItemMinPrice)}
    </span>
    ${minProfitHTML}

    <!-- max -->
    <span class="enchanting-info-table-content">
        Maximal Marketprice
    </span>
    ${resourceMaxHTML}
    <span class="enchanting-info-table-content">
        ${numberWithSeparators(totalResourceMaxPrice)}
    </span>
    <span class="enchanting-info-table-content">
        ${numberWithSeparators(craftedItemMaxPrice)}
    </span>
    ${maxProfitHTML}
</div>
        `;
    }
}
