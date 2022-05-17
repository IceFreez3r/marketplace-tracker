function handleMessage(request, sender, sendResponse) {
    request.data = JSON.parse(request.data);
    switch (request.data.type) {
        case "close":
            handleClose();
            break;
        case "analyze-item":
            sendResponse(analyzeItem(request.data.itemId));
            break;
        case "get-favorite":
            return isFavorite(request.data.itemId);
        case "get-favorites-list":
            return browser.storage.local.get('favorites').then(function(result){
                if (result.favorites) {
                    return JSON.parse(result.favorites);
                } else {
                    return [];
                }
            });
        case "toggle-favorite":
            return toggleFavorite(request.data.itemId);
        case "market-api-data":
            handleApiData(request.data.data);
            break;
        case "icon-to-id-map":
            updateIdMap(request.data.map);
            break;
        case "get-item-values":
            sendResponse(getItemValues(request.data.itemIds));
            break;
        case "get-last-login":
            return browser.storage.local.get('lastLogin').then(function(result){
                if (result.lastLogin) {
                    return result.lastLogin;
                } else {
                    return null;
                }
            });
        case "crafting-recipe":
            sendResponse(handleCraftingRecipe(request.data.craftedItemId, request.data.resourceItemIds));
            break;
        default:
            console.log("Unknown request: " + request.data);
    }
}

function handleClose() {
    console.log("Close");
    storeItemList();
    browser.storage.local.set({
        lastLogin: Date.now()
    });
}

function handleApiData(data) {
    let timestamp = Math.floor(Date.now() / 1000 / 60 / 6);
    for (let i = 0; i < data.length; i++) {
        // data[i].itemID == apiId
        if (!(data[i].itemID in itemList)) {
            itemList[data[i].itemID] = {};
            itemList[data[i].itemID]["name"] = data[i].name
            itemList[data[i].itemID]["prices"] = {};
        }
        itemList[data[i].itemID]["prices"][timestamp] = data[i].minPrice;
    }
}

function updateIdMap(map) {
    for (let i = 0; i < map.length; i++) {
        idMap[map[i].itemId] = map[i].apiId;
    }
    storeIdMap();
}

function isFavorite(itemId){
    return browser.storage.local.get('favorites').then(function (result) {
        if (result.favorites) {
            let favorites = JSON.parse(result.favorites);
            return {
                type: "is-favorite",
                isFavorite: favorites.indexOf(itemId) > -1
            }
        } else {
            return {
                type: "is-favorite",
                isFavorite: false
            };
        }
    });
}

function toggleFavorite(itemId) {
    return browser.storage.local.get('favorites').then(function (result) {
        let favorites = [];
        if (result.favorites) {
            favorites = JSON.parse(result.favorites);
        }
        if (favorites.indexOf(itemId) > -1) {
            favorites.pop(itemId);
        } else {
            favorites.push(itemId);
        }
        browser.storage.local.set({
            favorites: JSON.stringify(favorites)
        });
        return {
            success: true,
            isFavorite: favorites.indexOf(itemId) > -1
        }
    });
}

function handleCraftingRecipe(craftedItemId, resourceItemIds) {
    console.log("Crafting recipe: " + craftedItemId + " " + resourceItemIds);
    let craftedApiId = idMap[craftedItemId];
    let resourceApiIds = [];
    for (let i = 0; i < resourceItemIds.length; i++) {
        resourceApiIds.push(idMap[resourceItemIds[i]]);
    }

    let craftedItemMinPrice = "?";
    let craftedItemMaxPrice = "?";
    if (craftedApiId in itemList) {
        craftedItemMinPrice = minPrice(craftedApiId);
        craftedItemMaxPrice = maxPrice(craftedApiId);
    }
    // sum of all resource prices
    let resourceItemMinPrices = [];
    let resourceItemMaxPrices = [];
    for (let i = 0; i < resourceApiIds.length; i++) {
        if (resourceApiIds[i] in itemList) {
            resourceItemMinPrices.push(minPrice(resourceApiIds[i]));
            resourceItemMaxPrices.push(maxPrice(resourceApiIds[i]));
        } else {
            resourceItemMinPrices.push("?");
            resourceItemMaxPrices.push("?");
        }
    }
    return {
        type: "crafting-recipe-analysis",
        craftedItemMinPrice: craftedItemMinPrice,
        craftedItemMaxPrice: craftedItemMaxPrice,
        resourceItemMinPrices: resourceItemMinPrices,
        resourceItemMaxPrices: resourceItemMaxPrices
    };
}    

function storeItemList() {
    itemList = sortObj(itemList);
    console.log(itemList);
    browser.storage.local.set({
        itemList: JSON.stringify(itemList)
    });
}

function storeIdMap() {
    idMap = sortObj(idMap);
    console.log(idMap);
    browser.storage.local.set({
        idMap: JSON.stringify(idMap)
    });
}

function sortObj(obj) {
    return Object.keys(obj).sort().reduce(function (result, key) {
        result[key] = obj[key];
        return result;
    }, {});
}

function analyzeItem(itemId) {
    apiId = idMap[itemId];
    if (!(apiId in itemList)) {
        return {
            type: "analyze-item",
            minPrice: "?",
            maxPrice: "?",
        };
    }
    let minPrice = Number.MAX_SAFE_INTEGER;
    let maxPrice = 0;
    for (let timestamp in itemList[apiId]["prices"]) {
        let price = itemList[apiId]["prices"][timestamp];
        if (price > maxPrice) {
            maxPrice = price;
        }
        if (price < minPrice) {
            minPrice = price;
        }
    }
    console.log("Analyzed item " + itemId + ": " + minPrice + " - " + maxPrice);
    return {
        type: "item-analysis",
        minPrice: minPrice,
        maxPrice: maxPrice
    }
}

function getItemValues(itemIds) {
    console.log(itemIds);
    let itemMinPrices = [];
    let itemMaxPrices = [];
    for (let i = 0; i < itemIds.length; i++) {
        let apiId = idMap[itemIds[i]];
        if (!(apiId in itemList)) {
            itemMinPrices.push("?");
            itemMaxPrices.push("?");
            continue;
        }
        let minPrice = Number.MAX_SAFE_INTEGER;
        let maxPrice = 0;
        for (let timestamp in itemList[apiId]["prices"]) {
            let price = itemList[apiId]["prices"][timestamp];
            if (price > maxPrice) {
                maxPrice = price;
            }
            if (price < minPrice) {
                minPrice = price;
            }
        }
        itemMinPrices.push(minPrice);
        itemMaxPrices.push(maxPrice);
    }
    return {
        type: "item-values",
        itemMinPrices: itemMinPrices,
        itemMaxPrices: itemMaxPrices
    }
}

function filterItemList() {
    let twoWeeksAgo = Math.floor(Date.now() / 1000 / 60 / 6) - (14 * 24 * 6);
    for (let apiId in itemList) {
        for (let timestamp in itemList[apiId]["prices"]) {
            if (timestamp < twoWeeksAgo) {
                delete itemList[apiId]["prices"][timestamp];
            }
        }
        if (Object.keys(itemList[apiId]["prices"]).length === 0) {
            delete itemList[apiId];
        }
    }
    addHardcodedItems();
}

function addHardcodedItems() {
    itemList[1] = {
            "name": "Gold",
            "prices": {
                0: 1
            }
        };
}

function minPrice(apiId) {
    let minPrice = Infinity;
    for (let timestamp in itemList[apiId]["prices"]) {
        let price = itemList[apiId]["prices"][timestamp];
        if (price < minPrice) {
            minPrice = price;
        }
    }
    return minPrice;
}

function maxPrice(apiId) {
    let maxPrice = 0;
    for (let timestamp in itemList[apiId]["prices"]) {
        let price = itemList[apiId]["prices"][timestamp];
        if (price > maxPrice) {
            maxPrice = price;
        }
    }
    return maxPrice;
}

let itemList = {};
browser.storage.local.get('itemList').then(function (result) {
    if (result.itemList) {
        itemList = JSON.parse(result.itemList);
    }
    filterItemList();
});
let idMap = {
    "money_icon": 1
};
browser.storage.local.get('idMap').then(function (result) {
    if (result.idMap) {
        idMap = JSON.parse(result.idMap);
    }
});
browser.runtime.onMessage.addListener(handleMessage);
