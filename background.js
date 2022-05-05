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
    }
}

function handleClose() {
    console.log("Close");
    storeItemList();
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
}

let itemList = {};
browser.storage.local.get('itemList').then(function (result) {
    if (result.itemList) {
        itemList = JSON.parse(result.itemList);
    }
    filterItemList();
});
let idMap = {};
browser.storage.local.get('idMap').then(function (result) {
    if (result.idMap) {
        idMap = JSON.parse(result.idMap);
    }
});
browser.runtime.onMessage.addListener(handleMessage);
