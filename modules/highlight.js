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

.marketplace-top {
    display: grid;
    grid-template-areas: "info info"
                         "input tracker";
    grid-template-columns: 1fr max-content;
}

.marketplace-buy-info {
    grid-area: info;
}

#tracker-buttons {
    grid-area: tracker;
    display: flex;
}

.marketplace-top > .chakra-input__group,
.anchor-marketplace-filter {
    grid-area: input;
}

/* vanilla .hidden class gets overwritten by chakra class */
.hidden {
    display: none;
}

/* identical to vanilla .marketplace-refresh-button */
.marketplace-favorite-button {
    color: #fff;
    height: 45px;
    width: 45px;
    background: linear-gradient(180deg,rgba(72,85,99,.8431372549019608),rgba(41,50,60,.6039215686274509));
}

.marketplace-favorite-button:not(.svg-inactive) > span {
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
        this.cssNode = injectCSS(this.css);

        this.favorites = this.storage.loadLocalStorage("favorites", []);
        this.favoriteFilterActive = false;
        this.quantileColorsActive = false;
        this.notificationInformation = {}; // comes from alert.js

        this.playAreaObserver = new MutationObserver((mutations) => {
            this.checkForMarketplace(mutations);
        });
    }

    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
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
        return [quantileDisplay, markerSize];
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

    // Determines current subpage of the marketplace
    highlight() {
        // Buy page
        const buyHeader = document.getElementsByClassName("marketplace-buy-item-top")[0];
        if (buyHeader) {
            this.toggleFavoriteButton(buyHeader.parentNode);
            return;
        }
        // Sell Page
        const sellItems = document.getElementsByClassName("anchor-sell-all-items")[0];
        if (sellItems) {
            this.highlightFavorites(sellItems);
            this.filterFavoritesButton();
            this.filterFavorites();
            return;
        }
        // Overview Page
        const buyItems = document.getElementsByClassName("anchor-buy-all-items")[0];
        if (buyItems) {
            this.highlightFavorites(buyItems);
            this.filterFavoritesButton();
            this.filterFavorites();
            if (this.settings.quantileDisplay !== "off") {
                this.quantileColorsButton();
                this.quantileColors();
            }
            this.highlightBestHeatItem(buyItems);
            this.highlightAlertItems(buyItems);
            return;
        }
    }

    filterFavoritesButton() {
        if (document.getElementById("tracker-favorite-filter")) {
            return;
        }
        const trackerButtons = insertTrackerButtons();
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
            notFavoriteItems[i].parentNode.classList.toggle("hidden", this.favoriteFilterActive);
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

    highlightFavorites(items) {
        items.childNodes.forEach((itemNode) => {
            let itemId = convertItemId(itemNode.firstChild.firstChild.src);
            if (this.storage.itemRequiresFallback(itemId)) {
                itemId = itemNode.firstChild.firstChild.alt;
            }
            if (this.isFavorite(itemId)) {
                itemNode.firstChild.classList.add("favorite-highlight");
            }
        });
        const ownAuctions = items.parentNode.getElementsByClassName("marketplace-table-row");
        for (const auction of ownAuctions) {
            let itemId = convertItemId(auction.childNodes[1].firstChild.src);
            if (this.storage.itemRequiresFallback(itemId)) {
                itemId = auction.childNodes[1].firstChild.alt;
            }
            auction.classList.toggle("favorite-highlight", this.isFavorite(itemId));
        }

    }

    quantileColorsButton() {
        if (document.getElementById("tracker-quantile-colors")) {
            return;
        }
        const trackerButtons = insertTrackerButtons();
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
            const itemIdsWithFallbacks = [];
            for (const item of items) {
                const itemId = convertItemId(item.firstChild.src);
                if (this.storage.itemRequiresFallback(itemId)) {
                    itemIdsWithFallbacks.push(item.firstChild.alt);
                } else {
                    itemIdsWithFallbacks.push(itemId);
                }
            }
            const priceQuantiles = this.storage.latestPriceQuantiles(itemIdsWithFallbacks);
            if (this.settings.quantileDisplay === "party") {
                this.partyMode(items, priceQuantiles);
            } else {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const quantile = priceQuantiles[i];
                    const color = this.getHSLColor(quantile);
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
            saveInsertAdjacentHTML(item, "beforeend", Templates.dotTemplate(this.settings.markerSize + "%", "quantile-dot", color));
        }
    }

    getHSLColor(quantile) {
        const hue = 120 * (1 - quantile);
        return `hsl(${hue}, 80%, 40%)`;
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
            const color = this.getHSLColor(quantile);
            item.style.border = `3px solid ${color}`;
            this.quantileDot(item, color);
            item.getElementsByClassName("item-icon")[0].style.filter = `drop-shadow(3px 3px 2px ${color})`;
        }
        setTimeout(() => {
            this.partyMode(items, priceQuantiles, (offset + 0.05) % 3);
        }, 100);
    }

    toggleFavoriteButton(buyContainer) {
        if (document.getElementById("marketplace-favorite-button")) {
            return;
        }
        const offer = buyContainer.getElementsByClassName("marketplace-table-row")[0];
        if (!offer) {
            // not loaded yet
            return;
        }
        let itemId = convertItemId(offer.childNodes[1].firstChild.src);
        if (this.storage.itemRequiresFallback(itemId)) {
            itemId = offer.firstChild.firstChild.textContent;
        }
        const isFavorite = this.isFavorite(itemId);
        const refreshButton = document.getElementsByClassName("marketplace-refresh-button")[0];
        saveInsertAdjacentHTML(
            refreshButton,
            "afterend",
            `
            <button id="marketplace-favorite-button" class="marketplace-favorite-button ${isFavorite ? "" : "svg-inactive"}">
                ${Templates.favoriteTemplate()}
            </button>`
        );
        let toggleFavoriteButton = document.getElementById("marketplace-favorite-button");
        toggleFavoriteButton.addEventListener("click", () => {
            this.toggleFavorite(itemId);
            toggleFavoriteButton.classList.toggle("svg-inactive");
            this.saveData();
        });
    }

    highlightBestHeatItem(items) {
        const bestHeatItem = this.storage.bestHeatItem();
        items.childNodes.forEach((itemNode) => {
            const itemId = convertItemId(itemNode.firstChild.firstChild.src);
            if (itemId === bestHeatItem && !itemNode.firstChild.classList.contains("heat-highlight")) {
                itemNode.firstChild.classList.add("heat-highlight");
                saveInsertAdjacentHTML(
                    itemNode.firstChild,
                    "beforeend",
                    `<img src=/images/heat_icon.png style="position: absolute; top: 0px; right: 0px; width: ${this.settings.markerSize}%; height: ${this.settings.markerSize}%;">`
                );
            } else if (itemId !== bestHeatItem && itemNode.firstChild.classList.contains("heat-highlight")) {
                itemNode.firstChild.classList.remove("heat-highlight");
                itemNode.firstChild.removeChild(itemNode.firstChild.lastChild);
            }
        });
    }

    highlightAlertItems(items) {
        const alertIcons = document.getElementsByClassName("alert-icon");
        for (let i = alertIcons.length - 1; i >= 0; i--) {
            alertIcons[i].remove();
        }
        items.childNodes.forEach((itemNode) => {
            let itemId = convertItemId(itemNode.firstChild.firstChild.src);
            if (this.storage.itemRequiresFallback(itemId)) {
                itemId = itemNode.firstChild.firstChild.alt;
            }
            if (this.notificationInformation[itemId] === "below" && !itemNode.firstChild.classList.contains("alert-below")) {
                saveInsertAdjacentHTML(
                    itemNode.firstChild,
                    "beforeend",
                    `
                    <div class="alert-icon below" style="width:${this.settings.markerSize}%; height:${this.settings.markerSize}%;">
                        ${Templates.arrowDownTemplate()}
                    </div>`
                );
            } else if (this.notificationInformation[itemId] === "above" && !itemNode.firstChild.classList.contains("alert-above")) {
                saveInsertAdjacentHTML(
                    itemNode.firstChild,
                    "beforeend",
                    `
                    <div class="alert-icon above" style="width:${this.settings.markerSize}%; height:${this.settings.markerSize}%;">
                        ${Templates.arrowDownTemplate()}
                    </div>`
                );
            }
        });
    }

    isFavorite(itemId) {
        return this.favorites.indexOf(itemId) > -1;
    }

    toggleFavorite(itemId) {
        const isFavorite = this.isFavorite(itemId);
        if (isFavorite) {
            this.favorites.splice(this.favorites.indexOf(itemId), 1);
        } else {
            this.favorites.push(itemId);
        }
        return !isFavorite;
    }

    saveData() {
        localStorage.setItem("favorites", JSON.stringify(this.favorites));
    }
}
