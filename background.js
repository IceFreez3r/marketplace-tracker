function handleMessage(request, sender, sendResponse) {
    request.data = JSON.parse(request.data);
    // log time and request type
    console.log(new Date().toLocaleTimeString() + ": " + request.data.type);
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
        case "get-best-heat-item":
            sendResponse(itemList[heatValue(timestamp).apiId].itemId);
            break;
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
                    return Date.now();
                }
            });
        case "crafting-recipe":
            sendResponse(handleRecipe(request.data.craftedItemId, request.data.resourceItemIds));
            break;
        case "enchanting-recipe":
            sendResponse(handleRecipe(request.data.scrollId, request.data.resourceItemIds));
            break;
        default:
            console.log("Unknown request: " + request.data);
    }
}

function handleClose() {
    storeItemList();
    browser.storage.local.set({
        lastLogin: Date.now()
    });
}

function handleApiData(data) {
    timestamp = Math.floor(Date.now() / 1000 / 60 / 6);
    for (let i = 0; i < data.length; i++) {
        // data[i].itemID == apiId
        if (!(data[i].itemID in itemList)) {
            itemList[data[i].itemID] = {};
            itemList[data[i].itemID]["name"] = data[i].name
            itemList[data[i].itemID]["prices"] = {};
        }
        itemList[data[i].itemID]["prices"][timestamp] = data[i].minPrice;
    }
    // 2 is the official id for heat
    if (!(2 in itemList)) {
        itemList[2] = {};
        itemList[2]["name"] = "Heat";
        itemList[2]["prices"] = {};
    }
    itemList[2]["prices"][timestamp] = heatValue(timestamp).heatValue;
}

function heatValue(timestamp) {
    let heatItems = [
        {apiId: 50, heat: 50},      // Book
        {apiId: 112, heat: 10},     // Coal
        {apiId: 301, heat: 1},      // Branch
        {apiId: 302, heat: 5},      // Log
        {apiId: 303, heat: 10},     // Oak Log
        {apiId: 304, heat: 20},     // Willow Log
        {apiId: 305, heat: 70},     // Maple Log
        {apiId: 306, heat: 200},    // Yew Log
        {apiId: 702, heat: 100},    // Pyre Log
        {apiId: 703, heat: 200},    // Oak Pyre Log
        {apiId: 704, heat: 400},    // Willow Pyre Log
        {apiId: 705, heat: 800},    // Maple Pyre Log
        {apiId: 706, heat: 3000},   // Yew Pyre Log
        {apiId: 11030, heat: 25},   // Rotten Driftwood
        {apiId: 11031, heat: 75},   // Sturdy Driftwood
        {apiId: 11036, heat: 125},  // Mystical Driftwood
    ];
    let bestHeatItem = heatItems.reduce(function (result, heatItem) {
        if (itemList[heatItem.apiId]["prices"][timestamp] / heatItem.heat < result.heatValue) {
            result.apiId = heatItem.apiId;
            result.heatValue = itemList[heatItem.apiId]["prices"][timestamp] / heatItem.heat;
        }
        return result;
    }, {apiId: null, heatValue: Infinity});
    console.log(bestHeatItem);
    console.log(itemList[bestHeatItem.apiId].itemId);
    return bestHeatItem;
}

function updateIdMap(map) {
    for (let i = 0; i < map.length; i++) {
        // itemId -> apiId
        idMap[map[i].itemId] = map[i].apiId;
        // apiId -> itemId
        itemList[map[i].apiId].itemId = map[i].itemId;
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

function handleRecipe(craftedItemId, resourceItemIds) {
    let craftedApiId = idMap[craftedItemId];
    let craftedItemMinPrice = minPrice(craftedApiId);
    let craftedItemMaxPrice = maxPrice(craftedApiId);
    let resourceItemPrices = getItemValues(resourceItemIds);
    return {
        type: "recipe-analysis",
        craftedItemMinPrice: craftedItemMinPrice,
        craftedItemMaxPrice: craftedItemMaxPrice,
        resourceItemMinPrices: resourceItemPrices.itemMinPrices,
        resourceItemMaxPrices: resourceItemPrices.itemMaxPrices,
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
    return {
        type: "item-analysis",
        minPrice: minPrice(idMap[itemId]),
        maxPrice: maxPrice(idMap[itemId]),
    }
}

function getItemValues(itemIds) {
    return {
        type: "item-values",
        itemMinPrices: itemIds.map(function (itemId) {
            return minPrice(idMap[itemId]);
        }),
        itemMaxPrices: itemIds.map(function (itemId) {
            return maxPrice(idMap[itemId]);
        }),
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
    if (!(apiId in itemList)) {
        return "?";
    }
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
    if (!(apiId in itemList)) {
        return "?";
    }
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
    "money_icon": 1,
    "heat_icon": 2,
};
browser.storage.local.get('idMap').then(function (result) {
    if (result.idMap) {
        idMap = JSON.parse(result.idMap);
    }
});
// stores last timestamp at which API date arrived
let timestamp = 0;
browser.runtime.onMessage.addListener(handleMessage);
