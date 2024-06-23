class MarketHighlights {
    static id = "market_highlights";
    static displayName = "Market Highlights";
    static icon = Templates.favoriteTemplate(); // TODO
    static category = "economy";
    css = `
.tracker-highlight-button {
    width: 33px;
    height: 33px;
    margin-left: 1px;
    margin-right: 1px;
    padding: 1px;
    cursor: pointer;
}

.svg-inactive > * {
    fill: none;
}

.favorite-highlight {
    border: 3px solid white;
}

.heat-highlight {
    border: 3px solid red;
}

/* Handling multiple highlights at once */
.quantile-borders.favorite-highlight {
    box-shadow: 0 0 0 3px white;
}

.quantile-borders.heat-highlight {
    box-shadow: 0 0 0 3px red;
}

.favorite-highlight.heat-highlight {
    border: 3px solid white;
    box-shadow: 0 0 0 3px red;
}

.quantile-borders.favorite-highlight.heat-highlight {
    box-shadow: 0 0 0 3px white, 0 0 0 6px red;
}

.marketplace-search {
    grid-template-columns: 35px auto 1fr;
}

#tracker-buttons {
    display: flex;
}

#tracker-favorite-filter,
#tracker-quantile-colors,
#tracker-favorite-toggle {
    display: none;
}

#tracker-buttons.overview > #tracker-favorite-filter,
#tracker-buttons.listings > #tracker-favorite-filter,
#tracker-buttons.offers > #tracker-favorite-filter,
#tracker-buttons.overview > #tracker-quantile-colors,
#tracker-buttons.buy > #tracker-favorite-toggle {
    display: block;
}

/* vanilla .hidden class gets overwritten by chakra class */
.hidden {
    display: none;
}

.svg-inactive > rect {
    stroke: #fff;
}

#tracker-quantile-colors:not(.svg-inactive) .rect-third {
    stroke: hsl(120, 100%, 50%);
}

#tracker-quantile-colors:not(.svg-inactive) .rect-second {
    stroke: hsl(60, 100%, 50%);
}

#tracker-quantile-colors:not(.svg-inactive) .rect-first {
    stroke: hsl(0, 100%, 50%);
}

.quantile-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    padding: 2px;
}

.alert-icon {
    position: absolute;
    bottom: 0;
    right: 0;
    padding: 4px;
    display: flex;
    justify-content: center;
    z-index: 1;
    stroke: white;
    stroke-width: 2px;
    stroke-linejoin: round;
}

.alert-icon.below {
    fill: red;
}

.alert-icon.above {
    fill: green;
    transform: rotate(180deg);
}

.marker-size-slider {
    position: relative;
}

.marker-size-preview {
    display: none;
}

.marker-size-slider:hover .marker-size-preview {
    display: block;
    position: absolute;
    top: 80%;
    right: 0;
}
    `;

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;
        if (this.settings.quantileDisplay === undefined) {
            this.settings.quantileDisplay = "dot";
        }
        if (this.settings.markerSize === undefined) {
            this.settings.markerSize = 40;
        }
        if (this.settings.favorites === undefined) {
            this.settings.favorites = [];
        }
        this.migrateFavorites();
        this.favorites = this.settings.favorites;
        if (this.settings.colorBlindMode === undefined) {
            this.settings.colorBlindMode = false;
        }
        this.cssNode = injectCSS(this.css);

        this.favoriteFilterActive = false;
        this.quantileColorsActive = false;
        this.notificationInformation = {}; // comes from alert.js

        this.playAreaObserver = new MutationObserver((mutations) => {
            this.checkForMarketplace(mutations);
        });
    }

    onGameReady() {
        const playAreaContainer = getPlayAreaContainer();
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true,
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
    }

    settingsMenuContent() {
        let colorBlindMode = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Colorblind mode
                </div>
                ${Templates.checkboxTemplate(MarketHighlights.id + "-colorBlindMode", this.settings.colorBlindMode)}
            </div>`;
        let quantileDisplay = document.createElement("div");
        quantileDisplay.classList.add("tracker-module-setting");
        quantileDisplay.insertAdjacentHTML(
            "beforeend",
            `
            <div class="tracker-module-setting-name">
                Quantile display
            </div>`
        );
        quantileDisplay.append(
            Templates.selectMenu(
                MarketHighlights.id + "-quantileDisplay",
                {
                    off: "Off",
                    border: "Border",
                    dot: "Dot",
                    shadow: "Shadow",
                    party: "Let my eyes bleed",
                },
                this.settings.quantileDisplay
            )
        );
        let markerSize = document.createElement("div");
        markerSize.classList.add("tracker-module-setting");
        saveInsertAdjacentHTML(
            markerSize,
            "beforeend",
            `
            <div class="tracker-module-setting-name">
                Marker size
            </div>
            <div class="marker-size-slider">
                ${Templates.sliderTemplate(MarketHighlights.id + "-markerSize", [15, 70], this.settings.markerSize)}
                <div class="marker-size-preview item gem" data-tip="true" data-for="marketplaceBuyItemTooltip50" style="background-image: url('/images/ui/frame_box.png'), linear-gradient(rgb(28, 32, 36), rgb(28, 32, 36));">
                    <img class="item-icon" src="/images/misc/book.png" alt="Book">
                    ${Templates.dotTemplate(this.settings.markerSize + "%", "quantile-dot")}
                </div>
            </div>`
        );
        // add onchange listener to slider
        let slider = markerSize.querySelector("input");
        slider.addEventListener("input", this.updatePreview.bind(this));
        return [colorBlindMode, quantileDisplay, markerSize];
    }

    settingChanged(settingId, value) {
        return;
    }

    onAPIUpdate() {
        this.checkForMarketplace();
    }

    onNotify(message, data) {
        if (message === "alerts") {
            this.notificationInformation = data;
            this.checkForMarketplace();
        }
    }

    migrateFavorites() {
        for (let i = 0; i < this.settings.favorites.length; i++) {
            const favorite = Number(this.settings.favorites[i]);
            if (isNaN(favorite)) {
                this.settings.favorites[i] = this.storage.convertItemIdToApiId(this.settings.favorites[i]);
            }
        }
    }

    checkForMarketplace(mutations) {
        if (getSelectedSkill() === "Marketplace") {
            if (mutations && detectInfiniteLoop(mutations)) {
                return;
            }
            this.highlight();
        } else {
            this.favoriteFilterActive = false;
            this.quantileColorsActive = false;
        }
    }

    updatePreview() {
        const preview = document.getElementsByClassName("quantile-dot")[0];
        if (preview) {
            const size = document.getElementById(MarketHighlights.id + "-markerSize").value;
            preview.style.width = size + "%";
            preview.style.height = size + "%";
        }
    }

    highlight() {
        this.handleButtons();
        const page = getMarketPage();
        switch (page) {
            case "offers":
            case "listings": {
                this.highlightFavorites();
                this.filterFavorites();
                break;
            }
            case "overview": {
                this.highlightFavorites();
                this.filterFavorites();
                if (this.settings.quantileDisplay !== "off") {
                    this.quantileColors();
                }
                this.highlightBestHeatItem();
                this.highlightAlertItems();
                break;
            }
            default:
                break;
        }
    }

    handleButtons() {
        const trackerButtons = insertTrackerButtons();

        this.filterFavoritesButton(trackerButtons);
        if (this.settings.quantileDisplay !== "off") {
            this.quantileColorsButton(trackerButtons);
        }
        this.toggleFavoriteButton(trackerButtons);
    }

    filterFavoritesButton(trackerButtons) {
        if (document.getElementById("tracker-favorite-filter")) {
            return;
        }
        saveInsertAdjacentHTML(
            trackerButtons,
            "beforeend",
            `
            <div id="tracker-favorite-filter" class="${this.favoriteFilterActive ? "" : "svg-inactive"}">
                ${Templates.favoriteTemplate("tracker-highlight-button")}
            </div>`
        );
        const filter = document.getElementById("tracker-favorite-filter");
        filter.addEventListener("click", () => {
            filter.classList.toggle("svg-inactive");
            this.favoriteFilterActive = !this.favoriteFilterActive;
            this.filterFavorites();
        });
    }

    filterFavorites() {
        const notFavoriteItems = document.querySelectorAll(
            ".anchor-buy-all-items .item:not(.favorite-highlight), .anchor-sell-all-items .item:not(.favorite-highlight)"
        );
        for (let i = 0; i < notFavoriteItems.length; i++) {
            notFavoriteItems[i].classList.toggle("hidden", this.favoriteFilterActive);
        }
        const notFavoriteAuctions = document.querySelectorAll(".marketplace-table-row:not(.favorite-highlight");
        for (let i = 0; i < notFavoriteAuctions.length; i++) {
            notFavoriteAuctions[i].classList.toggle("hidden", this.favoriteFilterActive);
        }
        const favoriteAuctions = document.querySelectorAll(".marketplace-table-row.favorite-highlight");
        for (let i = 0; i < favoriteAuctions.length; i++) {
            favoriteAuctions[i].classList.remove("hidden");
        }
    }

    highlightFavorites() {
        const items = document.querySelector(".marketplace-content .all-items");
        if (items) {
            const children = items.getElementsByClassName("item");
            for (const itemNode of children) {
                const apiId = convertApiId(itemNode);
                if (this.isFavorite(apiId)) {
                    itemNode.classList.add("favorite-highlight");
                }
            }
        }
        const ownAuctions = document.getElementsByClassName("marketplace-table-row");
        for (const auction of ownAuctions) {
            let itemId = convertItemId(auction.childNodes[1].firstChild.src);
            if (this.storage.itemRequiresFallback(itemId)) {
                itemId = auction.childNodes[1].firstChild.alt;
            }
            const apiId = this.storage.convertItemIdToApiId(itemId);
            auction.classList.toggle("favorite-highlight", this.isFavorite(apiId));
        }
    }

    quantileColorsButton(trackerButtons) {
        if (document.getElementById("tracker-quantile-colors")) {
            return;
        }
        saveInsertAdjacentHTML(
            trackerButtons,
            "beforeend",
            `
            <div id="tracker-quantile-colors" class="${this.quantileColorsActive ? "" : "svg-inactive"}">
                ${Templates.colorTemplate("tracker-highlight-button")}
            </div>`
        );
        const filter = document.getElementById("tracker-quantile-colors");
        filter.addEventListener("click", () => {
            filter.classList.toggle("svg-inactive");
            this.quantileColorsActive = !this.quantileColorsActive;
            this.quantileColors();
        });
    }

    quantileColors() {
        const items = document.querySelectorAll(".anchor-buy-all-items .item");
        if (items.length === 0) {
            return;
        }
        if (this.quantileColorsActive) {
            const apiIds = Array.from(items).map((item) => convertApiId(item));
            const priceQuantiles = this.storage.latestPriceQuantiles(apiIds);
            if (this.settings.quantileDisplay === "party") {
                this.partyMode(items, priceQuantiles);
            } else {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const quantile = priceQuantiles[i];
                    const color = getHSLColor(quantile, this.settings.colorBlindMode);
                    item.style.backgroundImage = "url(/images/ui/frame_box.png), linear-gradient(#1c2024, #1c2024)";
                    if (this.settings.quantileDisplay === "dot") {
                        this.quantileDot(item, color);
                    } else if (this.settings.quantileDisplay === "border") {
                        item.style.border = `3px solid ${color}`;
                        item.classList.toggle("quantile-borders", this.quantileColorsActive);
                    } else if (this.settings.quantileDisplay === "shadow") {
                        item.getElementsByClassName("item-icon")[0].style.filter = `drop-shadow(3px 3px 2px ${color})`;
                    }
                }
            }
        } else {
            for (const item of items) {
                item.style.backgroundImage = "";
                item.style.border = "";
                item.getElementsByClassName("item-icon")[0].style.filter = "";
                item.getElementsByClassName("quantile-dot")[0]?.remove();
                item.classList.toggle("quantile-borders", this.quantileColorsActive);
            }
        }
    }

    quantileDot(item, color) {
        const quantileDot = item.getElementsByClassName("quantile-dot")[0];
        if (quantileDot) {
            quantileDot.firstElementChild.style.fill = color;
        } else {
            saveInsertAdjacentHTML(
                item,
                "beforeend",
                Templates.dotTemplate(this.settings.markerSize + "%", "quantile-dot", color)
            );
        }
    }

    partyMode(items, priceQuantiles, offset = 0) {
        // Stop if item is no longer in DOM
        if (!this.quantileColorsActive || !items[0].parentNode) {
            return;
        }
        // If the lengths don't match, we ignore the overhang
        // No one will use this feature seriously anyway
        for (let i = 0; i < items.length && i < priceQuantiles.length; i++) {
            const item = items[i];
            const quantile = (priceQuantiles[i] + offset) % 3;
            const color = getHSLColor(quantile, this.settings.colorBlindMode);
            item.style.border = `3px solid ${color}`;
            this.quantileDot(item, color);
            item.getElementsByClassName("item-icon")[0].style.filter = `drop-shadow(3px 3px 2px ${color})`;
        }
        setTimeout(() => {
            "tracker-highlight-button";
            this.partyMode(items, priceQuantiles, (offset + 0.05) % 3);
        }, 100);
    }

    toggleFavoriteButton(trackerButtons) {
        const button = document.getElementById("tracker-favorite-toggle");
        const apiId = this.getApiId();
        const isFavorite = this.isFavorite(apiId);
        if (button) {
            button.classList.toggle("svg-inactive", !isFavorite);
            return;
        }
        saveInsertAdjacentHTML(
            trackerButtons,
            "beforeend",
            `
            <div id="tracker-favorite-toggle" class="${isFavorite ? "" : "svg-inactive"}">
            ${Templates.favoriteTemplate("tracker-highlight-button")}
            </div>`
        );
        const toggleFavoriteButton = document.getElementById("tracker-favorite-toggle");
        toggleFavoriteButton.addEventListener("click", () => {
            this.toggleFavorite();
            toggleFavoriteButton.classList.toggle("svg-inactive");
        });
    }

    highlightBestHeatItem() {
        const items = document.querySelector(".marketplace-content .all-items");
        if (!items) return;

        const bestHeatApiId = this.storage.bestHeatItem();
        const children = items.getElementsByClassName("item");
        for (const itemNode of children) {
            const apiId = convertApiId(itemNode);
            if (apiId === bestHeatApiId && !itemNode.classList.contains("heat-highlight")) {
                itemNode.classList.add("heat-highlight");
                saveInsertAdjacentHTML(
                    itemNode,
                    "beforeend",
                    `<img src=/images/heat_icon.png style="position: absolute; top: 0px; right: 0px; width: ${this.settings.markerSize}%; height: ${this.settings.markerSize}%;">`
                );
            } else if (apiId !== bestHeatApiId && itemNode.classList.contains("heat-highlight")) {
                itemNode.classList.remove("heat-highlight");
                itemNode.removeChild(itemNode.lastChild);
            }
        }
    }

    highlightAlertItems() {
        const items = document.querySelector(".marketplace-content .all-items");
        if (!items) return;

        const alertIcons = document.getElementsByClassName("alert-icon");
        for (let i = alertIcons.length - 1; i >= 0; i--) {
            alertIcons[i].remove();
        }
        const children = items.getElementsByClassName("item");
        for (const itemNode of children) {
            const apiId = convertApiId(itemNode);
            if (this.notificationInformation[apiId] === "below" && !itemNode.classList.contains("alert-below")) {
                itemNode.style.order = -1;
                saveInsertAdjacentHTML(
                    itemNode,
                    "beforeend",
                    `
                    <div class="alert-icon below" style="width:${this.settings.markerSize}%; height:${
                        this.settings.markerSize
                    }%;">
                        ${Templates.arrowDownTemplate()}
                    </div>`
                );
            } else if (this.notificationInformation[apiId] === "above" && !itemNode.classList.contains("alert-above")) {
                itemNode.style.order = -1;
                saveInsertAdjacentHTML(
                    itemNode,
                    "beforeend",
                    `
                    <div class="alert-icon above" style="width:${this.settings.markerSize}%; height:${
                        this.settings.markerSize
                    }%;">
                        ${Templates.arrowDownTemplate()}
                    </div>`
                );
            } else {
                itemNode.style.order = "";
            }
        }
    }

    // Only works on buy page
    getApiId() {
        const marketplaceTableHeader = document.getElementsByClassName("anchor-market-tables-header")[0];
        if (marketplaceTableHeader) return convertApiId(marketplaceTableHeader.getElementsByClassName("item")[0]);
        return -1;
    }

    isFavorite(apiId) {
        return this.favorites.indexOf(apiId) > -1;
    }

    toggleFavorite() {
        const apiId = this.getApiId();
        const isFavorite = this.isFavorite(apiId);
        if (isFavorite) {
            this.favorites.splice(this.favorites.indexOf(apiId), 1);
        } else {
            this.favorites.push(apiId);
        }
        this.tracker.storeSettings();
    }
}
