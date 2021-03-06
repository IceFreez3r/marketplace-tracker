function storageRequest(request) {
    // log time and request type
    // console.log(new Date().toLocaleTimeString() + ": " + request.type);
    switch (request.type) {
        case "close":
            handleClose();
            break;
        case "analyze-item":
            return analyzeItem(request.itemId);
        case "get-favorite":
            return isFavorite(request.itemId);
        case "get-favorites-list":
            return favorites;
        case "get-best-heat-item":
            return itemList[heatValue(timestamp).apiId].itemId;
        case "toggle-favorite":
            return toggleFavorite(request.itemId);
        case "market-api-data":
            handleApiData(request.data);
            break;
        case "icon-to-id-map":
            updateIdMap(request.map);
            break;
        case "get-item-values":
            return getItemValues(request.itemIds);
        case "get-last-login":
            return lastLogin;
        case "crafting-recipe":
            return handleRecipe(request.craftedItemId, request.resourceItemIds);
        case "enchanting-recipe":
            return handleRecipe(request.scrollId, request.resourceItemIds);
        case "smithing-recipe":
            return handleRecipe(request.bar, request.resourceIds);
        default:
            console.log("Unknown request: " + request);
    }
}

function handleClose() {
    storeItemList();
    localStorage.setItem('favorites', JSON.stringify(favorites));
    localStorage.setItem('lastLogin', Date.now());
}

function handleApiData(data) {
    timestamp = Math.floor(Date.now() / 1000 / 60 / 6);
    for (let i = 0; i < data.length; i++) {
        // data[i].itemID == apiId
        if (!(data[i].itemID in itemList)) {
            itemList[data[i].itemID] = {};
            itemList[data[i].itemID]["name"] = data[i].name
            itemList[data[i].itemID]["prices"] = [];
        }
        itemList[data[i].itemID]["prices"].push([timestamp, data[i].minPrice]);
    }
    itemList[2]["prices"].push([timestamp, heatValue(timestamp).heatValue]);
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
        if (heatItem.apiId in itemList) {
            // find the price tuple with the current timestamp
            let priceTuple = itemList[heatItem.apiId].prices.find(function (priceTuple) {
                return priceTuple[0] === timestamp;
            });
            if (priceTuple) {
                if (priceTuple[1] / heatItem.heat < result.heatValue) {
                    result = {
                        apiId: heatItem.apiId,
                        heatValue: priceTuple[1] / heatItem.heat,
                    };
                }
            }
        }
        return result;
    }, {apiId: null, heatValue: Infinity});
    return bestHeatItem;
}

function updateIdMap(map) {
    for (let i = 0; i < map.length; i++) {
        if (map[i].itemID in itemList) {
            // itemId -> apiId
            idMap[map[i].itemId] = map[i].apiId;
            // apiId -> itemId
            itemList[map[i].apiId].itemId = map[i].itemId;
        }
    }
    storeIdMap();
}

function isFavorite(itemId){
    return favorites.indexOf(itemId) > -1
}

function toggleFavorite(itemId) {
    let isFavorite = favorites.indexOf(itemId) > -1;
    if (isFavorite) {
        favorites.pop(itemId);
    } else {
        favorites.push(itemId);
    }
    return !isFavorite;
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
    localStorage.setItem('itemList', JSON.stringify(itemList));
}

function storeIdMap() {
    idMap = sortObj(idMap);
    localStorage.setItem('idMap', JSON.stringify(idMap));
}

function sortObj(obj) {
    return Object.keys(obj).sort().reduce(function (result, key) {
        result[key] = obj[key];
        return result;
    }, {});
}

function analyzeItem(itemId) {
    let apiId = idMap[itemId];
    // Sort the price tuples by price
    itemList[apiId]["prices"].sort(function (a, b) {
        return a[1] - b[1];
    });
    let minQuantile = Math.floor((itemList[apiId]["prices"].length - 1) * 0.05);
    let medianQuantile = Math.floor((itemList[apiId]["prices"].length - 1) * 0.5);
    let maxQuantile = Math.floor((itemList[apiId]["prices"].length - 1) * 0.95);
    return {
        minPrice: itemList[apiId]["prices"][minQuantile][1],
        medianPrice: itemList[apiId]["prices"][medianQuantile][1],
        maxPrice: itemList[apiId]["prices"][maxQuantile][1]
    }
}

function getItemValues(itemIds) {
    return {
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
        for (let i = 0; i < itemList[apiId]["prices"].length; i++) {
            if (itemList[apiId]["prices"][i][0] < twoWeeksAgo) {
                itemList[apiId]["prices"].splice(i, 1);
                i--;
            }
        }
        if (Object.keys(itemList[apiId]["prices"]).length === 0) {
            delete itemList[apiId];
        }
    }
    addHardcodedItems();
}

function addHardcodedItems() {
    if (!(1 in itemList)) {
        itemList[1] = {
            "name": "Gold",
            "itemId": "money_icon",
            "prices": [[0, 1]]
        };
    }
    if (!(2 in itemList)) {
        itemList[2] = {
            "name": "Heat",
            "itemId": "heat_icon",
            "prices": []
        };
    }
}

function minPrice(apiId) {
    if (!(apiId in itemList)) {
        return "?";
    }
    // Sort the price tuples by price
    itemList[apiId]["prices"].sort(function (a, b) {
        return a[1] - b[1];
    });
    let quantile = Math.floor((itemList[apiId]["prices"].length - 1) * 0.05);
    return itemList[apiId]["prices"][quantile][1];
}

function maxPrice(apiId) {
    if (!(apiId in itemList)) {
        return "?";
    }
    // Sort the price tuples by price
    itemList[apiId]["prices"].sort(function (a, b) {
        return a[1] - b[1];
    });
    let quantile = Math.floor((itemList[apiId]["prices"].length - 1) * 0.95);
    return itemList[apiId]["prices"][quantile][1];
}

function fetchAPI() {
    fetch("https://idlescape.com/api/market/manifest")
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (data.status === "Success") {
                storageRequest({
                    type: 'market-api-data',
                    data: data.manifest
                });
            }
        })
        .catch(function (err) {
            console.log(err);
        });
}

let result; // Helper variable for storing result of localStorage.getItem
let itemList = {};
result = localStorage.getItem('itemList');
if (result) {
    itemList = JSON.parse(result);
}
filterItemList();

let idMap = {
    "money_icon": 1,
    "heat_icon": 2,
};
result = localStorage.getItem('idMap');
if (result) {
    idMap = JSON.parse(result);
}

let favorites = [];
result = localStorage.getItem('favorites');
if (result) {
    favorites = JSON.parse(result);
}

let lastLogin = localStorage.getItem('lastLogin');
if (!lastLogin) {
    lastLogin = Date.now();
}

// stores last timestamp at which API date arrived
let timestamp = 0;
fetchAPI();
let apiFetch = setInterval(() => {
    fetchAPI();
}, 1000 * 60 * 10); // 10 minutes
