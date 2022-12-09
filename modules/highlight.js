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

/* identical to vanilla .marketplace-refresh-button */
.marketplace-favorite-button {
    margin-top: 8px;
    color: #fff;
    height: 45px;
    width: 100px;
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

    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        if (this.settings.quantileDisplay === undefined) {
            this.settings.quantileDisplay = "dot";
        }
        if (this.settings.markerSize === undefined) {
            this.settings.markerSize = 40;
        }
        this.cssNode = injectCSS(this.css);
        
        this.favorites = loadLocalStorage('favorites', []);
        this.favoriteFilterActive = false;
        this.quantileColorsActive = false;

        this.playAreaObserver = new MutationObserver(mutations => {
            // TODO: define global detectInfiniteLoop function in utility.js
            if (mutations[0].target.classList.contains("price")) {
                // prevent infinite loop when user also uses inventory prices from Dael
                return;
            }
            for (let addedNode of mutations[0].addedNodes) {
                if (addedNode.classList && (addedNode.classList.contains("heat-highlight") || addedNode.classList.contains("quantile-dot"))) {
                    return;
                }
            }
            const selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab')[0];
            if (!selectedSkill) {
                return;
            }
            if (selectedSkill.innerText !== 'Marketplace') {
                this.favoriteFilterActive = false;
                this.quantileColorsActive = false;
                return;
            }
            this.highlight();
        });
    }
    
    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
    }

    settingsMenuContent() {
        let quantileDisplay = document.createElement('div');
        quantileDisplay.classList.add('tracker-module-setting');
        quantileDisplay.insertAdjacentHTML('beforeend', `
            <div class="tracker-module-setting-name">
                Quantile display
            </div>`);
        quantileDisplay.append(Templates.selectMenu(MarketHighlights.id + "-quantileDisplay", {
            off: "Off",
            border: "Border",
            dot: "Dot",
            shadow: "Shadow",
            party: "Let my eyes bleed",
        }, this.settings.quantileDisplay));
        let markerSize = document.createElement('div');
        markerSize.classList.add('tracker-module-setting');
        markerSize.insertAdjacentHTML('beforeend', `
            <div class="tracker-module-setting-name">
                Marker size
            </div>
            <div class="marker-size-slider">
                ${Templates.sliderTemplate(MarketHighlights.id + "-markerSize", [15, 70], this.settings.markerSize)}
                <div class="marker-size-preview item gem" data-tip="true" data-for="marketplaceBuyItemTooltip50" style="background-image: url('/images/ui/frame_icon.png'), linear-gradient(rgb(28, 32, 36), rgb(28, 32, 36));">
                    <img class="item-icon" src="/images/misc/book.png" alt="Book">
                    ${Templates.dotTemplate(this.settings.markerSize + "%", "quantile-dot")}
                </div>
            </div>`);
        // add onchange listener to slider
        let slider = markerSize.querySelector("input");
        slider.addEventListener("input", this.updatePreview.bind(this));
        return [quantileDisplay, markerSize];
    }

    settingChanged(settingId, value) {
        return;
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
        // Sell Page
        let items = document.getElementsByClassName('marketplace-sell-items')[0];
        if (items) {
            this.highlightFavorites(items);
            this.filterFavoritesButton();
            this.filterFavorites();
            return;
        }
        // Overview Page
        items = document.getElementsByClassName('marketplace-content')[0];
        if (items) {
            items = items.firstChild;
            this.highlightFavorites(items);
            this.filterFavoritesButton();
            this.filterFavorites();
            if (this.settings.quantileDisplay !== "off") {
                this.quantileColorsButton();
                this.quantileColors();
            }
            this.highlightBestHeatItem(items);
            return;
        }
        // Buy page
        let buyHeader = document.getElementsByClassName('marketplace-buy-item-top')[0];
        if (buyHeader) {
            this.toggleFavoriteButton(buyHeader.parentNode);
            return;
        }
    }

    filterFavoritesButton() {
        if (document.getElementById('tracker-favorite-filter')) {
            return;
        }
        const sortingContainer = document.getElementsByClassName('market-sorting-container')[0];
        saveInsertAdjacentHTML(sortingContainer.firstChild, 'afterend', `
            <div id="tracker-favorite-filter" class="${this.favoriteFilterActive ? "" : "svg-inactive"}">
                ${Templates.favoriteTemplate("tracker-highlight-button")}
            </div>`);
        const filter = document.getElementById('tracker-favorite-filter');
        filter.addEventListener('click', () => {
            filter.classList.toggle('svg-inactive');
            this.favoriteFilterActive = !this.favoriteFilterActive;
            this.filterFavorites();
        });
    }

    filterFavorites() {
        let notFavorites = document.querySelectorAll('.marketplace-content .item:not(.favorite-highlight)');
        for (let i = 0; i < notFavorites.length; i++) {
            notFavorites[i].parentNode.classList.toggle('hidden', this.favoriteFilterActive);
        }
    }

    highlightFavorites(items) {
        items.childNodes.forEach((itemNode) => {
            const itemId = convertItemId(itemNode.firstChild.firstChild.src);
            if (this.isFavorite(itemId)) {
                itemNode.firstChild.classList.add("favorite-highlight");
            }
        });
    }

    quantileColorsButton() {
        if (document.getElementById('tracker-quantile-colors')) {
            return;
        }
        const sortingContainer = document.getElementsByClassName('market-sorting-container')[0];
        saveInsertAdjacentHTML(sortingContainer.firstChild, 'afterend', `
            <div id="tracker-quantile-colors" class="${this.quantileColorsActive ? "" : "svg-inactive"}">
                ${Templates.colorTemplate("tracker-highlight-button")}
            </div>`);
        const filter = document.getElementById('tracker-quantile-colors');
        filter.addEventListener('click', () => {
            filter.classList.toggle('svg-inactive');
            this.quantileColorsActive = !this.quantileColorsActive;
            this.quantileColors();
        });
    }

    quantileColors() {
        let items = document.querySelectorAll('.marketplace-content .item');
        if (items.length === 0) {
            return;
        }
        if (this.quantileColorsActive) {
            const priceQuantiles = storageRequest({
                type: "latest-price-quantiles"
            });
            for (let item of items) {
                const itemId = convertItemId(item.firstChild.src);
                const quantile = priceQuantiles[itemId];
                item.style.backgroundImage = "url(/images/ui/frame_icon.png), linear-gradient(#1c2024, #1c2024)";
                if (this.settings.quantileDisplay === "dot") {
                    // TODO: Adjust dot size with setting
                    item.insertAdjacentHTML('beforeend', Templates.dotTemplate(this.settings.markerSize + "%", "quantile-dot", this.getHSLColor(quantile)));
                }
                else if (this.settings.quantileDisplay === "border") {
                    item.style.border = `3px solid ${this.getHSLColor(quantile)}`;
                    item.classList.toggle('quantile-borders', this.quantileColorsActive);
                }
                else if (this.settings.quantileDisplay === "shadow") {
                    item.getElementsByClassName('item-icon')[0].style.filter = `drop-shadow(3px 3px 2px ${this.getHSLColor(quantile)})`;
                }
                else if (this.settings.quantileDisplay === "party") {
                    item.insertAdjacentHTML('beforeend', Templates.dotTemplate(this.settings.markerSize + "%", "quantile-dot", this.getHSLColor(quantile)));
                    item.classList.toggle('quantile-borders', this.quantileColorsActive);
                    this.partyMode(item, quantile);
                }
            }
        } else {
            for (let item of items) {
                item.style.backgroundImage = "";
                item.style.border = "";
                item.getElementsByClassName('item-icon')[0].style.filter = "";
                item.getElementsByClassName('quantile-dot')[0]?.remove();
                item.classList.toggle('quantile-borders', this.quantileColorsActive);
            }
        }
    }

    getHSLColor(quantile) {
        const hue = 120 * (1 - quantile);
        return `hsl(${hue}, 80%, 40%)`;
    }

    partyMode(item, quantile) {
        item.style.border = `3px solid ${this.getHSLColor(quantile)}`;
        item.getElementsByClassName('quantile-dot')[0].firstElementChild.style.fill = this.getHSLColor(quantile);
        item.getElementsByClassName('item-icon')[0].style.filter = `drop-shadow(3px 3px 2px ${this.getHSLColor(quantile)})`;
        quantile = (quantile + 0.05) % 3;
        setTimeout(() => {
            this.partyMode(item, quantile);
        }, 100);
    }

    toggleFavoriteButton(buyContainer) {
        if (document.getElementById("marketplace-favorite-button")) {
            return;
        }
        let offer = buyContainer.getElementsByTagName('tbody')[0].getElementsByTagName('tr')[0];
        if (!offer) { // not loaded yet
            return;
        }
        const itemId = convertItemId(offer.childNodes[1].firstChild.src);
        const isFavorite = this.isFavorite(itemId);
        const refreshButton = document.getElementById("marketplace-refresh-button");
        saveInsertAdjacentHTML(refreshButton, 'afterend', `
            <button id="marketplace-favorite-button" class="marketplace-favorite-button ${isFavorite ? '' : 'svg-inactive'}">
                ${Templates.favoriteTemplate()}
                <span>not</span>
                FAV
            </button>`);
        let toggleFavoriteButton = document.getElementById("marketplace-favorite-button");
        toggleFavoriteButton.addEventListener('click', () => {
            this.toggleFavorite(itemId);
            toggleFavoriteButton.classList.toggle('svg-inactive');
            this.saveData();
        });
    }

    highlightBestHeatItem(items) {
        const bestHeatItem = storageRequest({
            type: 'get-best-heat-item',
        });
        items.childNodes.forEach((itemNode) => {
            const itemId = convertItemId(itemNode.firstChild.firstChild.src);
            if (itemId === bestHeatItem && !itemNode.firstChild.classList.contains('heat-highlight')) {
                itemNode.firstChild.classList.add("heat-highlight");
                itemNode.firstChild.insertAdjacentHTML('beforeend', `<img src=/images/heat_icon.png style="position: absolute; top: 0px; right: 0px; width: ${this.settings.markerSize}%; height: ${this.settings.markerSize}%;">`);
            } else if (itemId !== bestHeatItem && itemNode.firstChild.classList.contains('heat-highlight')) {
                itemNode.firstChild.classList.remove("heat-highlight");
                itemNode.firstChild.removeChild(itemNode.firstChild.lastChild);
            }
        });
    }
    
    isFavorite(itemId) {
        return this.favorites.indexOf(itemId) > -1
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
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
    }
}
