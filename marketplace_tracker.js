function getOffer(currentItemId, currentItemName) {
    if (currentItemId == undefined) {
        return;
    }
    try {
        let offers = document.getElementsByClassName('marketplace-table')
        if (offers.length == 0) {
            return;
        }
        if (offers[0].classList.contains('marketplace-my-auctions-table')) {
            return;
        }
        let offer = offers[0].getElementsByTagName('tbody')[0].getElementsByTagName('tr')[0];
        while (offer.className == 'marketplace-own-listing') {
            offer = offer.nextElementSibling;
        }
        let priceCell = offer.childNodes[3]
        priceCell.insertAdjacentHTML('beforeend', spinnerTemplate());
        let offerPrice = parseInt(priceCell.innerText.replace(/\./g, ''));
        sendMessage({
            type: 'shop-offer',
            itemId: currentItemId,
            itemName: currentItemName,
            price: offerPrice,
            analyze: true
        }).then(response => {
            if (response.type == 'item-analysis') {
                markOffers(response.maxPrice);
                priceHoverListener(response.maxPrice);
                document.getElementById('process-offer-indicator').classList.replace('loading', 'loaded');
            } else {
                console.log('Unknown response: ' + response);
            }
        });
        refreshEventListener();
        searchPrize = false;
    }
    catch (err) {
        console.log(err);
    }
}

function getSellPrice() {
    if (currentItemId == undefined) {
        return;
    }
    try {
        let sellDialog = document.getElementsByClassName('sell-item-dialog');
        if (sellDialog.length == 0) {
            return;
        }
        let price;
        let priceTick = setInterval(() => {
            price = document.getElementById('lowest-price').childNodes[1].textContent;
            if (price) {
                price = parseInt(price.replace(/\./g, ''));
                sendMessage({
                    type: 'shop-offer',
                    itemId: currentItemId,
                    price: price,
                    analyze: false
                });
                clearInterval(priceTick);
            }
        }, 50);
        refreshEventListener();
        searchPrize = false;
    } catch (err) {
        console.log(err);
    }
}

function sendMessage(message){
    message = JSON.stringify(message);
    return browser.runtime.sendMessage({
        data: message
    });
}

function currentItemEventListener(itemNode) {
    itemNode.addEventListener('click', function () {
        currentItemId = convertItemId(this.firstChild.firstChild.src);
        currentItemName = this.firstChild.firstChild.alt;
        searchPrize = true;
    });
}

// example:
// "/images/mining/stygian_ore.png" -> "Stygian Ore"
function convertItemId(itemName) {
    itemName = itemName.substring(itemName.lastIndexOf('/') + 1, itemName.lastIndexOf('.'));
    itemName = itemName.replace(/-/g, '_');
    return itemName;
}

function refreshEventListener() {
    let refresh = document.getElementById('marketplace-refresh-button');
    refresh.addEventListener('click', function () {
        searchPrize = true;
    });
}

function priceHoverListener(maxPrice) {
    for (let offer of document.getElementsByClassName('marketplace-table')[0].getElementsByTagName('tbody')[0].getElementsByTagName('tr')) {
        let amount = parseInt(offer.childNodes[2].innerText.replace(/\./g, ''))
        let priceCell = offer.childNodes[3];
        priceCell.classList.add('marketplace-offer-price');
        let price = priceCell.innerText;

        let tooltip = priceTooltipTemplate(maxPrice, price, amount);
        priceCell.insertAdjacentHTML('beforeend', tooltip);
    }
}

function priceTooltipTemplate(maxPrice, price, amount) {
    let profit = Math.floor((maxPrice * 0.95 - parseInt(price.replace(/\./g, ''))) * amount);
    let color = profit > 0 ? 'text-green' : 'text-red';
    return `
<div class="marketplace-offer-price-tooltip">
    <div style="pointer-events: none; padding: 0px 0px 8px;">
        <div
            style="pointer-events: none; position: absolute; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid white; bottom: 0px; left: 124.275px; z-index: 1000; opacity: 1;">
        </div>
        <div class="item-tooltip">
            <span>
                Marketplace Tracker
            </span>
            <span>
                <hr>
                <br>
            </span>
            <span>
                Maximum price: ${formatNumber(maxPrice)}
            </span>
            <span>
                <hr>
                <br>
            </span>
            <span>
                <span>
                    Maximal profit:
                </span>
                <span>
                    (
                </span>
                <span class="text-green">
                    ${formatNumber(maxPrice)}
                </span>
                <span>
                    * 0.95 - 
                </span>
                <span class="text-red">
                    ${formatNumber(price)}
                </span>
                <span>
                    ) * ${formatNumber(amount)} =
                </span>
                <span class="${color}">
                    ${formatNumber(profit)}
                </span>
                <br>
            </span>
        </div>
    </div>
</div>
`
}

function spinnerTemplate(size = "30px") {
    return `
<div id="process-offer-indicator" class="loading">
    <svg class="spinner" width="${size}" height="${size}" viewBox="0 0 35 35"">
        <circle class="path" fill="none" stroke-width="5" stroke-linecap="round" cx="15" cy="15" r="11"></circle>
    </svg>
    <svg class="check" width="${size}" height="${size}" viewBox="0 0 24 24">
        <path d="M4.1 12.7L9 17.6 20.3 6.3" fill="none" />
    </svg>
</div>
`
}

// Add thousands separator to number
function formatNumber(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function scanMarketList() {
    try {
        let items = document.getElementsByClassName('marketplace-content');
        if (items.length == 0) {
            return;
        }
        // Don't scan the sell container, this is done by scanSellList()
        if (items[0].firstChild.className == "marketplace-sell-container") {
            return;
        }
        items = items[0].firstChild;
        scanList(items);
    } catch (err) {
        console.log(err);
    }
}

function scanSellList() {
    try {
        let items = document.getElementsByClassName('marketplace-sell-items');
        if (items.length == 0) {
            return;
        }
        items = items[0];
        scanList(items);
    } catch (err) {
        console.log(err);
    }
}

function scanList(items) {
    if (items.classList.contains('event-listener-added')) {
        return;
    }
    items.childNodes.forEach(function (itemNode) {
        currentItemEventListener(itemNode);
    });
    items.classList.add('event-listener-added'); 
}

function markOffers(maxPrice) {
    try {
        let offers = document.getElementsByClassName('marketplace-table')
        if (offers.length == 0) {
            return;
        }
        offers = offers[0].getElementsByTagName('tbody')[0].getElementsByTagName('tr');
        for (let i = 0; i < offers.length; i++) {
            let offer = offers[i];
            let offerPrice = offer.childNodes[3].innerText
            offerPrice = parseInt(offerPrice.replace(/\./g, ''));
            if (offerPrice < maxPrice * 0.6) {
                offer.classList.add('marketplace-offer-low');
            }
            else if (offerPrice < maxPrice * 0.8) {
                offer.classList.add('marketplace-offer-medium');
            }
            else if (offerPrice < maxPrice * 0.95) {
                offer.classList.add('marketplace-offer-high');
            } else {
                return;
            }
        }
    } catch (err) {
        console.log(err);
    }
}

window.addEventListener('beforeunload', function () {
    sendMessage({
        type: 'close'
    });
});

let currentItemId;
let currentItemName;
let searchPrize = false;
let tick = setInterval(() => {
    scanMarketList();
    scanSellList();
    if (searchPrize) {
        getOffer(currentItemId, currentItemName);
        getSellPrice();
    }
}, 1000);
