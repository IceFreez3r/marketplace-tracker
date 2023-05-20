class Storage {
    constructor(APICallback) {
        this.APICallback = APICallback;
        this.itemList = this.loadLocalStorage('itemList', {});
        this.filterItemList();
        this.latestPriceList = {};

        this.lastLogin = this.loadLocalStorage('lastLogin', Date.now());
        this.latestAPIFetch = this.loadLocalStorage('TrackerLatestAPIFetch', 0);
    }

    async onGameReady() {
        const vanillaItemsList = window.wrappedJSObject?.Idlescape.data.items ?? window.Idlescape.data.items;
        this.idMap = {};
        for (const item in vanillaItemsList) {
            this.itemList[item] ??= {
                prices: [],
            };
            if (vanillaItemsList[item].itemImage) {
                const itemImage = convertItemId(vanillaItemsList[item].itemImage);
                if (this.idMap[itemImage] !== undefined) {
                    // Add fallback for itemImages that are used by multiple items
                    this.idMap[vanillaItemsList[item].name] = item;
                    if (this.idMap[itemImage] !== -1) {
                        this.idMap[vanillaItemsList[this.idMap[itemImage]].name] = this.idMap[itemImage];
                        // prevent getting the wrong item
                        this.idMap[itemImage] = -1;
                    }
                } else {
                    this.idMap[itemImage] = item;
                }
                this.itemList[item].itemImage = itemImage;
            }
            if (vanillaItemsList[item].itemIcon) {
                const itemIcon = convertItemId(vanillaItemsList[item].itemIcon);
                this.idMap[itemIcon] = item;
                this.itemList[item].itemIcon = itemIcon;
            }
            this.itemList[item].name = vanillaItemsList[item].name;
            this.itemList[item].vendorPrice = vanillaItemsList[item].value;
        }
        this.fetchAPILoop();
    }

    getLastLogin() {
        return this.lastLogin;
    }

    handleApiData(data) {
        const timestamp = Math.floor(new Date(data.timestamp).valueOf() / 1000 / 60 / 10);
        this.latestPriceList = {};
        data = data.manifest;
        for (let i = 0; i < data.length; i++) {
            const apiId = data[i].itemID;
            if (this.latestAPIFetch !== timestamp) {
                // prevent duplicate entries
                this.itemList[apiId].prices.push([timestamp, data[i].minPrice]);
                this.sortPriceList(apiId);
            }
            this.latestPriceList[apiId] = data[i].minPrice;
        }
        const currentHeatValue = this.heatValue();
        if (this.latestAPIFetch !== timestamp) {
            // prevent duplicate entries
            this.itemList[2].prices.push([timestamp, currentHeatValue.heatValue]);
            this.sortPriceList(2);
            this.storeItemList();
        }
        this.latestPriceList[2] = currentHeatValue.heatValue;
        this.latestAPIFetch = timestamp;
        localStorage.setItem("TrackerLatestAPIFetch", timestamp);
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
        // Reduce the size of the stored itemList by removing items that have no prices
        const itemList = Object.keys(this.itemList).reduce((result, key) => {
            if (this.itemList[key].prices.length > 0) {
                result[key] = this.itemList[key];
            }
            return result;
        }, {});
        localStorage.setItem('itemList', JSON.stringify(itemList));
    }

    getItemName(itemId) {
        if (!(itemId in this.idMap)) {
            return null;
        }
        const apiId = this.idMap[itemId];
        if (apiId === -1) return "Duplicate Item";
        return this.itemList[apiId].name;
    }

    itemRequiresFallback(itemId) {
        return !itemId in this.idMap || this.idMap[itemId] === -1;
    }

    analyzeItem(itemId) {
        if (itemId === 'money_icon') {
            return {
                minPrice: 1,
                medianPrice: 1,
                maxPrice: 1,
                vendorPrice: NaN,
            };
        }
        if (itemId.endsWith('_essence')) {
            const talismanAnalysis = this.analyzeItem(itemId.replace('_essence', '_talisman'));
            const essencePerTalisman = (35000 + 50000) / 2;
            return {
                minPrice: talismanAnalysis.minPrice / essencePerTalisman,
                medianPrice: talismanAnalysis.medianPrice / essencePerTalisman,
                maxPrice: talismanAnalysis.maxPrice / essencePerTalisman,
                vendorPrice: NaN,
            };
        }
        const apiId = this.idMap[itemId];
        if (apiId === -1 || this.itemList[apiId].prices.length === 0) {
            return {
                minPrice: NaN,
                medianPrice: NaN,
                maxPrice: NaN,
                vendorPrice: NaN,
            };
        }
        const minQuantile = Math.floor((this.itemList[apiId].prices.length - 1) * 0.05);
        const medianQuantile = Math.floor((this.itemList[apiId].prices.length - 1) * 0.5);
        const maxQuantile = Math.floor((this.itemList[apiId].prices.length - 1) * 0.95);
        return {
            minPrice: this.itemList[apiId].prices[minQuantile][1],
            medianPrice: this.itemList[apiId].prices[medianQuantile][1],
            maxPrice: this.itemList[apiId].prices[maxQuantile][1],
            vendorPrice: this.itemList[apiId].vendorPrice,
        };
    }

    analyzeItems(itemIds) {
        const analysisArray = itemIds.map(itemId => this.analyzeItem(itemId));
        return {
            minPrices: analysisArray.map(analysis => analysis.minPrice),
            medianPrices: analysisArray.map(analysis => analysis.medianPrice),
            maxPrices: analysisArray.map(analysis => analysis.maxPrice),
            vendorPrices: analysisArray.map(analysis => analysis.vendorPrice),
        };
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
                return this.latestPriceList[apiId] ?? NaN;
            })(itemId);
        }
        return prices;
    }

    /**
     * @param {Array} itemIdsWithFallbacks Array of itemIds or their fallback
     * @returns {Object} Object with pairs of itemIds and their latest price quantiles
     */
    latestPriceQuantiles(itemIdsWithFallbacks) {
        const quantiles = [];
        for (const itemId of itemIdsWithFallbacks) {
            const apiId = this.idMap[itemId];
            if (apiId === -1 || this.itemList[apiId].prices.length <= 1) {
                quantiles.push(1);
                continue;
            }
            const index = this.itemList[apiId].prices.findLastIndex((priceTuple) => priceTuple[1] === this.latestPriceList[apiId]);
            if (index === -1) {
                quantiles.push(1);
                continue;
            }
            const quantile = index / (this.itemList[apiId].prices.length - 1);
            quantiles.push(quantile);
        }
        return quantiles;
    }

    sortPriceList(apiId) {
        // Sort the price tuples by price
        this.itemList[apiId].prices.sort((a, b) => {
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

    fetchAPILoop() {
        this.fetchAPI().then((lastAPITimestamp) => {
            let timeUntilNextUpdate;
            if (lastAPITimestamp === null) {
                timeUntilNextUpdate = 1000 * 60 * 10;
            } else {
                // last api timestamp + 20 minutes - now
                timeUntilNextUpdate = new Date(lastAPITimestamp).valueOf() + 1000 * 60 * 10 * 2 - Date.now();
            }
            setTimeout(() => {
                this.fetchAPILoop();
            }, timeUntilNextUpdate + 1000 * 10);
        });
    }

    fetchAPI() {
        const apiUrl = window.location.origin + "/api/market/manifest";
        const lastAPITimestamp = fetch(apiUrl)
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                if (data.status === "Success") {
                    this.handleApiData(data);
                    return data.timestamp;
                } else {
                    console.error("Error fetching API data. Status: " + data.status);
                    return null;
                }
            })
            .catch((err) => {
                console.error(err);
                return null;
            });
        this.APICallback();
        return lastAPITimestamp;
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
