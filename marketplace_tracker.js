function getOffer(currentItem) {
    if (currentItem == undefined) {
        return;
    }
    try {
        let offers = document.getElementsByClassName('marketplace-table')
        if (offers.length == 0) {
            return;
        }
        favoriteButton(currentItem);
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

function favoriteButton(currentItem){
    if(document.getElementById("marketplace-refresh-button").nextSibling==document.getElementById("marketplace-item-list-searchbar")){
        //above: refresh doesn't add buttons
        sendMessage({
            type: 'get-favorite',
            item: currentItem
        }).then(response => {
            console.log(response);
            document.getElementById("marketplace-refresh-button").insertAdjacentHTML("afterend", favoriteTemplate(response.isFavorite));
            let favoriteButton = document.getElementById("marketplace-favorite-button")
            favoriteButton.addEventListener('click', function(){
                sendMessage({
                    type: 'toggle-favorite',
                    item: currentItem
                }).then(response => {
                    console.log(response.success);
                    console.log(response.isFavorite);
                    favoriteButton.classList.replace(response.isFavorite ? 'fill-none' : 'fill-yellow', response.isFavorite ? 'fill-yellow' : 'fill-none');
                    favoriteButton.getElementsByTagName('span')[0].classList.toggle('invisible');
                });
            });
        });
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

function favoriteTemplate(isFavorite){
    let fill = isFavorite ? 'fill-yellow' : 'fill-none';
    let invisible = isFavorite ? 'invisible' : '';
    return `
<button id="marketplace-favorite-button" class="marketplace-refresh-button ${fill}"> 
    <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" stroke="yellow" stroke-width="30px" x="0px" y="0px" width="24px" heigth="24px" viewBox="-15 -10 366 366" style="enable-background:new 0 0 329.942 329.942;" xml:space="preserve">
        <path id="XMLID_16_" d="M329.208,126.666c-1.765-5.431-6.459-9.389-12.109-10.209l-95.822-13.922l-42.854-86.837  c-2.527-5.12-7.742-8.362-13.451-8.362c-5.71,0-10.925,3.242-13.451,8.362l-42.851,86.836l-95.825,13.922  c-5.65,0.821-10.345,4.779-12.109,10.209c-1.764,5.431-0.293,11.392,3.796,15.377l69.339,67.582L57.496,305.07  c-0.965,5.628,1.348,11.315,5.967,14.671c2.613,1.899,5.708,2.865,8.818,2.865c2.387,0,4.784-0.569,6.979-1.723l85.711-45.059  l85.71,45.059c2.208,1.161,4.626,1.714,7.021,1.723c8.275-0.012,14.979-6.723,14.979-15c0-1.152-0.13-2.275-0.376-3.352  l-16.233-94.629l69.339-67.583C329.501,138.057,330.972,132.096,329.208,126.666z">
    </svg>
    <span class=${invisible}> not</span> 
    FAV
</button>`
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

function getFavoriteList () {
    return sendMessage({
        type: 'get-favorites-list',
    });
}

function highlightFavorite (itemNode, favorites) {
    let item = itemNode.firstChild.firstChild.alt;
    if (favorites.indexOf(item) > -1) {
        itemNode.firstChild.classList.add("highlight");
    }
}

function scanMarketList() {
    try {
        let items = document.getElementsByClassName('marketplace-content');
        if (items.length == 0) {
            return;
        }
        getFavoriteList().then(favoritesList => {
            let item = items[0].firstChild.firstChild;
            marketplaceEntryEventListener(item);
            highlightFavorite(item, favoritesList);
            while (item.nextElementSibling != null) {
                item = item.nextElementSibling;
                marketplaceEntryEventListener(item);
                highlightFavorite(item, favoritesList);
            }
        });
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
