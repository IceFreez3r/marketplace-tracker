function handleMessage(request, sender, sendResponse) {
    request.data = JSON.parse(request.data);
    if (request.data.type == "close") {
        handleClose();
    }
    if (request.data.type == "shop-offer") {
        handleOffer(request.data.item, request.data.price);
        sendResponse(analyzeItem(request.data.item));
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
