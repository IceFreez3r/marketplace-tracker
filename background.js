function handleMessage(request, sender, sendResponse) {
    request.data = JSON.parse(request.data);
    switch (request.data.type) {
        case "close":
            handleClose();
            break;
        case "shop-offer":
            if (request.data.itemName) {
                handleOffer(request.data.itemId, request.data.price, request.data.itemName);
            } else {
                handleOffer(request.data.itemId, request.data.price);
            }
            if (request.data.analyze) {
                sendResponse(analyzeItem(request.data.itemId));
            }
            break;
        case "get-favorite":
            console.log("handle favorite request");
            return isFavorite(request.data.item);
        case "get-favorites-list":
            return browser.storage.local.get('favorites').then(function(result){
                if (result.favorites) {
                    return JSON.parse(result.favorites);
                } else {
                    return [];
                }
            });
        case "toggle-favorite":
            return browser.storage.local.get('favorites').then(function (result) {
                if (result.favorites) {
                    let favorites = JSON.parse(result.favorites);
                    if (favorites.indexOf(request.data.item) > -1) {
                        favorites.pop(request.data.item);
                    } else {
                        favorites.push(request.data.item);
                    }
                    browser.storage.local.set({
                        favorites: JSON.stringify(favorites)
                    });
                    return {
                        success: true,
                        isFavorite: favorites.indexOf(request.data.item) > -1
                    }
                } else {
                    let favorites = [];
                    favorites.push(request.data.item);
                    browser.storage.local.set({
                        favorites: JSON.stringify(favorites)
                    });
                    return {
                        success: true,
                        isFavorite: true
                    }
                }
            });
    }
}

function handleClose() {
    console.log("Close");
}

function handleOffer(itemId, price, itemName = undefined) {
    let timestamp = Math.floor(Date.now() / 1000 / 60 / 60);
    if (itemList[itemId] == undefined) {
        itemList[itemId] = {};
        itemList[itemId]["prices"] = {};
    }
    if (itemName != undefined && itemList[itemId]["name"] == undefined) {
        itemList[itemId]["name"] = itemName;
    }
    itemList[itemId]["prices"][timestamp] = price;
    storeItemList();
}

function isFavorite(item){
    return browser.storage.local.get('favorites').then(function (result) {
        if (result.favorites) {
            let favorites = JSON.parse(result.favorites);
            return {
                type: "is-favorite",
                isFavorite: favorites.indexOf(item) > -1
            }
        } else {
            return {
                type: "is-favorite",
                isFavorite: false
            };
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

function sortObj(obj) {
    return Object.keys(obj).sort().reduce(function (result, key) {
        result[key] = obj[key];
        return result;
    }, {});
}

function analyzeItem(itemId) {
    let minPrice = Number.MAX_SAFE_INTEGER;
    let maxPrice = 0;
    for (let timestamp in itemList[itemId]["prices"]) {
        let price = itemList[itemId]["prices"][timestamp];
        if (price > maxPrice) {
            maxPrice = price;
        }
        if (price < minPrice) {
            minPrice = price;
        }
    }
    return {
        type: "item-analysis",
        minPrice: minPrice,
        maxPrice: maxPrice
    }
}

let itemList = {};
browser.storage.local.get('itemList').then(function (result) {
    if (result.itemList) {
        itemList = JSON.parse(result.itemList);
    }
});
browser.runtime.onMessage.addListener(handleMessage);
