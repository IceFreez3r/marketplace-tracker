class MarketHighlights {
    static id = "market_highlights";
    static displayName = "Market Highlights";
    static icon = MarketHighlights.favoriteTemplate(); // TODO
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
.quantile-borders .favorite-highlight {
    box-shadow: 0 0 0 3px white;
}

.quantile-borders .heat-highlight {
    box-shadow: 0 0 0 3px red;
}

.favorite-highlight.heat-highlight {
    border: 3px solid white;
    box-shadow: 0 0 0 3px red;
}

.quantile-borders .favorite-highlight.heat-highlight {
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
    `;

    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        if (this.settings.quantileDisplay === undefined) {
            this.settings.quantileDisplay = "dot";
        }
        this.cssNode = injectCSS(this.css);
        
        this.favorites = loadLocalStorage('favorites', []);
        this.favoriteFilterActive = false;
        this.quantileColorsActive = false;

        this.observer = new MutationObserver(mutations => {
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
        let moduleSetting = document.createElement('div');
        moduleSetting.classList.add('tracker-module-setting');
        moduleSetting.insertAdjacentHTML('beforeend', `
<div class="tracker-module-setting-name">
    Quantile display
</div>
        `);
        moduleSetting.append(this.tracker.selectMenu(MarketHighlights.id + "-quantileDisplay", {
            off: "Off",
            border: "Border",
            dot: "Dot",
            party: "Let my eyes bleed",
        }, this.settings.quantileDisplay));
        return moduleSetting;
    }

    settingChanged(settingId, value) {
        return;
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
    ${MarketHighlights.favoriteTemplate("tracker-highlight-button")}
</div>
        `);
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
    ${MarketHighlights.colorTemplate("tracker-highlight-button")}
</div>
        `);
        const filter = document.getElementById('tracker-quantile-colors');
        filter.addEventListener('click', () => {
            filter.classList.toggle('svg-inactive');
            this.quantileColorsActive = !this.quantileColorsActive;
            this.quantileColors();
        });
    }

    quantileColors() {
        let items = document.querySelectorAll('.marketplace-content .item');
        if (this.quantileColorsActive) {
            const priceQuantiles = storageRequest({
                type: "latest-price-quantiles"
            });
            for (let item of items) {
                const itemId = convertItemId(item.firstChild.src);
                item.style.backgroundImage = "url(/images/ui/frame_icon.png), linear-gradient(#1c2024, #1c2024)";
                if (this.settings.quantileDisplay === "border" || this.settings.quantileDisplay === "party") {
                    item.style.border = `3px solid ${this.getHSLColor(priceQuantiles[itemId])}`;
                    document.getElementsByClassName('all-items')[0].classList.toggle('quantile-borders', this.quantileColorsActive);
                }
                if (this.settings.quantileDisplay === "dot" || this.settings.quantileDisplay === "party") {
                    item.insertAdjacentHTML('beforeend', `
<svg class="quantile-dot" style="position: absolute; bottom: 0px; right: 0px; width: 24px; height: 24px;">
    <circle cx="12" cy="12" r="8" fill="${this.getHSLColor(priceQuantiles[itemId])}" />
</svg>`);
                }
            }
        } else {
            for (let item of items) {
                item.style.backgroundImage = "";
                item.style.border = "";
                item.getElementsByClassName('quantile-dot')[0]?.remove();
            }
        }
    }

    getHSLColor(quantile) {
        const hue = 120 * (1 - quantile);
        return `hsl(${hue}, 80%, 40%)`;
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
    ${MarketHighlights.favoriteTemplate()}
    <span>not</span>
    FAV
</button>
        `);
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
                itemNode.firstChild.insertAdjacentHTML('beforeend', `<img src=/images/heat_icon.png style="position: absolute; top: 0px; right: 0px; width: 24px; height: 24px;">`);
            } else if (itemId !== bestHeatItem && itemNode.firstChild.classList.contains('heat-highlight')) {
                itemNode.firstChild.classList.remove("heat-highlight");
                itemNode.firstChild.removeChild(itemNode.firstChild.lastChild);
            }
        });
    }

    static favoriteTemplate(classes = "") {
        return `
<svg class="${classes}" stroke="rgb(255,255,0)" stroke-width="30px" fill="rgb(255,255,0)" x="0px" y="0px" width="24px" heigth="24px" viewBox="-15 -10 366 366">
    <path d="M329.208,126.666c-1.765-5.431-6.459-9.389-12.109-10.209l-95.822-13.922l-42.854-86.837  c-2.527-5.12-7.742-8.362-13.451-8.362c-5.71,0-10.925,3.242-13.451,8.362l-42.851,86.836l-95.825,13.922  c-5.65,0.821-10.345,4.779-12.109,10.209c-1.764,5.431-0.293,11.392,3.796,15.377l69.339,67.582L57.496,305.07  c-0.965,5.628,1.348,11.315,5.967,14.671c2.613,1.899,5.708,2.865,8.818,2.865c2.387,0,4.784-0.569,6.979-1.723l85.711-45.059  l85.71,45.059c2.208,1.161,4.626,1.714,7.021,1.723c8.275-0.012,14.979-6.723,14.979-15c0-1.152-0.13-2.275-0.376-3.352  l-16.233-94.629l69.339-67.583C329.501,138.057,330.972,132.096,329.208,126.666z">
</svg>
        `;
    }

    static colorTemplate(classes = "") {
        return `
<svg class="${classes}" viewbox="0 0 100 100" style="stroke:rgb(255,255,255); stroke-width:8px; fill:black;">
    <rect class="rect-third" x="5" y="8" width="50" height="50" rx="5" ry="5"/>
    <rect class="rect-second" x="34" y="18" width="50" height="50" rx="5" ry="5"/>
    <rect class="rect-first" x="12" y="38" width="50" height="50" rx="5" ry="5"/>
</svg>
        `;
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
