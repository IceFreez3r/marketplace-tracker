class MarketplaceTracker {
    static id = "marketplace_tracker";
    static displayName = "Marketplace Tracker";
    static icon = "<img src='/images/ui/marketplace_icon.png' alt='Marketplace Tracker Icon'>";
    static category = "economy";
    css = `
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

.marketplace-analysis-table {
    display: grid;
    grid-template-rows: repeat(2, 1fr);
    grid-auto-flow: column;
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
    display: flex;
    align-items: center;
    gap: 5px;
}

#tracker-edit-low,
#tracker-edit-mid,
#tracker-edit-high {
    cursor: pointer;
    width: 20px;
    height: 20px;
    border: 1px solid white;
    border-radius: 5px;
    padding: 2px;
}

.text-green {
    color: rgb(0, 128, 0);
}

.text-red {
    color: rgb(128, 0, 0);
}
    `;

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;
        if (this.settings.vendorWarning === undefined) {
            this.settings.vendorWarning = 1;
        }
        if (this.settings.editMode === undefined) {
            this.settings.editMode = 0;
        }
        if (this.settings.colorBlindMode === undefined) {
            this.settings.colorBlindMode = 0;
        }
        this.cssNode = injectCSS(this.css);

        this.playAreaObserver = new MutationObserver((mutations) => {
            this.playAreaObserver.disconnect();
            this.checkForMarketplace(mutations);
            this.connectPlayAreaObserver();
        });
        this.sellDialogChecker = new MutationObserver((mutations) => {
            if (document.getElementById("lowest-price")) {
                this.sellDialogChecker.disconnect();
                this.belowVendorWarning();
                this.connectSellDialogChecker();
            }
        });
    }

    onGameReady() {
        this.connectPlayAreaObserver();
        this.settingChanged("vendorWarning", this.settings.vendorWarning);
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
        this.sellDialogChecker.disconnect();
    }

    settingsMenuContent() {
        const colorBlindMode = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Colorblind mode
                </div>
                ${Templates.checkboxTemplate(MarketplaceTracker.id + "-colorBlindMode", this.settings.colorBlindMode)}
            </div>`;
        const vendorWarning = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Warning when selling below vendor price
                </div>
                ${Templates.checkboxTemplate(MarketplaceTracker.id + "-vendorWarning", this.settings.vendorWarning)}
            </div>`;
        const editMode = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Show buttons for manual data editing
                </div>
                ${Templates.checkboxTemplate(MarketplaceTracker.id + "-editMode", this.settings.editMode)}
            </div>`;
        return colorBlindMode + vendorWarning + editMode;
    }

    settingChanged(setting, value) {
        switch (setting) {
            case "vendorWarning":
                if (value) {
                    this.connectSellDialogChecker();
                } else {
                    this.sellDialogChecker.disconnect();
                }
        }
    }

    onAPIUpdate() {
        this.checkForMarketplace();
    }

    connectPlayAreaObserver() {
        const playAreaContainer = getPlayAreaContainer();
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true,
        });
    }

    checkForMarketplace(mutations) {
        if (getSelectedSkill() === "Marketplace") {
            if (mutations && detectInfiniteLoop(mutations)) {
                return;
            }
            this.marketplaceTracker();
        }
    }

    marketplaceTracker() {
        this.scanOfferList();
    }

    scanOfferList() {
        const marketplaceTableHeader = document.getElementsByClassName("anchor-market-tables-header")[0];
        if (!marketplaceTableHeader) {
            return;
        }
        const apiId = convertApiId(marketplaceTableHeader.getElementsByClassName("item")[0]);
        if (!apiId) return;
        const analysis = this.storage.analyzeItem(apiId);
        document.getElementsByClassName("marketplace-analysis-table")[0]?.remove();
        const marketplaceTop = document.getElementsByClassName("marketplace-buy-item-top")[0];
        saveInsertAdjacentHTML(marketplaceTop, "afterend", this.priceAnalysisTableTemplate(apiId, analysis));
        if (this.settings.editMode) {
            document.getElementById("tracker-edit-low").addEventListener("click", () => this.editData(apiId, "low"));
            document.getElementById("tracker-edit-mid").addEventListener("click", () => this.editData(apiId, "mid"));
            document.getElementById("tracker-edit-high").addEventListener("click", () => this.editData(apiId, "high"));
        }
        this.markOffers(apiId);
        // this.priceHoverListener(offers, analysis.maxPrice); // TODO
    }

    priceAnalysisTableTemplate(apiId, analysis) {
        let table = `
            <div class="marketplace-analysis-table">
                <div class="marketplace-analysis-table-content">
                    Minimum
                </div>
                <div class="marketplace-analysis-table-content">
                    ${formatNumber(analysis.minPrice)}
                    ${this.settings.editMode ? Templates.scissorTemplate("tracker-edit-low") : ""}
                </div>
                <div class="marketplace-analysis-table-content">
                    Median
                </div>
                <div class="marketplace-analysis-table-content">
                    ${formatNumber(analysis.medianPrice)}
                    ${this.settings.editMode ? Templates.scissorTemplate("tracker-edit-mid") : ""}
                </div>
                <div class="marketplace-analysis-table-content">
                    Maximum
                </div>
                <div class="marketplace-analysis-table-content">
                    ${formatNumber(analysis.maxPrice)}
                    ${this.settings.editMode ? Templates.scissorTemplate("tracker-edit-high") : ""}
                </div>`;
        const heatValue = this.storage.itemHeatValue(apiId);
        if (heatValue !== Infinity) {
            table += `
                <div class="marketplace-analysis-table-content">
                    Gold/Heat
                </div>
                <div class="marketplace-analysis-table-content">
                    ${formatNumber(heatValue, { fraction: true })}
                </div>`;
        }
        table += "</div>";
        return table;
    }

    editData(apiId, type) {
        this.storage.editData(apiId, type);
        this.scanOfferList();
    }

    markOffers(apiId) {
        const header = document.querySelector(".market-buy .marketplace-table-header");
        const priceColumnIndex = Array.from(header.childNodes).findIndex((node) => node.innerText.startsWith("Price"));
        const offers = document.querySelectorAll(".market-buy .marketplace-table-row");
        for (const offer of offers) {
            const offerPrice = parseNumberString(offer.childNodes[priceColumnIndex].innerText);
            const quantile = this.storage.priceQuantile(apiId, offerPrice);
            if (offer.classList.contains("marketplace-own-listing")) {
                offer.style.boxShadow = `inset -7px 0 0 ${getHSLColor(
                    quantile,
                    this.settings.colorBlindMode
                )}, inset 7px 0 0 green`;
            } else {
                offer.style.boxShadow = `inset -7px 0 0 ${getHSLColor(quantile, this.settings.colorBlindMode)}`;
            }
        }
    }

    priceHoverListener(offers, maxPrice) {
        for (let offer of offers) {
            let priceCell = offer.childNodes[3];
            if (priceCell.getElementsByClassName("marketplace-offer-price-tooltip").length > 0) {
                continue;
            }
            const amount = parseNumberString(offer.childNodes[2].innerText);
            priceCell.classList.add("marketplace-offer-price");
            const price = parseNumberString(priceCell.innerText);
            saveInsertAdjacentHTML(priceCell, "beforeend", this.priceTooltipTemplate(maxPrice, price, amount));
        }
    }

    priceTooltipTemplate(maxPrice, price, amount) {
        let profit = Math.floor((maxPrice * 0.95 - price) * amount);
        let color = profit > 0 ? "text-green" : "text-red";
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

    connectSellDialogChecker() {
        this.sellDialogChecker.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    belowVendorWarning() {
        const sellButton = document.getElementsByClassName("anchor-sell-confirm-button")[0];
        let warningIcon = sellButton.getElementsByClassName("warning")[0];
        if (warningIcon) {
            return;
        }
        sellButton.insertAdjacentHTML("beforeend", Templates.warningTemplate());
        warningIcon = sellButton.getElementsByClassName("warning")[0];
        const vendorPriceString = document
            .getElementById("lowest-price-npc")
            .textContent.replace("Item sells to NPCs for:", "")
            .replaceAll(" ", "");
        const vendorPrice = parseNumberString(vendorPriceString);
        const priceInput = document.querySelector(".anchor-sell-price-input, .anchor-buy-price-input");
        if (!priceInput) {
            return;
        }
        this.checkPrice(warningIcon, priceInput, vendorPrice);
        priceInput.addEventListener("input", () => {
            this.checkPrice(warningIcon, priceInput, vendorPrice);
        });
    }

    checkPrice(warningIcon, priceInput, vendorPrice) {
        const price = parseCompactNumberString(priceInput.value);
        const tooLowPrice = Math.floor(price * 0.95) < vendorPrice;
        warningIcon.classList.toggle("hidden", !tooLowPrice);
    }
}
