function listItemsNeedingUpdate() {
    let itemListLastUpdate = sortByLastUpdate(filteredItemList());
    let table_values = document.getElementById("update-table-values");
    removeAllChildren(table_values);
    if (itemListLastUpdate.length == 0) {
        document.getElementById('no-items').style.display = 'block';
    } else {
        document.getElementById('no-items').style.display = 'none';
        for (let i = 0; i < 5; i++) {
            if (itemListLastUpdate.length > i) {
                let entryHTML = entryTemplate(itemListLastUpdate[i].itemName, 
                                                formatPrice(itemListLastUpdate[i].price), 
                                                timeSince(itemListLastUpdate[i].lastUpdate));
                table_values.insertAdjacentHTML('beforeend', entryHTML);
                let entry = table_values.lastChild;
                entry.getElementsByClassName('favorite')[0].onclick = function() {
                    toggleFavorite(itemListLastUpdate[i].item);
                }
                if (useBlackList) {
                    entry.getElementsByClassName('black-list')[0].onclick = function() {
                        addToBlackList(itemListLastUpdate[i].item);
                    }
                } else {
                    entry.getElementsByClassName('white-list')[0].onclick = function() {
                        removeFromWhiteList(itemListLastUpdate[i].item);
                    }
                }
            }
        }
    }
}

function filteredItemList() {
    let tmp = {};
    for (let itemId in itemList) {
        if (itemList[itemId]["name"] != undefined) {
            if (useBlackList) {
                if (blackList.indexOf(itemId) == -1) {
                    tmp[itemId] = itemList[itemId];
                }
            } else {
                if (whiteList.indexOf(itemId) != -1) {
                    tmp[itemId] = itemList[itemId];
                }
            }
        }
    }
    return tmp;
}

function addToBlackList(itemId) {
    if (blackList.indexOf(itemId) != -1) {
        return;
    }
    if (whiteList.indexOf(itemId) != -1) {
        whiteList.splice(whiteList.indexOf(itemId), 1);
        browser.storage.local.set({
            whiteList: JSON.stringify(whiteList)
        });
    }
    blackList.push(itemId);
    browser.storage.local.set({
        blackList: JSON.stringify(blackList)
    });
    listItemsNeedingUpdate();
}

function removeFromWhiteList(itemId) {
    if (whiteList.indexOf(itemId) != -1) {
        whiteList.splice(whiteList.indexOf(itemId), 1);
        browser.storage.local.set({
            whiteList: JSON.stringify(whiteList)
        });
        listItemsNeedingUpdate();
    }
}

function toggleFavorite(itemId) {
    if (favorites.indexOf(itemId) == -1) {
        favorites.push(itemId);
    } else {
        favorites.splice(favorites.indexOf(itemId), 1);
    }
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
    for (let itemId in itemList) {
        let lastUpdate = 0;
        for (let timestamp in itemList[itemId]["prices"]) {
            if (timestamp > lastUpdate) {
                lastUpdate = timestamp;
            }
        }
        if (tmp[lastUpdate] == undefined) {
            tmp[lastUpdate] = {};
        }
        tmp[lastUpdate][itemId] = {};
        tmp[lastUpdate][itemId]["name"] = itemList[itemId]["name"];
        tmp[lastUpdate][itemId]["prices"] = itemList[itemId]["prices"][lastUpdate];
    }
    sortObj(tmp);
    itemListLastUpdate = [];
    for (let timestamp in tmp) {
        for (let itemId in tmp[timestamp]) {
            itemListLastUpdate.push({
                itemId: itemId,
                itemName: tmp[timestamp][itemId]["name"],
                price: tmp[timestamp][itemId]["prices"],
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

async function loadData() {
    // load storage
    const values = await Promise.all([
        loadFromStorage(itemList, 'itemList'),
        loadFromStorage(blackList, 'blackList'),
        loadFromStorage(whiteList, 'whiteList'),
        loadFromStorage(favorites, 'favorites'),
        loadFromStorage(useBlackList, 'useBlackList')
    ]);
    itemList = values[0];
    blackList = values[1];
    whiteList = values[2];
    favorites = values[3];
    useBlackList = values[4];
}

function exportButton() {
    let exportButton = document.getElementById('export');
    exportButton.addEventListener('click', function () {
        exportButton.innerHTML = "Exporting...";
        setTimeout(function () {
            exportButton.innerHTML = "Just kidding, click me again!";
        }, 3000);
    });
}

function toggle() {
    const toggle = document.getElementsByClassName('toggle-input')[0];
    toggle.checked = useBlackList;

    toggle.addEventListener('change', function () {
        useBlackList = toggle.checked;
        browser.storage.local.set({
            useBlackList: useBlackList
        });
        listItemsNeedingUpdate();
    });
}

function entryTemplate(item, price, lastUpdate) {
    let listColor = useBlackList ? 'black' : 'white';
    return `
<tr class="entry">
    <td class="name">${item}</td>
    <td class="price">${price}</td>
    <td class="last-update">${lastUpdate}</td>
    <td class="actions">
        <img class="action icon favorite" src="../icons/favorite.png" alt="favorite" />
        <img class="action icon ${listColor}-list" src="../icons/${listColor}List.png" alt="${listColor}list" />
    </td>
</tr>`;
}

function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.lastChild);
    }
}

let itemList = {};
let blackList = [];
let whiteList = [];
let favorites = [];
let useBlackList = true;

exportButton();
loadData().then(function () {
    whiteList = ["Black Opal"]; // For testing purposes
    listItemsNeedingUpdate();
    toggle();
});
