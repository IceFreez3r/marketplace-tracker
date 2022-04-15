function listItemsNeedingUpdate() {
    itemListLastUpdate = sortByLastUpdate(filteredItemList());
    let entries = document.getElementsByClassName("entry");
    for (let i = 0; i < 3; i++) {
        let entry = entries[i];
        if (itemListLastUpdate.length > i) {
            entry.style.display = "table-row";
            entry.getElementsByClassName('name')[0].textContent = itemListLastUpdate[i].item;
            entry.getElementsByClassName('price')[0].textContent = formatPrice(itemListLastUpdate[i].price);
            entry.getElementsByClassName('last-update')[0].textContent = timeSince(itemListLastUpdate[i].lastUpdate);
            
            entry.getElementsByClassName('black-list')[0].onclick = function(){
                addToBlackList(itemListLastUpdate[i].item);
            }
            entry.getElementsByClassName('favorite')[0].onclick = function(){
                addToFavorites(itemListLastUpdate[i].item);
            }
        }
    }
    if (itemListLastUpdate.length == 0) {
        document.getElementById('no-items').style.display = 'block';
    }

}

function filteredItemList() {
    let tmp = {};
    for (let item in itemList) {
        if (useBlackList) {
            if (blackList.indexOf(item) == -1) {
                tmp[item] = itemList[item];
            }
        } else {
            if (whiteList.indexOf(item) != -1) {
                tmp[item] = itemList[item];
            }
        }
    }
    return tmp;
}

function addToBlackList(item) {
    if (item in blackList) {
        return;
    }
    if (item in whiteList) {
        delete whiteList[item];
    }
    blackList.push(item);
    browser.storage.local.set({
        blackList: JSON.stringify(blackList)
    });
    listItemsNeedingUpdate();
}

function addToWhiteList(item) {
    if (item in whiteList) {
        return;
    }
    if (item in blackList) {
        delete blackList[item];
    }
    whiteList.push(item);
    browser.storage.local.set({
        whiteList: JSON.stringify(whiteList)
    });
    listItemsNeedingUpdate();
}

function addToFavorites(item) {
    favorites.push(item);
    browser.storage.local.set({
        favorites: JSON.stringify(favorites)
    });
}

function timeSince(timestamp) {
    let timeSince = Math.floor(Date.now() / 1000 / 60 / 60) - timestamp;
    if (timeSince < 1) {
        return "in the last hour";
    } else if (timeSince < 24) {
        return timeSince + "h ago";
    } else {
        return Math.floor(timeSince / 24) + "d ago";
    }
}

// Add thousands separator to number
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function sortByLastUpdate(itemList){
    let tmp = {};
    for (let item in itemList) {
        if (item in blackList) {
            continue;
        }
        let lastUpdate = 0;
        for (let timestamp in itemList[item]) {
            if (timestamp > lastUpdate) {
                lastUpdate = timestamp;
            }
        }
        if (tmp[lastUpdate] == undefined) {
            tmp[lastUpdate] = {};
        }
        tmp[lastUpdate][item] = itemList[item][lastUpdate];
    }
    sortObj(tmp);
    itemListLastUpdate = [];
    for (let timestamp in tmp) {
        for (let item in tmp[timestamp]) {
            itemListLastUpdate.push({
                item: item,
                price: tmp[timestamp][item],
                lastUpdate: timestamp
            });
        }
    }
    return itemListLastUpdate;
}

function sortObj(obj) {
    return Object.keys(obj).sort().reduce(function (result, key) {
        result[key] = obj[key];
        return result;
    }, {});
}

function loadFromStorage(obj, objName) {
    return new Promise(function (resolve, reject) {
        browser.storage.local.get(objName).then(function (result) {
            if (result[objName] != undefined) {
                obj = JSON.parse(result[objName]);
            }
            resolve(obj);
        });
    });
}

function load() {
    // load storage
    Promise.all([
        loadFromStorage(itemList, 'itemList'),
        loadFromStorage(blackList, 'blackList'),
        loadFromStorage(whiteList, 'whiteList'),
        loadFromStorage(favorites, 'favorites')
    ]).then(function (values) {
        itemList = values[0];
        blackList = values[1];
        whiteList = values[2];
        favorites = values[3];
        listItemsNeedingUpdate();
    });
}

let itemList = {};
let blackList = [];
let whiteList = [];
let favorites = [];
let useBlackList = true;

let exportButton = document.getElementById('export');
exportButton.addEventListener('click', function () {
    exportButton.innerHTML = "Exporting...";
    setTimeout(function () {
        exportButton.innerHTML = "Just kidding, click me again!";
    }, 3000);
});
load();
