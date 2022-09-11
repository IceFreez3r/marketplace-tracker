class MarketplaceTracker {
    static id = "marketplace_tracker"
    static displayName = "Marketplace Tracker";
    static icon = "<img src='/images/ui/marketplace_icon.png' alt='Marketplace Tracker Icon'>";
    static category = "economy";
    css = `
body .marketplace-table {
    overflow: unset;
}

body .marketplace-table-cell-div {
    display: flex;
    padding-top: 0;
    flex-direction: column;
    height: auto;
}

.marketplace-offer-low {
    background-image: linear-gradient(270deg, rgba(0, 128, 0, .938), rgba(0, 128, 0, 0) 70%);
}
.marketplace-offer-medium {
    background-image: linear-gradient(270deg, rgba(128, 128, 0, .938), rgba(128, 128, 0, 0) 70%);
}
.marketplace-offer-high {
    background-image: linear-gradient(270deg, rgba(128, 0, 0, .938), rgba(128, 0, 0, 0) 70%);
}

.marketplace-own-listing.marketplace-offer-low {
    background-image: linear-gradient(70deg, rgba(0, 128, 0, .938), rgba(0, 128, 0, 0) 70%), linear-gradient(270deg, rgba(0, 128, 0, .938), rgba(0, 128, 0, 0) 70%)
}
.marketplace-own-listing.marketplace-offer-medium {
    background-image: linear-gradient(70deg, rgba(0, 128, 0, .938), rgba(0, 128, 0, 0) 70%), linear-gradient(270deg, rgba(128, 128, 0, .938), rgba(128, 128, 0, 0) 70%);
}
.marketplace-own-listing.marketplace-offer-high {
    background-image: linear-gradient(70deg, rgba(0, 128, 0, .938), rgba(0, 128, 0, 0) 70%), linear-gradient(270deg, rgba(128, 0, 0, .938), rgba(128, 0, 0, 0) 70%);
}

.marketplace-offer-price-tooltip {
    visibility: hidden;
    position: absolute;
    bottom: 0%;
    left: 50%;
    pointer-events: none;
    transform: translate(-50%, -50%);
}

.marketplace-offer-price {
    position: relative;
}

.marketplace-offer-price:hover .marketplace-offer-price-tooltip {
    visibility: visible;
}

.heat-highlight {
    border: 3px solid red;
}

/* Overwrite when both highlights are active */
.favorite-highlight.heat-highlight {
    border: 3px solid white;
    box-shadow: 0 0 0 3px red;
}

.marketplace-analysis-table {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-gap: 5px;
    border: 2px solid hsla(0, 0%, 100%, .452);
    padding: 6px;
    margin: 6px;
    border-radius: 10px;
    width: 90%;
    margin: 10px auto 10px auto;
    box-shadow: inset 0 8px 8px -10px #ccc, inset 0 -8px 8px -10px #ccc;
}

.marketplace-analysis-table-content {
    justify-self: center;
}

.text-green {
    color: rgb(0, 128, 0);
}

.text-red {
    color: rgb(128, 0, 0);
}
    `;

    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        this.cssNode = injectCSS(this.css);

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
    }
    
    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.observer.observe(playAreaContainer, {
            childList: true,
            subtree: true
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.observer.disconnect();
    }

    settingsMenuContent() {
        return "";
    }

    marketplaceTracker() {
        this.scanMarketplaceLists();
        this.scanOfferList();
    }

    scanOfferList() {
        const marketplaceTable = document.getElementsByClassName('marketplace-table')[0]
        if (!marketplaceTable) {
            return;
        }
        // Ignore offer table on sell page
        if (marketplaceTable.classList.contains('marketplace-my-auctions-table')) {
            return;
        }
        let offers = marketplaceTable.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
        if (offers.length === 0) {
            return;
        }
        const itemId = convertItemId(offers[0].childNodes[1].firstChild.src);
        let analysis = storageRequest({
            type: 'analyze-item',
            itemId: itemId
        });
        if (document.getElementsByClassName('marketplace-analysis-table').length === 0) {
            let marketplaceTop = document.getElementsByClassName("marketplace-buy-item-top")[0];
            saveInsertAdjacentHTML(marketplaceTop, "afterend", this.priceAnalysisTableTemplate(analysis));
        }
        this.markOffers(offers, analysis.maxPrice);
        this.priceHoverListener(offers, analysis.maxPrice);
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
        this.highlightBestHeatItem(items);
    }

    iconToIdMap(items) {
        if (items.childNodes.length === 0) {
            return;
        }
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

    highlightBestHeatItem(items) {
        const bestHeatItem = storageRequest({
            type: 'get-best-heat-item',
        });
        items.childNodes.forEach((itemNode) => {
            const itemId = convertItemId(itemNode.firstChild.firstChild.src);
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
