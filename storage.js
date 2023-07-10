class Storage {
    constructor(APICallback) {
        this.APICallback = APICallback;
        this.storageKeys = {
            marketHistory: "TrackerMarketHistory",
            lastLogin: "TrackerLastLogin",
            lastAPIFetch: "TrackerLastAPIFetch",
        };

        this.lastLogin = this.loadLocalStorage(this.storageKeys.lastLogin, Date.now());
        this.lastAPIFetch = this.loadLocalStorage(this.storageKeys.lastAPIFetch, 0);
        const storageHistory = this.loadLocalStorage(this.storageKeys.marketHistory, () => this.loadFromV1ItemList());
        this.marketHistory = this.processStorageHistory(storageHistory);
        this.filterItemList();

        this.itemNames = {};
        this.itemVendorPrices = {};
        this.heatItems = {};
        this.latestPriceList = {};
    }

    onGameReady() {
        const vanillaItemsList = window.wrappedJSObject?.Idlescape.data.items ?? window.Idlescape.data.items;
        this.idMap = {};
        for (const apiId in vanillaItemsList) {
            this.marketHistory[apiId] ??= [];
            let itemId;
            if (vanillaItemsList[apiId].itemImage) {
                itemId = convertItemId(vanillaItemsList[apiId].itemImage);
                this.addItemToIdMap(apiId, itemId, vanillaItemsList);
            }
            if (vanillaItemsList[apiId].itemIcon) {
                itemId = convertItemId(vanillaItemsList[apiId].itemIcon);
                this.addItemToIdMap(apiId, itemId, vanillaItemsList);
            }
            this.itemNames[apiId] = vanillaItemsList[apiId].name;
            this.itemVendorPrices[apiId] = vanillaItemsList[apiId].value;
            if (vanillaItemsList[apiId].heat) {
                this.heatItems[apiId] = {
                    heat: vanillaItemsList[apiId].heat,
                    itemId,
                };
            }
        }
        // this.fetchAPILoop();
        this.fetchAPI();
        setInterval(() => {
            this.fetchAPI();
        }, 1000 * 60 * 10);
    }

    addItemToIdMap(apiId, itemId, vanillaItemsList) {
        if (this.idMap[itemId] !== undefined) {
            // Add fallback for itemIds that are used by multiple items
            this.idMap[vanillaItemsList[apiId].name] = apiId;
            if (this.idMap[itemId] !== -1) {
                this.idMap[vanillaItemsList[this.idMap[itemId]].name] = this.idMap[itemId];
                // prevent getting the wrong item
                this.idMap[itemId] = -1;
            }
        } else {
            this.idMap[itemId] = apiId;
        }
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
            if (this.lastAPIFetch !== timestamp) {
                // prevent duplicate entries
                this.marketHistory[apiId].push([timestamp, data[i].minPrice]);
                this.sortPriceList(apiId);
            }
            this.latestPriceList[apiId] = data[i].minPrice;
        }
        const currentHeatValue = this.heatValue();
        if (this.lastAPIFetch !== timestamp) {
            // prevent duplicate entries
            this.marketHistory[2].push([timestamp, currentHeatValue.heatValue]);
            this.sortPriceList(2);
            this.storeItemList();
        }
        this.latestPriceList[2] = currentHeatValue.heatValue;
        this.lastAPIFetch = timestamp;
        localStorage.setItem(this.storageKeys.lastAPIFetch, timestamp);
    }

    bestHeatItem() {
        return this.heatValue().itemId;
    }

    heatValue() {
        const bestHeatItem = Object.keys(this.heatItems).reduce((result, heatItem) => {
            if (heatItem in this.latestPriceList) {
                const latestPrice = this.latestPriceList[heatItem];
                if (latestPrice / this.heatItems[heatItem].heat < result.heatValue) {
                    return {
                        itemId: this.heatItems[heatItem].itemId,
                        apiId: heatItem,
                        heatValue: latestPrice / this.heatItems[heatItem].heat,
                    };
                }
            }
            return result;
        }, { itemId: null, apiId: null, heatValue: Infinity });
        return bestHeatItem;
    }

    itemHeatValue(itemId) {
        const apiId = this.idMap[itemId];
        if (apiId in this.heatItems) {
            return this.latestPriceList[apiId] / this.heatItems[apiId].heat;
        }
        return Infinity;
    }

    handleRecipe(ingredientItemIds, productItemId) {
        return {
            ingredients: this.analyzeItems(ingredientItemIds),
            product: this.analyzeItem(productItemId),
        };
    }

    storeItemList() {
        // get the minimum timestamp of all entries
        const baseTimestamp = Object.keys(this.marketHistory).reduce((result, apiId) => {
            if (this.marketHistory[apiId].length > 0) {
                const timestamp = this.marketHistory[apiId][0][0];
                if (timestamp < result) {
                    return timestamp;
                }
            }
            return result;
        }, Infinity);
        // Reduce the size of the stored marketHistory by removing items that have no prices
        const history = Object.keys(this.marketHistory).reduce((result, apiId) => {
            if (this.marketHistory[apiId].length > 0) {
                result[apiId] = this.marketHistory[apiId].map((entry) => {
                    // reduce timestamp by the minimum timestamp to reduce memory usage
                    return [entry[0] - baseTimestamp, entry[1]];
                });
            }
            return result;
        }, {});
        try {
            localStorage.setItem(this.storageKeys.marketHistory, JSON.stringify({
                baseTimestamp,
                history: history,
            }));
        } catch (e) {
            console.log(e);
        }
    }

    getItemName(itemId) {
        if (!(itemId in this.idMap)) {
            return "Unknown Item";
        }
        const apiId = this.idMap[itemId];
        if (apiId === -1) return "Duplicate Item";
        return this.itemNames[apiId];
    }

    itemRequiresFallback(itemId) {
        return !itemId in this.idMap || this.idMap[itemId] === -1;
    }

    analyzeItem(itemId) {
        if (itemId === "money_icon") {
            return {
                minPrice: 1,
                medianPrice: 1,
                maxPrice: 1,
                vendorPrice: NaN,
            };
        }
        if (itemId.endsWith("_essence")) {
            const talismanAnalysis = this.analyzeItem(itemId.replace("_essence", "_talisman"));
            const essencePerTalisman = (35000 + 50000) / 2;
            return {
                minPrice: talismanAnalysis.minPrice / essencePerTalisman,
                medianPrice: talismanAnalysis.medianPrice / essencePerTalisman,
                maxPrice: talismanAnalysis.maxPrice / essencePerTalisman,
                vendorPrice: NaN,
            };
        }
        const apiId = this.idMap[itemId];
        if (apiId === -1) {
            return {
                minPrice: NaN,
                medianPrice: NaN,
                maxPrice: NaN,
                vendorPrice: NaN,
            };
        }
        if (this.marketHistory[apiId].length === 0) {
            return {
                minPrice: NaN,
                medianPrice: NaN,
                maxPrice: NaN,
                vendorPrice: this.itemVendorPrices[apiId],
            };
        }
        const minQuantile = Math.floor((this.marketHistory[apiId].length - 1) * 0.05);
        const medianQuantile = Math.floor((this.marketHistory[apiId].length - 1) * 0.5);
        const maxQuantile = Math.floor((this.marketHistory[apiId].length - 1) * 0.95);
        return {
            minPrice: this.marketHistory[apiId][minQuantile][1],
            medianPrice: this.marketHistory[apiId][medianQuantile][1],
            maxPrice: this.marketHistory[apiId][maxQuantile][1],
            vendorPrice: this.itemVendorPrices[apiId],
        };
    }

    analyzeItems(itemIds) {
        const analysisArray = itemIds.map((itemId) => this.analyzeItem(itemId));
        return {
            minPrices: analysisArray.map((analysis) => analysis.minPrice),
            medianPrices: analysisArray.map((analysis) => analysis.medianPrice),
            maxPrices: analysisArray.map((analysis) => analysis.maxPrice),
            vendorPrices: analysisArray.map((analysis) => analysis.vendorPrice),
        };
    }

    /**
     *
     * @returns {Object} Object with pairs of itemIds and their latest prices
     */
    latestPrices() {
        const prices = {};
        for (let itemId in this.idMap) {
            if (this.idMap[itemId] === -1) continue;
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
            if (apiId === -1 || this.marketHistory[apiId].length <= 1) {
                quantiles.push(1);
                continue;
            }
            const index = this.marketHistory[apiId].findLastIndex(
                (priceTuple) => priceTuple[1] === this.latestPriceList[apiId]
            );
            if (index === -1) {
                quantiles.push(1);
                continue;
            }
            const quantile = index / (this.marketHistory[apiId].length - 1);
            quantiles.push(quantile);
        }
        return quantiles;
    }

    sortPriceList(apiId) {
        // Sort the price tuples by price
        this.marketHistory[apiId].sort((a, b) => {
            return a[1] - b[1];
        });
    }

    filterItemList() {
        const twoWeeksAgo = Math.floor(Date.now() / 1000 / 60 / 10) - 14 * 24 * 6;
        const now = Math.floor(Date.now() / 1000 / 60 / 10);
        for (let apiId in this.marketHistory) {
            for (let i = 0; i < this.marketHistory[apiId].length; i++) {
                // Second condition due to Issue #52 https://github.com/IceFreez3r/marketplace-tracker/issues/52
                if (this.marketHistory[apiId][i][0] < twoWeeksAgo || this.marketHistory[apiId][i][0] > now) {
                    this.marketHistory[apiId].splice(i, 1);
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
        console.log("Fetching API. Current UTC time: " + new Date().toLocaleString("en-US", { timeZone: "UTC" }));
        return fetch(apiUrl)
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                if (data.status === "Success") {
                    this.handleApiData(data);
                    this.APICallback();
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
            if (data.itemList) {
                this.importOldData(data);
            } else {
                this.importNewData(data);
            }
            this.filterItemList();
            this.storeItemList();
            return "Imported marketplace data";
        } catch (err) {
            console.error(err);
            return "Something went wrong";
        }
    }

    loadFromV1ItemList() {
        const oldItemList = this.loadLocalStorage("itemList", {});
        for (const apiId in oldItemList) {
            oldItemList[apiId] = oldItemList[apiId].prices;
        }
        localStorage.removeItem("itemList");
        this.marketHistory = oldItemList;
        this.storeItemList();
        return oldItemList;
    }

    processStorageHistory(storageHistory) {
        // support for V2 storage format
        if (storageHistory.baseTimestamp === undefined || storageHistory.history === undefined) {
            return storageHistory;
        }
        const newHistory = {};
        const baseTimestamp = storageHistory.baseTimestamp ?? 0;
        for (const apiId in storageHistory.history) {
            newHistory[apiId] = [];
            for (const priceTuple of storageHistory.history[apiId]) {
                newHistory[apiId].push([baseTimestamp + priceTuple[0], priceTuple[1]]);
            }
        }
        return newHistory;
    }

    /**
     * Imports old marketplace data structure, can be removed in future versions
     * @param {object} data marketplace data in old structure
     */
    importOldData(data) {
        for (let apiId in data.itemList) {
            if (apiId in this.marketHistory) {
                // merge price arrays
                for (let i = 0; i < data.itemList[apiId].prices.length; i++) {
                    if (
                        !this.marketHistory[apiId].some(
                            (priceTuple) => priceTuple[0] === data.itemList[apiId].prices[i][0]
                        )
                    ) {
                        this.marketHistory[apiId].push(data.itemList[apiId].prices[i]);
                    }
                }
                // sort price array
                this.sortPriceList(apiId);
            } else {
                this.marketHistory[apiId] = data.itemList[apiId].prices;
            }
        }
    }

    importNewData(data) {
        for (let apiId in data) {
            if (apiId in this.marketHistory) {
                // merge price arrays
                for (let i = 0; i < data[apiId].length; i++) {
                    if (!this.marketHistory[apiId].some((priceTuple) => priceTuple[0] === data[apiId][i][0])) {
                        this.marketHistory[apiId].push(data[apiId][i]);
                    }
                }
                // sort price array
                this.sortPriceList(apiId);
            } else {
                this.marketHistory[apiId] = data[apiId];
            }
        }
    }

    exportStorage() {
        return JSON.stringify(this.marketHistory);
    }
}
