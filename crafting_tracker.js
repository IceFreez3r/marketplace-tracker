function getCraftingRecipe(){
    try {
        let recipeNode = document.getElementsByClassName("crafting-container");
        if (recipeNode.length === 0) {
            lastCraftedItemId = null;
            return;
        }
        recipeNode = recipeNode[0];
        let craftedItemId = convertItemId(recipeNode.getElementsByClassName("crafting-item-icon")[0].firstChild.src);
        // prevent repeated calls
        if (craftedItemId === lastCraftedItemId) {
            // for items with multiple recipes
            let selectedNavTab = recipeNode.getElementsByClassName("selected-tab");
            if (selectedNavTab.length !== 0) {
                if (lastSelectedNavTab === recipeNode.getElementsByClassName("selected-tab")[0].innerText) {
                    return;
                }
                lastSelectedNavTab = recipeNode.getElementsByClassName("selected-tab")[0].innerText;
            } else {
                return;
            }
        }
        lastCraftedItemId = craftedItemId;

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
            resourceItemIds.push(convertItemId(resourceItemNodes[i].childNodes[1].src));
            resourceItemIcons.push(resourceItemNodes[i].childNodes[1].src);
            resourceItemCounts.push(parseInt(resourceItemNodes[i].firstChild.textContent.replace(/\./g, '')));
        }

        sendMessage({
            type: 'crafting-recipe',
            craftedItemId: craftedItemId,
            resourceItemIds: resourceItemIds
        }).then(response => {
            // remove existing container
            if (document.getElementsByClassName("crafting-info-container").length !== 0) {
                document.getElementsByClassName("crafting-info-container")[0].remove();
            }
            let craftingContainer = document.getElementsByClassName("crafting-item-container")[0];
            craftingContainer.insertAdjacentHTML('beforeend', 
                                                    craftingInfoTemplate(response.craftedItemMinPrice, 
                                                                            response.craftedItemMaxPrice,
                                                                            craftedItemCount,
                                                                            craftedItemIcon,
                                                                            response.resourceItemMinPrices, 
                                                                            response.resourceItemMaxPrices,
                                                                            resourceItemCounts,
                                                                            resourceItemIcons));
        });
    } catch (err) {
        console.log(err);
    }
}

function craftingInfoTemplate(craftedItemMinPrice,
                                craftedItemMaxPrice,
                                craftedItemCount,
                                craftedItemIcon,
                                resourceItemMinPrices,
                                resourceItemMaxPrices,
                                resourceItemCounts,
                                resourceItemIcons) {
    let resourceImgs = "";
    let resourceMinHTML = "";
    let resourceMaxHTML = "";
    for (let i = 0; i < resourceItemIcons.length; i++) {
        resourceImgs += `
            <div class="crafting-info-table-content">
                <img class="crafting-item-resource-icon" src="${resourceItemIcons[i]}">
            </div>`;
        resourceMinHTML += `<span class="crafting-info-table-content">${formatNumber(resourceItemMinPrices[i])}</span>`;
        resourceMaxHTML += `<span class="crafting-info-table-content">${formatNumber(resourceItemMaxPrices[i])}</span>`;
    }
    let totalResourceMinPrice = 0;
    let totalResourceMaxPrice = 0;
    let totalPriceUnclear = false;
    for (let i = 0; i < resourceItemCounts.length; i++) {
        if (resourceItemMinPrices[i] === "?") {
            totalPriceUnclear = true;
            continue;
        }
        totalResourceMinPrice += resourceItemMinPrices[i] * resourceItemCounts[i];
        totalResourceMaxPrice += resourceItemMaxPrices[i] * resourceItemCounts[i];
    }
    if (totalPriceUnclear) {
        totalResourceMinPrice += "*";
        totalResourceMaxPrice += "*";
    }
    
    let totalCraftedItemHeaderHTML = "";
    let totalCraftedItemMinHTML = "";
    let totalCraftedItemMaxHTML = "";
    if (craftedItemCount > 1) {
        let totalCraftedItemMinPrice = "?";
        let totalCraftedItemMaxPrice = "?";
        if (craftedItemMinPrice !== "?") {
            totalCraftedItemMinPrice = craftedItemMinPrice * craftedItemCount;
            totalCraftedItemMaxPrice = craftedItemMaxPrice * craftedItemCount;
        }
        totalCraftedItemHeaderHTML = `<span class="crafting-info-table-content text-4xl">&Sigma;</span>`;
        totalCraftedItemMinHTML = `<span class="crafting-info-table-content">${formatNumber(totalCraftedItemMinPrice)}</span>`;
        totalCraftedItemMaxHTML = `<span class="crafting-info-table-content">${formatNumber(totalCraftedItemMaxPrice)}</span>`;
    }
    return `
<div class="crafting-info-container">
    <h2 class="crafting-info-header">Crafting Tracker</h2>
    <div class="crafting-info-table" style="grid-template-columns: 150px repeat(${resourceItemMinPrices.length}, 1fr) 1fr 1fr${craftedItemCount > 1 ? " 1fr" : ""}">
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
            ${formatNumber(totalResourceMinPrice)}
        </span>
        <span class="crafting-info-table-content">
            ${formatNumber(craftedItemMinPrice)}
        </span>
        ${totalCraftedItemMinHTML}

        <!-- max -->
        <span class="crafting-info-table-content">
            Maximal Marketprice
        </span>
        ${resourceMaxHTML}
        <span class="crafting-info-table-content">
            ${formatNumber(totalResourceMaxPrice)}
        </span>
        <span class="crafting-info-table-content">
            ${formatNumber(craftedItemMaxPrice)}
        </span>
        ${totalCraftedItemMaxHTML}
    </div>
</div>
`;
}

let lastCraftedItemId = null;
let lastSelectedNavTab = null;
