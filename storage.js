class Storage {
    constructor(APICallback) {
        this.APICallback = APICallback;
        this.itemList = this.loadLocalStorage('itemList', {});
        this.filterItemList();

        this.idMap = this.loadLocalStorage('idMap', {
            "money_icon": 1,
            "heat_icon": 2,
        });

        this.lastLogin = this.loadLocalStorage('lastLogin', Date.now());

        this.fetchAPI();
        const apiFetch = setInterval(() => this.fetchAPI(), 1000 * 60 * 10); // 10 minutes
    }

    getLastLogin() {
        return this.lastLogin;
    }

    handleClose() {
        this.storeItemList();
    }

    handleApiData(data) {
        const timestamp = Math.floor(Date.now() / 1000 / 60 / 10);
        for (let i = 0; i < data.length; i++) {
            // data[i].itemID == apiId
            if (!(data[i].itemID in this.itemList)) {
                this.itemList[data[i].itemID] = {};
                this.itemList[data[i].itemID]["name"] = data[i].name
                this.itemList[data[i].itemID]["prices"] = [];
            }
            this.itemList[data[i].itemID]["prices"].push([timestamp, data[i].minPrice]);
            this.sortPriceList(data[i].itemID);
            this.itemList[data[i].itemID]["latestPrice"] = data[i].minPrice;
        }
        const currentHeatValue = this.heatValue();
        this.itemList[2]["prices"].push([timestamp, currentHeatValue.heatValue]);
        this.sortPriceList(2);
        this.itemList[2]["latestPrice"] = currentHeatValue.heatValue;
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
                const latestPrice = this.itemList[heatItem.apiId]["latestPrice"];
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

    updateIdMap(map) {
        for (let i = 0; i < map.length; i++) {
            if (map[i].apiId in this.itemList) {
                // itemId -> apiId
                this.idMap[map[i].itemId] = map[i].apiId;
                // apiId -> itemId
                this.itemList[map[i].apiId].itemId = map[i].itemId;
            }
        }
        this.storeIdMap();
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

    storeIdMap() {
        this.idMap = sortObj(this.idMap);
        localStorage.setItem('idMap', JSON.stringify(this.idMap));
    }

    getItemName(itemId) {
        if (!(itemId in this.idMap)) {
            return null;
        }
        const apiId = this.idMap[itemId];
        return this.itemList[apiId]["name"];
    }

    analyzeItem(itemId) {
        if (!(itemId in this.idMap)) {
            return {
                minPrice: NaN,
                medianPrice: NaN,
                maxPrice: NaN,
            }
        }
        const apiId = this.idMap[itemId];
        const minQuantile = Math.floor((this.itemList[apiId]["prices"].length - 1) * 0.05);
        const medianQuantile = Math.floor((this.itemList[apiId]["prices"].length - 1) * 0.5);
        const maxQuantile = Math.floor((this.itemList[apiId]["prices"].length - 1) * 0.95);
        return {
            minPrice: this.itemList[apiId]["prices"][minQuantile][1],
            medianPrice: this.itemList[apiId]["prices"][medianQuantile][1],
            maxPrice: this.itemList[apiId]["prices"][maxQuantile][1]
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
                return this.itemList[apiId]["latestPrice"];
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
                const index = this.itemList[apiId]["prices"].findLastIndex(priceTuple => priceTuple[1] == this.itemList[apiId]["latestPrice"]);
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
            if (Object.keys(this.itemList[apiId]["prices"]).length === 0) {
                delete this.itemList[apiId];
            }
        }
        this.addHardcodedItems();
    }

    addHardcodedItems() {
        if (!(1 in this.itemList)) {
            this.itemList[1] = {
                "name": "Gold",
                "itemId": "money_icon",
                "prices": [[0, 1]]
            };
        }
        if (!(2 in this.itemList)) {
            this.itemList[2] = {
                "name": "Heat",
                "itemId": "heat_icon",
                "prices": []
            };
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
}
