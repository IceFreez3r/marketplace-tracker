class CraftingTracker {
    constructor() {
        this.lastCraftedItemId = null;
        this.lastSelectedNavTab = null;

        this.observer = new MutationObserver((mutations) => {
            let selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab')[0];
            if (!selectedSkill) {
                return;
            }
            if (selectedSkill.innerText !== 'Crafting') {
                return;
            }
            this.craftingTracker();
        });
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.observer.observe(playAreaContainer, {
            attributes: true,
            attributeFilter: ['src'],
            childList: true,
            subtree: true,
        });
    }

    craftingTracker(){
        let recipeNode = document.getElementsByClassName("crafting-container")[0];
        if (!recipeNode) {
            this.lastCraftedItemId = null;
            return;
        }
        let craftedItemId = convertItemId(recipeNode.getElementsByClassName("crafting-item-icon")[0].firstChild.src);
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

        let craftedItemIcon = recipeNode.getElementsByClassName("crafting-item-icon")[0].firstChild.src;
        let craftedItemCount = 1;
        // for recipes which result in more than one item (usually baits)
        let description = recipeNode.getElementsByClassName('crafting-item-description')[0].innerText;
        let regex = /(?<=Each craft results in )\d+/.exec(description);
        if (regex !== null) {
            craftedItemCount = parseInt(regex[0]);
        }

        let resourceItemNodes = recipeNode.getElementsByClassName("crafting-item-resource");
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
        let resourceImgs = resourceItemIcons.map(icon => `
            <div class="crafting-info-table-content">
                <img class="crafting-item-resource-icon" src="${icon}">
            </div>`).join("");
        let resourceMinHTML = resourceItemMinPrices.map(price => `<span class="crafting-info-table-content">${numberWithSeparators(limitDecimalPlaces(price, 2))}</span>`).join("");
        let resourceMaxHTML = resourceItemMaxPrices.map(price => `<span class="crafting-info-table-content">${numberWithSeparators(limitDecimalPlaces(price, 2))}</span>`).join("");
        let [totalResourceMinPrice, totalResourceMaxPrice] = totalRecipePrice(resourceItemMinPrices, resourceItemMaxPrices, resourceItemCounts);

        let totalCraftedItemHeaderHTML = "";
        let totalCraftedItemMinHTML = "";
        let totalCraftedItemMaxHTML = "";
        if (craftedItemCount > 1) {
            let totalCraftedItemMinPrice = (craftedItemMinPrice !== "?") ? craftedItemMinPrice * craftedItemCount : "?";
            let totalCraftedItemMaxPrice = (craftedItemMinPrice !== "?") ? craftedItemMaxPrice * craftedItemCount : "?";
            totalCraftedItemHeaderHTML = `<span class="crafting-info-table-content text-4xl">&Sigma;</span>`;
            totalCraftedItemMinHTML = `<span class="crafting-info-table-content">${numberWithSeparators(limitDecimalPlaces(totalCraftedItemMinPrice, 2))}</span>`;
            totalCraftedItemMaxHTML = `<span class="crafting-info-table-content">${numberWithSeparators(limitDecimalPlaces(totalCraftedItemMaxPrice, 2))}</span>`;
        }
        return `
<div class="crafting-info-table" style="grid-template-columns: 150px repeat(${resourceItemMinPrices.length + 2 + (craftedItemCount > 1)}, 1fr)">
    <!-- header -->
    ${resourceImgs}
    <span class="crafting-info-table-content text-4xl">
        &Sigma;
    </span>
    <div class="crafting-info-table-content">
        <img class="crafting-info-table-content crafting-item-resource-icon" src="${craftedItemIcon}">
    </div>
    ${totalCraftedItemHeaderHTML}

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
</div>
        `;
    }
}
