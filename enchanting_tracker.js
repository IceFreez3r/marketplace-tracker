class EnchantingTracker {
    constructor() {
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
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.observer.observe(playAreaContainer, {
            childList: true,
            subtree: true
        });
    }

    enchantingTracker() {
        let recipes = document.getElementsByClassName("scrollcrafting-container");
        for (let i = 0; i < recipes.length; i++) {
            this.processEnchantment(recipes[i]);
        }
    }

    processEnchantment(recipe) {
        if (recipe.getElementsByClassName("enchanting-info-table").length !== 0) {
            return;
        }
        let scrollId = convertItemId(recipe.firstChild.src);
        let scrollIcon = recipe.firstChild.src;

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
                                                                                standardResources.chance));
    }

    getStandardResources(node) {
        return {
            scrolls: this.getResource(node.childNodes[3].firstChild).amount,
            chance: parseFloat(this.getResource(node.childNodes[2].firstChild).amount) / 100
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
        return resource = {
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
                            chance) {
        let resourceImgs = resourceItemIcons.map(icon => `
            <div class="enchanting-info-table-content">
                <img class="icon24" src="${icon}">
            </div>`).join("");
        let resourceMinHTML = resourceItemMinPrices.map(price => `<span class="enchanting-info-table-content">${numberWithSeparators(price)}</span>`).join("");
        let resourceMaxHTML = resourceItemMaxPrices.map(price => `<span class="enchanting-info-table-content">${numberWithSeparators(price)}</span>`).join("");
        let [totalResourceMinPrice, totalResourceMaxPrice] = totalRecipePrice(resourceItemMinPrices, resourceItemMaxPrices, resourceItemCounts);
        // Total effective price is higher if the chance is < 100%
        totalResourceMinPrice = Math.round((totalResourceMinPrice / chance));
        totalResourceMaxPrice = Math.round((totalResourceMaxPrice / chance));
        // Profit includes 5% market fee
        let prozentualMinProfit = profitPercent(totalResourceMinPrice, craftedItemMinPrice);
        let prozentualMaxProfit = profitPercent(totalResourceMaxPrice, craftedItemMaxPrice);
        return `
<div class="enchanting-info-table" style="grid-template-columns: 150px repeat(${resourceItemMinPrices.length}, 1fr) 1fr 1fr 1fr">
    <!-- header -->
    ${resourceImgs}
    <span class="enchanting-info-table-content text-2xl">
        &Sigma;
    </span>
    <div class="enchanting-info-table-content">
        <img class="enchanting-item-resource-icon" src="${craftedItemIcon}">
    </div>
    <span class="enchanting-info-table-content text-xl">
        Profit
    </span>

    <!-- min prices -->
    <span class="enchanting-info-table-content">
        Minimal Marketprice
    </span>
    ${resourceMinHTML}
    <span class="enchanting-info-table-content">
        ${numberWithSeparators(totalResourceMinPrice)}
    </span>
    <span class="crafting-info-table-content">
        ${numberWithSeparators(craftedItemMinPrice)}
    </span>
    <span class="crafting-info-table-content">
        ${prozentualMinProfit}
    </span>

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
    <span class="enchanting-info-table-content">
        ${prozentualMaxProfit}
    </span>
</div>
        `;
    }
}
