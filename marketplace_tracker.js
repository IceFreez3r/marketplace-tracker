function getOffer(currentItem) {
    if (currentItem == undefined) {
        return;
    }
    try {
        let offers = document.getElementsByClassName('marketplace-table')
        if (offers.length == 0) {
            return;
        }
        document.getElementById("marketplace-refresh-button").insertAdjacentHTML("afterend", favoriteTemplate());
        document.getElementById("marketplace-favorite-button").addEventListener('click', function(){
            
        });
        let offer = offers[0].getElementsByTagName('tbody')[0].getElementsByTagName('tr')[0];
        while (offer.className == 'marketplace-own-listing') {
            offer = offer.nextElementSibling;
        }
        let offerPrice = offer.childNodes[3].innerText
        offerPrice = parseInt(offerPrice.replace(/\./g, ''));
        sendMessage({
            type: 'shop-offer',
            item: currentItem,
            price: offerPrice
        }).then(response => {
            if (response.type == 'item-analysis') {
                markOffers(response.maxPrice);
                priceHoverListener(response.maxPrice);
            } else {
                console.log('Unknown response: ' + response);
            }
        });
        refreshEventListener();
        scanOffer = false;
    }
    catch (err) {
        console.log('Error: ' + err);
    }
}

function sendMessage(message){
    message = JSON.stringify(message);
    return browser.runtime.sendMessage({
        data: message
    });
}

function marketplaceEntryEventListener(item) {
    item.addEventListener('click', function () {
        currentItem = this.firstChild.firstChild.alt;
        scanOffer = true;
    });
}

function refreshEventListener() {
    let refresh = document.getElementById('marketplace-refresh-button');
    refresh.addEventListener('click', function () {
        scanOffer = true;
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

function favoriteTemplate(){
    return `<button id="marketplace-favorite-button" class="marketplace-refresh-button"> Favorite</button>`
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
        let item = items[0].firstChild.firstChild;
        marketplaceEntryEventListener(item);
        while (item.nextElementSibling != null) {
            item = item.nextElementSibling;
            marketplaceEntryEventListener(item);
        }
    } catch (err) {
        console.log('Error: ' + err);
    }
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
        console.log('Error: ' + err);
    }
}

window.addEventListener('beforeunload', function () {
    sendMessage({
        type: 'close'
    });
});

let currentItem;
let scanOffer = false;
let tick = setInterval(() => {
    scanMarketList();
    if (scanOffer) {
        getOffer(currentItem);
    }
}, 1000);
