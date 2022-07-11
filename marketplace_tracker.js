class MarketplaceTracker {
    constructor() {
        this.createMap = true;

        this.observer = new MutationObserver(mutations => {
            const selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab')[0];
            if (!selectedSkill) {
                return;
            }
            if (selectedSkill.innerText !== 'Marketplace') {
                return;
            }
            this.marketplaceTracker();
        });
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.observer.observe(playAreaContainer, {
            childList: true,
            subtree: true
        });
    }

    marketplaceTracker() {
        this.scanMarketplaceLists();
        this.scanOfferList();
    }

    scanOfferList() {
        let offers = document.getElementsByClassName('marketplace-table')[0]
        if (!offers) {
            return;
        }
        // Ignore offer table on sell page
        if (offers.classList.contains('marketplace-my-auctions-table')) {
            return;
        }
        offers = offers.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
        if (offers.length === 0) {
            return;
        }
        const itemId = convertItemId(offers[0].childNodes[1].firstChild.src);
        let analysis = storageRequest({
            type: 'analyze-item',
            itemId: itemId
        });
        this.favoriteButton(itemId);
        if (document.getElementsByClassName('marketplace-analysis-table').length === 0) {
            let marketplaceTop = document.getElementsByClassName("marketplace-buy-item-top")[0];
            saveInsertAdjacentHTML(marketplaceTop, "afterend", this.priceAnalysisTableTemplate(analysis));
        }
        this.markOffers(offers, analysis.maxPrice);
        this.priceHoverListener(offers, analysis.maxPrice);
    }

    favoriteButton(itemId) {
        if (document.getElementById("marketplace-favorite-button")) {
            return; 
        }
        let isFavorite = storageRequest({
            type: 'get-favorite',
            itemId: itemId
        });
        let refreshButton = document.getElementById("marketplace-refresh-button")
        saveInsertAdjacentHTML(refreshButton, "afterend", this.favoriteTemplate(isFavorite));
        let favoriteButton = document.getElementById("marketplace-favorite-button")
        favoriteButton.addEventListener('click', () => {
            const isFavorite = storageRequest({
                type: 'toggle-favorite',
                itemId: itemId
            });
            favoriteButton.classList.replace(isFavorite ? 'fill-none' : 'fill-yellow', isFavorite ? 'fill-yellow' : 'fill-none');
            favoriteButton.getElementsByTagName('span')[0].classList.toggle('invisible');
        });
    }

    favoriteTemplate(isFavorite) {
        let fill = isFavorite ? 'fill-yellow' : 'fill-none';
        let invisible = isFavorite ? 'invisible' : '';
        return `
<button id="marketplace-favorite-button" class="marketplace-refresh-button ${fill}"> 
    <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" stroke="yellow" stroke-width="30px" x="0px" y="0px" width="24px" heigth="24px" viewBox="-15 -10 366 366" style="enable-background:new 0 0 329.942 329.942;" xml:space="preserve">
        <path id="XMLID_16_" d="M329.208,126.666c-1.765-5.431-6.459-9.389-12.109-10.209l-95.822-13.922l-42.854-86.837  c-2.527-5.12-7.742-8.362-13.451-8.362c-5.71,0-10.925,3.242-13.451,8.362l-42.851,86.836l-95.825,13.922  c-5.65,0.821-10.345,4.779-12.109,10.209c-1.764,5.431-0.293,11.392,3.796,15.377l69.339,67.582L57.496,305.07  c-0.965,5.628,1.348,11.315,5.967,14.671c2.613,1.899,5.708,2.865,8.818,2.865c2.387,0,4.784-0.569,6.979-1.723l85.711-45.059  l85.71,45.059c2.208,1.161,4.626,1.714,7.021,1.723c8.275-0.012,14.979-6.723,14.979-15c0-1.152-0.13-2.275-0.376-3.352  l-16.233-94.629l69.339-67.583C329.501,138.057,330.972,132.096,329.208,126.666z">
    </svg>
    <span class=${invisible}> not</span> 
    FAV
</button>
        `;
    }

    priceAnalysisTableTemplate(analysis) {
        return `
<div class="marketplace-analysis-table">
    <div class="marketplace-analysis-table-content">
        Minimum
    </div>
    <div class="marketplace-analysis-table-content">
        Median
    </div>
    <div class="marketplace-analysis-table-content">
        Maximum
    </div>
    <div class="marketplace-analysis-table-content">
        ${numberWithSeparators(analysis.minPrice)}
    </div>
    <div class="marketplace-analysis-table-content">
        ${numberWithSeparators(analysis.medianPrice)}
    </div>
    <div class="marketplace-analysis-table-content">
        ${numberWithSeparators(analysis.maxPrice)}
    </div>
</div>
        `;
    }

    markOffers(offers, maxPrice) {
        for (let i = 0; i < offers.length; i++) {
            let offer = offers[i];
            offer.classList.remove('marketplace-offer-low', 'marketplace-offer-medium', 'marketplace-offer-high');
            let offerPrice = offer.childNodes[3].innerText
            offerPrice = parseInt(offerPrice.replace(/\./g, '').replace(/\,/g, ''));
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

    priceHoverListener(offers, maxPrice) {
        for (let offer of offers) {
            let priceCell = offer.childNodes[3];
            if (priceCell.getElementsByClassName('marketplace-offer-price-tooltip').length > 0) {
                continue;
            }
            const amount = parseInt(offer.childNodes[2].innerText.replace(/\./g, '').replace(/\,/g, ''));
            priceCell.classList.add('marketplace-offer-price');
            const price = parseInt(priceCell.innerText.replace(/\./g, '').replace(/\,/g, ''));
            let tooltip = this.priceTooltipTemplate(maxPrice, price, amount);
            saveInsertAdjacentHTML(priceCell, 'beforeend', tooltip);    
        }
    }

    priceTooltipTemplate(maxPrice, price, amount) {
        let profit = Math.floor((maxPrice * 0.95 - price) * amount);
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
                Maximum price: ${numberWithSeparators(maxPrice)}
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
                    ${numberWithSeparators(maxPrice)}
                </span>
                <span>
                    * 0.95 - 
                </span>
                <span class="text-red">
                    ${numberWithSeparators(price)}
                </span>
                <span>
                    ) * ${numberWithSeparators(amount)} =
                </span>
                <span class="${color}">
                    ${numberWithSeparators(profit)}
                </span>
                <br>
            </span>
        </div>
    </div>
</div>
        `;
    }

    // ###########################################################################

    scanMarketplaceLists() {
        let items = document.getElementsByClassName('marketplace-sell-items')[0]; // Sell page
        if (!items) {
            items = document.getElementsByClassName('marketplace-content')[0]; // Overview page
            if (!items) {
                return;
            } else {
                items = items.firstChild;
                if (this.createMap) {
                    this.iconToIdMap(items);
                }
            }
        }
        this.highlightFavorites(items);
        this.highlightBestHeatItem(items);
    }

    iconToIdMap(items) {
        let map = [];
        for (let i = 0; i < items.childNodes.length; i++) {
            const item = items.childNodes[i];
            const itemId = convertItemId(item.firstChild.firstChild.src);
            // this will give something like 'marketplaceBuyItemTooltip50'
            const apiIdString = item.firstChild.dataset['for'];
            // so we extract the id from the string
            const apiId = apiIdString.replace('marketplaceBuyItemTooltip', '');
            map.push({
                itemId: itemId,
                apiId: apiId
            });
        }
        storageRequest({
            type: 'icon-to-id-map',
            map: map
        });
        this.createMap = false;
    }

    highlightFavorites(items) {
        let favorites = storageRequest({
            type: 'get-favorites-list',
        });
        items.childNodes.forEach((itemNode) => {
            const itemId = convertItemId(itemNode.firstChild.firstChild.src);
            if (favorites.indexOf(itemId) > -1) {
                itemNode.firstChild.classList.add("favorite-highlight");
            }
        });
    }

    highlightBestHeatItem(items) {
        let bestHeatItem = storageRequest({
            type: 'get-best-heat-item',
        });
        items.childNodes.forEach((itemNode) => {
            let itemId = convertItemId(itemNode.firstChild.firstChild.src);
            if (itemId === bestHeatItem && !itemNode.firstChild.classList.contains('heat-highlight')) {
                itemNode.firstChild.classList.add("heat-highlight");
                itemNode.firstChild.insertAdjacentHTML('beforeend', `<img src=/images/heat_icon.png style="position: absolute; top: 0px; right: 0px; width: 24px; height: 24px;">`);
            } else if (itemId !== bestHeatItem && itemNode.firstChild.classList.contains('heat-highlight')) {
                itemNode.firstChild.classList.remove("heat-highlight");
                itemNode.firstChild.removeChild(itemNode.firstChild.lastChild);
            }
        });
    }
}
