function scanOfferList() {
    try {
        let offers = document.getElementsByClassName('marketplace-table')
        if (offers.length == 0) {
            return;
        }
        // Ignore offer table on sell page
        if (offers[0].classList.contains('marketplace-my-auctions-table')) {
            return;
        }
        offers = offers[0].getElementsByTagName('tbody')[0].getElementsByTagName('tr');
        let itemId = convertItemId(offers[0].childNodes[1].firstChild.src);
        favoriteButton(itemId);
        sendMessage({
            type: 'analyze-item',
            itemId: itemId
        }).then(response => {
            markOffers(offers, response.maxPrice);
            priceHoverListener(offers, response.maxPrice);
        });
    }
    catch (err) {
        console.log(err);
    }
}

function favoriteButton(itemId) {
    if (document.getElementById("marketplace-favorite-button")) {
        return; 
    }
    sendMessage({
        type: 'get-favorite',
        itemId: itemId
    }).then(response => {
        document.getElementById("marketplace-refresh-button").insertAdjacentHTML("afterend", favoriteTemplate(response.isFavorite));
        let favoriteButton = document.getElementById("marketplace-favorite-button")
        favoriteButton.addEventListener('click', function(){
            sendMessage({
                type: 'toggle-favorite',
                itemId: itemId
            }).then(response => {
                favoriteButton.classList.replace(response.isFavorite ? 'fill-none' : 'fill-yellow', response.isFavorite ? 'fill-yellow' : 'fill-none');
                favoriteButton.getElementsByTagName('span')[0].classList.toggle('invisible');
            });
        });
    });
}

function priceHoverListener(offers, maxPrice) {
    for (let offer of offers) {
        let priceCell = offer.childNodes[3];
        if (priceCell.getElementsByClassName('marketplace-offer-price-tooltip').length > 0) {
            continue;
        }

        let amount = parseInt(offer.childNodes[2].innerText.replace(/\./g, ''));
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
`;
}

function highlightFavorite (itemNode, favorites) {
    let itemId = convertItemId(itemNode.firstChild.firstChild.src);
    if (favorites.indexOf(itemId) > -1) {
        itemNode.firstChild.classList.add("highlight");
    }
}

function highlightFavorites(items) {
    sendMessage({
        type: 'get-favorites-list',
    }).then(favoritesList => {
        items.childNodes.forEach(function (itemNode) {
            highlightFavorite(itemNode, favoritesList);
         });
    });
}

function scanMarketplaceLists() {
    try {
        let items = document.getElementsByClassName('marketplace-sell-items');
        if (items.length == 0) {
            items = document.getElementsByClassName('marketplace-content');
            if (items.length == 0) {
                return;
            } else {
                items = items[0].firstChild;
                if (createMap) {
                    iconToIdMap(items);
                }
            }
        } else {
            items = items[0];
        }
        highlightFavorites(items);
    } catch (err) {
        console.log(err);
    }
}

function iconToIdMap(items) {
    let map = [];
    for (let i = 0; i < items.childNodes.length; i++) {
        let item = items.childNodes[i];
        let itemId = convertItemId(item.firstChild.firstChild.src);
        // this will give something like 'marketplaceBuyItemTooltip50'
        let apiIdString = item.firstChild.dataset['for'];
        // so we extract the id from the string
        let apiId = apiIdString.substring(apiIdString.indexOf('marketplaceBuyItemTooltip') + 'marketplaceBuyItemTooltip'.length, apiIdString.length);
        map.push({
            itemId: itemId,
            apiId: apiId
        });
    }
    sendMessage({
        type: 'icon-to-id-map',
        map: map
    });
    createMap = false;
}

function markOffers(offers, maxPrice) {
    for (let i = 0; i < offers.length; i++) {
        let offer = offers[i];
        offer.classList.remove('marketplace-offer-low', 'marketplace-offer-medium', 'marketplace-offer-high');
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
        }
    }
}

function fetchAPI() {
    fetch("https://idlescape.com/api/market/manifest")
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (data.status === "Success") {
                sendMessage({
                    type: 'market-api-data',
                    data: data.manifest
                });
            }
        })
        .catch(function (err) {
            console.log(err);
        });
}

window.addEventListener('beforeunload', function () {
    sendMessage({
        type: 'close'
    });
});

let createMap = true;
let tick = setInterval(() => {
    scanMarketplaceLists();
    scanOfferList();
    offlineTracker();
    getCraftingRecipe();
    enchantingTracker();
}, 1000);

fetchAPI();
let apiFetch = setInterval(() => {
    fetchAPI();
}, 1000 * 60 * 10); // 10 minutes
