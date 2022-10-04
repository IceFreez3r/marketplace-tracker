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
    historyCss = `
.tracker-history {
    display: grid;
    grid-template-columns: repeat(2, max-content) 1fr repeat(3, minmax(max-content, 0.4fr));
    overflow-y: auto;
    flex: 1 1;
    border-radius: 6px 6px 0 0;
}

.tracker-history > :not(.marketplace-history-item-price, .marketplace-history-item-icon) {
    border-right: 2px solid #2c2c2c;
}

.tracker-history > * {
    background: #494949;
}

/* Alternating background */
.tracker-history > :nth-child(12n-6), 
.tracker-history > :nth-child(12n-5), 
.tracker-history > :nth-child(12n-4), 
.tracker-history > :nth-child(12n-3), 
.tracker-history > :nth-child(12n-2), 
.tracker-history > :nth-child(12n-1) {
    background: #3b3b3b;
}

.tracker-history > :not(.tracker-history-header) {
    padding: 15px 10px;
}

.tracker-history-header {
    text-align: center;
    line-height: 22px;
}

.marketplace-history-item-date {
    width: 110px;
}

.marketplace-history-item-date-i {
    flex: unset;
}

.marketplace-history-item-icon {
    margin-left: unset;
    padding-left: 10px !important; /* Important is necessary to overwrite the !important flag of the original class */
}

.marketplace-history-item-date,
.marketplace-history-item-icon,
.marketplace-history-item-name,
.marketplace-history-item-amount {
    display: flex;
    align-items: center;
    justify-content: center;
}

.marketplace-history-item-name {
    justify-content: start;
}

.marketplace-history-item-per-item {
    text-align: right;
}

.marketplace-history-item-per-item.purchase {
    color: #fa4d4d;
}

.marketplace-history-item-per-item.sale {
    color: #4eff4e;
}

.marketplace-history-item-price-tax {
    margin-left: 5px;
    margin-top: -3px;
    width: 16px;
    height: 16px;
}
    `;

    hideBorderCss = `
.marketplace-sell-items-sort {
    border: none;
}

.marketplace-my-auctions {
    border: none;
}
    `;

    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        if (this.settings.history === undefined) {
            this.settings.history = 1;
        }
        if (this.settings.hideBorder === undefined) {
            this.settings.hideBorder = 0;
        }
        this.cssNode = injectCSS(this.css);
        this.historyCssNode = undefined;
        this.settingChanged('history', this.settings.history);
        this.hideBorderCssNode = undefined;
        this.settingChanged('hideBorder', this.settings.hideBorder);

        this.createMap = true;
        this.lastHistoryPage = 0;

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
        const history = `
<div class="tracker-module-setting">
    <div class="tracker-module-setting-name">
        More infos in history
    </div>
    ${this.tracker.checkboxTemplate(MarketplaceTracker.id + '-history', this.settings.history)}
</div>
        `;
        const hideBorder = `
<div class="tracker-module-setting">
    <div class="tracker-module-setting-name">
        Remove border on sell page
        <div class="tracker-module-setting-description">
            prevents filter from moving by 2 pixels when switching between sell and buy
        </div>
    </div>
    ${this.tracker.checkboxTemplate(MarketplaceTracker.id + '-hideBorder', this.settings.hideBorder)}
</div>
        `;
        return history + hideBorder;
    }

    settingChanged(setting, value) {
        switch (setting) {
            case 'history':
                if (value) {
                    this.historyCssNode = injectCSS(this.historyCss);
                } else {
                    this.historyCssNode?.remove();
                }
                break;
            case 'hideBorder':
                if (value) {
                    this.hideBorderCssNode = injectCSS(this.hideBorderCss);
                } else {
                    this.hideBorderCssNode?.remove();
                }
                break;
        }
    }

    marketplaceTracker() {
        this.scanMarketplaceLists();
        this.scanOfferList();
        if (this.settings.history) {
            this.initMarketHistory();
        }
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
        ${formatNumber(analysis.minPrice)}
    </div>
    <div class="marketplace-analysis-table-content">
        ${formatNumber(analysis.medianPrice)}
    </div>
    <div class="marketplace-analysis-table-content">
        ${formatNumber(analysis.maxPrice)}
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

    initMarketHistory() {
        // Return if current page isn't the market history page
        let history = document.getElementsByClassName('marketplace-history')[0];
        if (!history) {
            return;
        }
        // Return if the header isn't loaded yet
        const header = document.getElementsByClassName('marketplace-history-header')[0];
        if (!header) {
            return;
        }
        this.marketHistory(history);
        // Hide vanilla table
        history.classList.add('hidden');
        // Add observer to the original table
        const observer = new MutationObserver((mutations) => {
            this.marketHistory(history);
        });
        observer.observe(history, {
            characterData: true,
            subtree: true,
        });
    }

    marketHistory(history) {
        const oldTrackerHistory = document.getElementsByClassName('tracker-history')[0]; // might be undefined
        const currentHistoryPage = document.getElementsByClassName('marketplace-history-page selected')[0].textContent;
        // Return if the custom history already exists and the user has not changed the page
        if (oldTrackerHistory && currentHistoryPage === this.lastHistoryPage) {
            return;
        }
        // Delete old history if it exists
        oldTrackerHistory?.remove();
        // Create new table
        history.insertAdjacentHTML('afterend', `
<div class="tracker-history">
    <div class="tracker-history-header">
        DATE
    </div>
    <div class="tracker-history-header" style="grid-area: 1 / 2 / 2 / 4;">
        ITEM
    </div>
    <div class="tracker-history-header">
        QUANTITY
    </div>
    <div class="tracker-history-header">
        PER ITEM
    </div>
    <div class="tracker-history-header">
        TOTAL
    </div>
</div>
        `);
        let trackerHistory = history.nextElementSibling;
        // Copy and modify rows
        let historyItems = history.getElementsByClassName('marketplace-history-item');
        for (let item of historyItems) {
            // Copy date, icon, name and quantity
            for (let i = 0; i < 4; i++) {
                trackerHistory.insertAdjacentElement('beforeend', item.childNodes[i].cloneNode(true));
            }
            // Build new price per item and total
            const itemId = convertItemId(item.childNodes[1].firstChild.src);
            let itemQuantity = parseInt(item.childNodes[3].textContent.replace(/\./g, ''));
            if (itemId.includes('dagger') || itemId.includes('boot') || itemId.includes('gloves') || itemId.includes('World_Walkers')) {
                itemQuantity *= 2;
            }
            const totalDiv = item.childNodes[4];
            const total = parseInt(totalDiv.textContent.replace(/\./g, ''));
            const type = totalDiv.classList[1]; // "purchase" or "sale"
            saveInsertAdjacentHTML(trackerHistory, 'beforeend', `
<div class="marketplace-history-item-per-item ${type}">
    <div>
        ${formatNumber(total / itemQuantity, { showSign: true })}
        <img class="marketplace-history-item-price-gold" src="images/gold_coin.png">
    </div>
    ${type === "sale" ? `
    <div>
        ~ ${formatNumber(profit("flat", 0, total / itemQuantity), { showSign: true })}
        <img class="marketplace-history-item-price-tax" src="/images/ui/marketplace_icon.png">
    </div>
    ` : ''}
</div>
<div class="marketplace-history-item-price ${type}">
    <div>
        ${formatNumber(total, { showSign: true })}
        <img class="marketplace-history-item-price-gold" src="images/gold_coin.png">
    </div>
    ${type === "sale" ? `
    <div>
        ${formatNumber(profit("flat", 0, total), { showSign: true })}
        <img class="marketplace-history-item-price-tax" src="/images/ui/marketplace_icon.png">
    </div>
    ` : ''}
</div>
            `);
        }
        // Save current history page
        this.lastHistoryPage = currentHistoryPage;
    }
}
