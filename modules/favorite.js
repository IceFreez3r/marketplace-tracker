class FavoriteTracker {
    static id = "favorite_tracker"
    static displayName = "Favorite Tracker";
    static icon = FavoriteTracker.favoriteTemplate();
    static category = "economy";
    css = `
.tracker-favorite-filter-svg {
    width: 33px;
    height: 33px;
    margin-left: 1px;
    margin-right: 1px;
    padding: 1px;
    cursor: pointer;
}

.filter-active {
    fill: rgb(255, 255, 0);
}

.favorite-highlight {
    border: 3px solid white;
}

/* identical to vanilla .marketplace-refresh-button */
.marketplace-favorite-button {
    margin-top: 8px;
    color: #fff;
    height: 45px;
    width: 100px;
    background: linear-gradient(180deg,rgba(72,85,99,.8431372549019608),rgba(41,50,60,.6039215686274509));
}

.marketplace-favorite-button.is-favorite {
    fill: rgb(255, 255, 0);
}

.marketplace-favorite-button:not(.is-favorite) {
    fill: none;
}

.marketplace-favorite-button.is-favorite > span {
    display: none;
}
    `;

    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        this.cssNode = injectCSS(this.css);
        
        this.favorites = loadLocalStorage('favorites', []);
        this.filterActive = false;

        this.observer = new MutationObserver(mutations => {
            const selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab')[0];
            if (!selectedSkill) {
                return;
            }
            if (selectedSkill.innerText !== 'Marketplace') {
                this.filterActive = false;
                return;
            }
            this.favoriteTracker();
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

    // Determines current subpage of the marketplace
    favoriteTracker() {
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
        let filter = document.getElementById('tracker-favorite-filter');
        if (filter) {
            const daelsFilter = document.querySelector('.daelis-marketplace-filter:not(.recognized)');
            if (daelsFilter) {
                filter.remove();
                daelsFilter.classList.add('recognized');
            } else {
                return;
            }
        }
        const sortingContainer = document.getElementsByClassName('market-sorting-container')[0];
        saveInsertAdjacentHTML(sortingContainer.firstChild, 'afterend', `
<div id="tracker-favorite-filter" class="${this.filterActive ? "filter-active" : ""}">
    ${FavoriteTracker.favoriteTemplate("tracker-favorite-filter-svg")}
</div>
        `);
        filter = document.getElementById('tracker-favorite-filter');
        filter.addEventListener('click', () => {
            filter.classList.toggle('filter-active');
            this.filterActive = !this.filterActive;
            this.filterFavorites();
        });
    }

    filterFavorites() {
        let notFavorites = document.querySelectorAll('.marketplace-content .item:not(.favorite-highlight)');
        for (let i = 0; i < notFavorites.length; i++) {
            notFavorites[i].parentNode.classList.toggle('hidden', this.filterActive);
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
<button id="marketplace-favorite-button" class="marketplace-favorite-button ${isFavorite ? 'is-favorite' : ''}">
    ${FavoriteTracker.favoriteTemplate()}
    <span>not</span>
    FAV
</button>
        `);
        let toggleFavoriteButton = document.getElementById("marketplace-favorite-button");
        toggleFavoriteButton.addEventListener('click', () => {
            this.toggleFavorite(itemId);
            toggleFavoriteButton.classList.toggle('is-favorite');
            this.saveData();
        });
    }

    static favoriteTemplate(classes = "") {
        return `
<svg class="${classes}" stroke="yellow" stroke-width="30px" x="0px" y="0px" width="24px" heigth="24px" viewBox="-15 -10 366 366">
    <path d="M329.208,126.666c-1.765-5.431-6.459-9.389-12.109-10.209l-95.822-13.922l-42.854-86.837  c-2.527-5.12-7.742-8.362-13.451-8.362c-5.71,0-10.925,3.242-13.451,8.362l-42.851,86.836l-95.825,13.922  c-5.65,0.821-10.345,4.779-12.109,10.209c-1.764,5.431-0.293,11.392,3.796,15.377l69.339,67.582L57.496,305.07  c-0.965,5.628,1.348,11.315,5.967,14.671c2.613,1.899,5.708,2.865,8.818,2.865c2.387,0,4.784-0.569,6.979-1.723l85.711-45.059  l85.71,45.059c2.208,1.161,4.626,1.714,7.021,1.723c8.275-0.012,14.979-6.723,14.979-15c0-1.152-0.13-2.275-0.376-3.352  l-16.233-94.629l69.339-67.583C329.501,138.057,330.972,132.096,329.208,126.666z">
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
