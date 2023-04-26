class Storage {
    constructor(APICallback) {
        this.APICallback = APICallback;
        this.itemList = this.loadLocalStorage('itemList', {});
        this.filterItemList();
        this.latestPriceList = {};

        this.lastLogin = this.loadLocalStorage('lastLogin', Date.now());

        this.fetchAPI();
        const apiFetch = setInterval(() => this.fetchAPI(), 1000 * 60 * 10); // 10 minutes
    }

    onGameReady() {
        const vanillaItemsList = window.wrappedJSObject?.Idlescape.data.items ?? window.Idlescape.data.items;
        this.idMap = Object.values(vanillaItemsList).reduce((acc, item) => {
            const itemId = convertItemId(item.itemImage);
            const apiId = item.id;
            if (!this.itemList[apiId]) {
                this.itemList[apiId] = {
                    itemId: itemId,
                    name: item.name,
                    prices: [],
                };
            }
            acc[itemId] = apiId;
            return acc;
        }, {});
    }

    getLastLogin() {
        return this.lastLogin;
    }

    handleClose() {
        this.storeItemList();
    }

    handleApiData(data) {
        const timestamp = Math.floor(Date.now() / 1000 / 60 / 10);
        this.latestPriceList = {};
        for (let i = 0; i < data.length; i++) {
            const apiId = data[i].itemID;
            this.itemList[apiId]["prices"].push([timestamp, data[i].minPrice]);
            this.sortPriceList(apiId);
            this.latestPriceList[apiId] = data[i].minPrice;
        }
        const currentHeatValue = this.heatValue();
        this.itemList[2]["prices"].push([timestamp, currentHeatValue.heatValue]);
        this.sortPriceList(2);
        this.latestPriceList[2] = currentHeatValue.heatValue;
    }

    bestHeatItem() {
        const bestHeatItem = this.heatValue().apiId;
        return this.itemList[bestHeatItem]?.itemId;
    }

    heatValue() {
        const heatItems = [
            {apiId: 50, heat: 50},      // Book
            {apiId: 112, heat: 10},     // Coal
            {apiId: 301, heat: 1},      // Branch
            {apiId: 302, heat: 5},      // Log
            {apiId: 303, heat: 10},     // Oak Log
            {apiId: 304, heat: 20},     // Willow Log
            {apiId: 305, heat: 70},     // Maple Log
            {apiId: 306, heat: 200},    // Yew Log
            {apiId: 307, heat: 350},    // Elder Log
            {apiId: 702, heat: 100},    // Pyre Log
            {apiId: 703, heat: 200},    // Oak Pyre Log
            {apiId: 704, heat: 400},    // Willow Pyre Log
            {apiId: 705, heat: 800},    // Maple Pyre Log
            {apiId: 706, heat: 3000},   // Yew Pyre Log
            {apiId: 707, heat: 5000},   // Elder Pyre Log
            {apiId: 11030, heat: 25},   // Rotten Driftwood
            {apiId: 11031, heat: 75},   // Sturdy Driftwood
            {apiId: 11036, heat: 125},  // Mystical Driftwood
        ];
        const bestHeatItem = heatItems.reduce((result, heatItem) => {
            if (heatItem.apiId in this.itemList) {
                const latestPrice = this.latestPriceList[heatItem.apiId];
                if (latestPrice / heatItem.heat < result.heatValue) {
                    result = {
                        apiId: heatItem.apiId,
                        heatValue: latestPrice / heatItem.heat,
                    };
                }
            }
            return result;
        }, {apiId: null, heatValue: Infinity});
        return bestHeatItem;
    }

    handleRecipe(ingredientItemIds, productItemId) {
        return {
            ingredients: this.analyzeItems(ingredientItemIds),
            product: this.analyzeItem(productItemId),
        };
    }

    storeItemList() {
        this.itemList = sortObj(this.itemList);
        localStorage.setItem('itemList', JSON.stringify(this.itemList));
    }

    getItemName(itemId) {
        if (!(itemId in this.idMap)) {
            return null;
        }
        const apiId = this.idMap[itemId];
        return this.itemList[apiId]["name"];
    }

    analyzeItem(itemId) {
        if (itemId === 'money_icon') {
            return {
                minPrice: 1,
                medianPrice: 1,
                maxPrice: 1,
            }
        }
        if (itemId.endsWith('_essence')) {
            const talismanAnalysis = this.analyzeItem(itemId.replace('_essence', '_talisman'));
            const essencePerTalisman = (35000 + 50000) / 2;
            return {
                minPrice: talismanAnalysis.minPrice / essencePerTalisman,
                medianPrice: talismanAnalysis.medianPrice / essencePerTalisman,
                maxPrice: talismanAnalysis.maxPrice / essencePerTalisman,
            }
        }
        if (!(itemId in this.idMap)) {
            return {
                minPrice: NaN,
                medianPrice: NaN,
                maxPrice: NaN,
            }
        }
        const apiId = this.idMap[itemId];
        const minQuantile = Math.floor((this.itemList[apiId]?.prices.length - 1) * 0.05);
        const medianQuantile = Math.floor((this.itemList[apiId]?.prices.length - 1) * 0.5);
        const maxQuantile = Math.floor((this.itemList[apiId]?.prices.length - 1) * 0.95);
        return {
            minPrice: this.itemList[apiId]?.prices[minQuantile][1],
            medianPrice: this.itemList[apiId]?.prices[medianQuantile][1],
            maxPrice: this.itemList[apiId]?.prices[maxQuantile][1]
        }
    }

    analyzeItems(itemIds) {
        const analysisArray = itemIds.map(itemId => this.analyzeItem(itemId));
        return {
            minPrices: analysisArray.map(analysis => analysis.minPrice),
            medianPrices: analysisArray.map(analysis => analysis.medianPrice),
            maxPrices: analysisArray.map(analysis => analysis.maxPrice),
        }
    }

    /**
     *
     * @returns {Object} Object with pairs of itemIds and their latest prices
     */
    latestPrices() {
        const prices = {};
        for (let itemId in this.idMap) {
            prices[itemId] = ((itemId) => {
                const apiId = this.idMap[itemId];
                if (!(apiId in this.itemList)) {
                    return NaN;
                }
                return this.latestPriceList[apiId];
            })(itemId);
        }
        return prices;
    }

    /**
     *
     * @returns {Object} Object with pairs of itemIds and their latest price quantiles
     */
    latestPriceQuantiles() {
        const quantiles = {};
        for (let itemId in this.idMap) {
            quantiles[itemId] = ((itemId) => {
                const apiId = this.idMap[itemId];
                if (!(apiId in this.itemList)) {
                    return 1;
                }
                const index = this.itemList[apiId]["prices"].findLastIndex(priceTuple => priceTuple[1] === this.latestPriceList[apiId]);
                if (index === -1) {
                    return 1;
                }
                const quantile = index / (this.itemList[apiId]["prices"].length - 1);
                return quantile;
            })(itemId);
        }
        return quantiles;
    }

    sortPriceList(apiId) {
        // Sort the price tuples by price
        this.itemList[apiId]["prices"].sort((a, b) => {
            return a[1] - b[1];
        });
    }

    filterItemList() {
        const twoWeeksAgo = Math.floor(Date.now() / 1000 / 60 / 10) - (14 * 24 * 6);
        const now = Math.floor(Date.now() / 1000 / 60 / 10);
        for (let apiId in this.itemList) {
            for (let i = 0; i < this.itemList[apiId]["prices"].length; i++) {
                // Second condition due to Issue #52 https://github.com/IceFreez3r/marketplace-tracker/issues/52
                if (this.itemList[apiId]["prices"][i][0] < twoWeeksAgo || this.itemList[apiId]["prices"][i][0] > now) {
                    this.itemList[apiId]["prices"].splice(i, 1);
                    i--;
                }
            }
        }
    }

    fetchAPI() {
        const apiUrl = window.location.origin + "/api/market/manifest";
        fetch(apiUrl)
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                if (data.status === "Success") {
                    this.handleApiData(data.manifest);
                } else {
                    console.error("Error fetching API data. Status: " + data.status);
                }
            })
            .catch((err) => {
                console.error(err);
            });
        this.APICallback();
    }

    loadLocalStorage(key, fallback) {
        const value = localStorage.getItem(key);
        if (value === null) {
            // if fallback is a function, call it
            if (typeof fallback === "function") {
                return fallback();
            }
            return fallback;
        }
        return JSON.parse(value);
    }

    importStorage(text) {
        try {
            const data = JSON.parse(text);
            // merge itemList
            for (let apiId in data.itemList) {
                if (apiId in this.itemList) {
                    // merge price arrays
                    for (let i = 0; i < data.itemList[apiId].prices.length; i++) {
                        if (!this.itemList[apiId].prices.some(priceTuple => priceTuple[0] === data.itemList[apiId].prices[i][0])) {
                            this.itemList[apiId].prices.push(data.itemList[apiId].prices[i]);
                        }
                    }
                    // sort price array
                    this.sortPriceList(apiId);
                } else {
                    this.itemList[apiId] = data.itemList[apiId];
                }
            }
            this.filterItemList();
            this.storeItemList();
            return "Imported marketplace data";
        }
        catch (err) {
            console.error(err);
            return "Something went wrong";
        }
    }

    exportStorage() {
        return JSON.stringify({
            itemList: this.itemList
        });
    }
}
