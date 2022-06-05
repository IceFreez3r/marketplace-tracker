function enchantingTracker() {
    let recipes = document.getElementsByClassName("scrollcrafting-container");
    for (let i = 0; i < recipes.length; i++) {
        processEnchantment(recipes[i]);
    }
}

function processEnchantment(recipe) {
    if (recipe.getElementsByClassName("enchanting-info-table").length !== 0) {
        return;
    }
    let scrollId = convertItemId(recipe.firstChild.src);
    let scrollIcon = recipe.firstChild.src;

    let standardResources = getStandardResources(recipe.childNodes[4].childNodes[0]);
    let dynamicResources = getDynamicResources(recipe.childNodes[4].childNodes[1]);
    // combine lists of objects into separate lists
    let resourceItemIds = ["scroll"].concat(dynamicResources.map(resource => resource.itemId));
    let resourceItemIcons = ["/images/enchanting/scroll.png"].concat(dynamicResources.map(resource => resource.icon));
    let resourceItemCounts = [standardResources.scrolls].concat(dynamicResources.map(resource => resource.amount));
    sendMessage({
        type: "enchanting-recipe",
        scrollId: scrollId,
        resourceItemIds: resourceItemIds
    }).then(response => {
        recipe.insertAdjacentHTML('beforeend', 
            enchantingInfoTemplate(response.craftedItemMinPrice,
                                   response.craftedItemMaxPrice,
                                   scrollIcon,
                                   response.resourceItemMinPrices,
                                   response.resourceItemMaxPrices,
                                   resourceItemCounts,
                                   resourceItemIcons,
                                   standardResources.chance));
    });
}

function getStandardResources(standardResourceNode) {
    let scrolls = getResource(standardResourceNode.childNodes[3].firstChild).amount;
    let chance = parseFloat(getResource(standardResourceNode.childNodes[2].firstChild).amount) / 100;
    return {
        scrolls: scrolls,
        chance: chance
    };
}

function getDynamicResources(dynamicResourceNode) {
    let resources = [];
    for (let i = 0; i < dynamicResourceNode.childNodes.length; i++) {
        resources.push(getResource(dynamicResourceNode.childNodes[i].firstChild));
    }
    return resources;
}

function getResource(resourceNode) {
    let resource = {
        itemId: convertItemId(resourceNode.childNodes[0].src),
        icon: resourceNode.childNodes[0].src,
        amount: resourceNode.childNodes[1].innerText
    }
    return resource;
}

function enchantingInfoTemplate(craftedItemMinPrice,
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
    let resourceMinHTML = resourceItemMinPrices.map(price => `<span class="enchanting-info-table-content">${formatNumber(price)}</span>`).join("");
    let resourceMaxHTML = resourceItemMaxPrices.map(price => `<span class="enchanting-info-table-content">${formatNumber(price)}</span>`).join("");
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
        ${formatNumber(totalResourceMinPrice)}
    </span>
    <span class="crafting-info-table-content">
        ${formatNumber(craftedItemMinPrice)}
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
        ${formatNumber(totalResourceMaxPrice)}
    </span>
    <span class="enchanting-info-table-content">
        ${formatNumber(craftedItemMaxPrice)}
    </span>
    <span class="enchanting-info-table-content">
        ${prozentualMaxProfit}
    </span>
</div>
`;
}
