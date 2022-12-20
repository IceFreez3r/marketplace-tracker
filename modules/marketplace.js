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
        if (this.settings.vendorWarning === undefined) {
            this.settings.vendorWarning = 1;
        }
        this.cssNode = injectCSS(this.css);
        this.historyCssNode = undefined;
        this.settingChanged('history', this.settings.history);
        this.hideBorderCssNode = undefined;
        this.settingChanged('hideBorder', this.settings.hideBorder);

        this.createMap = true;
        this.lastHistoryPage = 0;

        this.playAreaObserver = new MutationObserver(mutations => {
            if (detectInfiniteLoop(mutations)) {
                return;
            }
            if (getSelectedSkill() === "Marketplace") {
                this.marketplaceTracker();
            }
        });
        this.sellDialogChecker = new MutationObserver(mutations => {
            if (document.getElementById("lowest-price")) {
                this.sellDialogChecker.disconnect();
                this.belowVendorWarning();
                this.connectSellDialogChecker();
            }
        });
    }
    
    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true
        });
        this.settingChanged('vendorWarning', this.settings.vendorWarning);
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
        this.sellDialogChecker.disconnect();
    }

    settingsMenuContent() {
        const history = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    More infos in history
                </div>
                ${Templates.checkboxTemplate(MarketplaceTracker.id + '-history', this.settings.history)}
            </div>`;
        const vendorWarning = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Warning when selling below vendor price
                </div>
                ${Templates.checkboxTemplate(MarketplaceTracker.id + '-vendorWarning', this.settings.vendorWarning)}
            </div>`;
        const hideBorder = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Remove border on sell page
                    <div class="tracker-module-setting-description">
                        prevents filter from moving by 2 pixels when switching between sell and buy
                    </div>
                </div>
                ${Templates.checkboxTemplate(MarketplaceTracker.id + '-hideBorder', this.settings.hideBorder)}
            </div>`;
        return history + vendorWarning + hideBorder;
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
            case 'vendorWarning':
                if (value) {
                    this.connectSellDialogChecker();
                } else {
                    this.sellDialogChecker.disconnect();
                }
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
            </div>`;
    }

    markOffers(offers, maxPrice) {
        for (let i = 0; i < offers.length; i++) {
            let offer = offers[i];
            offer.classList.remove('marketplace-offer-low', 'marketplace-offer-medium', 'marketplace-offer-high');
            let offerPrice = offer.childNodes[3].innerText
            offerPrice = parseNumberString(offerPrice);
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
            const amount = parseNumberString(offer.childNodes[2].innerText);
            priceCell.classList.add('marketplace-offer-price');
            const price = parseNumberString(priceCell.innerText);
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
            </div>`;
    }

    // ###########################################################################

    scanMarketplaceLists() {
        if (this.createMap) {
            let items = document.getElementsByClassName('marketplace-content')[0]; // Overview page
            if (items) {
                items = items.firstChild;
                this.iconToIdMap(items);
            }
        }
    }

    iconToIdMap(items) {
        if (items.childNodes.length === 0) {
            return;
        }
        let map = [];
        for (let item of items.childNodes) {
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
            </div>`);
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
            let itemQuantity = parseNumberString(item.childNodes[3].textContent);
            if (itemId.includes('dagger') || itemId.includes('boot') || itemId.includes('gloves') || itemId.includes('World_Walkers')) {
                itemQuantity *= 2;
            }
            const totalDiv = item.childNodes[4];
            const total = parseNumberString(totalDiv.textContent);
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
                </div>`);
        }
        // Save current history page
        this.lastHistoryPage = currentHistoryPage;
    }

    connectSellDialogChecker() {
        this.sellDialogChecker.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    belowVendorWarning() {
        // very hardcoded way to get nodes here, because there are no descriptive classes
        const sellButton = document.getElementsByClassName("item-dialogue-button idlescape-button idlescape-button-green")[1];
        let warningIcon = sellButton.getElementsByClassName("warning")[0];
        if (warningIcon) {
            return;
        }
        sellButton.insertAdjacentHTML('beforeend', Templates.warningTemplate("hidden"));
        warningIcon = sellButton.getElementsByClassName("warning")[0];
        const vendorPriceNode = document.getElementsByClassName("MuiPaper-root MuiDialog-paper MuiDialog-paperScrollPaper MuiDialog-paperWidthSm MuiPaper-elevation24 MuiPaper-rounded")[0].childNodes[1].childNodes[4].firstChild.childNodes[2];
        const vendorPrice = parseNumberString(vendorPriceNode.textContent);
        const priceInput = document.getElementsByClassName("MuiPaper-root MuiDialog-paper MuiDialog-paperScrollPaper MuiDialog-paperWidthSm MuiPaper-elevation24 MuiPaper-rounded")[0].childNodes[1].childNodes[5];
        priceInput.addEventListener('input', () => {
            const price = parseNumberString(priceInput.value, {"group": ",", "decimal": "."});
            const tooLowPrice = Math.floor(price * 0.95) < vendorPrice;
            console.log({price, vendorPrice, tooLowPrice});
            warningIcon.classList.toggle("hidden", !tooLowPrice);
        });
    }
}
