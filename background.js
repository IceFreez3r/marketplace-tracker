function handleMessage(request, sender, sendResponse) {
    request.data = JSON.parse(request.data);
    if (request.data.type == "close") {
        handleClose();
    }
    else if(request.data.type == "shop-offer") {
        handleOffer(request.data.item, request.data.price);
        sendResponse(analyzeItem(request.data.item));
    }
    else if (request.data.type == "get-favorite") {
        console.log("handle favorite request");
        return isFavorite(request.data.item);
    }
    else if (request.data.type == "get-favorites-list") {
        return browser.storage.local.get('favorites').then(function(result){
            if (result.favorites) {
                return JSON.parse(result.favorites);
            } else {
                return [];
            }
        });
    }
    else if (request.data.type == "toggle-favorite") {
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
    else {
        console.log("alles schaise");
    }
}

function handleClose() {
    console.log("Close");
}

function handleOffer(item, price) {
    let timestamp = Math.floor(Date.now() / 1000 / 60 / 60);
    if (itemList[item] == undefined) {
        itemList[item] = {};
    }
    itemList[item][timestamp] = price;
    console.log(itemList);
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

function analyzeItem(item) {
    let minPrice = Number.MAX_SAFE_INTEGER;
    let maxPrice = 0;
    for (let timestamp in itemList[item]) {
        let price = itemList[item][timestamp];
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
