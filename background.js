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
