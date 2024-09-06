/**
 * @typedef {Object} PriceAnalysis
 * @property {number} minPrice
 * @property {number} medianPrice
 * @property {number} maxPrice
 * @property {SelfPrice} minSelfPrice
 * @property {SelfPrice} medianSelfPrice
 * @property {SelfPrice} maxSelfPrice
 * @property {number} vendorPrice
 */

/**
 * @typedef {Object} SelfPrice
 * @property {number} price
 * @property {null | 'crafting' | 'smithing' | 'scrollcrafting' | 'runecrafting' | 'general-shop' } type
 */

class Storage {
    constructor(APICallback) {
        this.APICallback = APICallback;
        this.storageKeys = {
            marketHistory: "TrackerMarketHistoryEncoded",
            lastAPIFetch: "TrackerLastAPIFetch",
        };

        this.leagueId = null;
        this.lastAPIFetch = null;
        this.marketHistory = {};
        this.itemNames = {};
        this.itemVendorPrices = {};
        this.heatItems = {};
        this.latestPriceList = {};
        this.selfPrices = {}; // Prices to make an item yourself

        // remove old key
        if (localStorage.getItem(this.storageKeys.lastAPIFetch) !== null) {
            localStorage.removeItem(this.storageKeys.lastAPIFetch);
        }
    }

    onGameReady() {
        const leagueIcon = document.getElementsByClassName("header-league-icon")[0];
        this.leagueId = getLeagueId(leagueIcon);
        this.lastAPIFetch = this.loadLocalStorage(this.storageKeys.lastAPIFetch + this.leagueId, 0);
        const storageHistory = this.loadLocalStorage(this.storageKeys.marketHistory + this.leagueId, () =>
            this.loadLeagueUnspecificStorage()
        );
        this.marketHistory = this.processStorageHistory(storageHistory);
        this.filterItemList();

        const vanillaItemsList = getIdlescapeWindowObject().items;
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
            } else if (apiId === "709") {
                this.heatItems[apiId] = {
                    heat: 30000,
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

    handleApiData(data) {
        // Reset self cache
        this.selfPrices = {};
        this.latestPriceList = {};

        const timestamp = Math.floor(new Date(data.timestamp).valueOf() / 1000 / 60 / 10);
        data = data.manifest;
        const isNewData = this.lastAPIFetch !== timestamp;
        for (let i = 0; i < data.length; i++) {
            const leagueId = data[i].league;
            if (leagueId !== this.leagueId) continue;
            const apiId = data[i].itemID;
            if (isNewData) {
                // prevent duplicate entries
                this.marketHistory[apiId].push([timestamp, data[i].minPrice]);
                this.sortPriceList(apiId);
            }
            this.latestPriceList[apiId] = data[i].minPrice;
        }
        const currentHeatValue = this.heatValue();
        if (currentHeatValue.heatValue !== Infinity) {
            if (isNewData) {
                // prevent duplicate entries
                this.marketHistory[2].push([timestamp, currentHeatValue.heatValue]);
                this.sortPriceList(2);
            }
            this.latestPriceList[2] = currentHeatValue.heatValue;
        }
        if (isNewData) {
            this.storeItemList();
        }
        this.lastAPIFetch = timestamp;
        localStorage.setItem(this.storageKeys.lastAPIFetch + this.leagueId, timestamp);
    }

    bestHeatItem() {
        return this.heatValue().apiId;
    }

    heatValue() {
        const bestHeatItem = Object.keys(this.heatItems).reduce(
            (result, heatItem) => {
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
            },
            { itemId: null, apiId: null, heatValue: Infinity }
        );
        bestHeatItem.heatValue = Math.round(bestHeatItem.heatValue * 1000) / 1000;
        return bestHeatItem;
    }

    itemHeatValue(apiId) {
        if (apiId in this.heatItems) {
            return this.latestPriceList[apiId] / this.heatItems[apiId].heat;
        }
        return Infinity;
    }

    handleRecipe(ingredientApiIds, productApiId) {
        return {
            ingredients: this.analyzeItems(ingredientApiIds),
            products: this.analyzeItems([productApiId]),
        };
    }

    storeItemList() {
        const history = Object.keys(this.marketHistory).reduce((result, apiId) => {
            // exclude items with no history
            if (this.marketHistory[apiId].length > 0) {
                let previousTimestamp = 0;
                let previousPrice = 0;
                const history = this.marketHistory[apiId].map((entry) => {
                    // reduce timestamp by the previous timestamp
                    const timestamp = entry[0] - previousTimestamp;
                    previousTimestamp = entry[0];
                    // reduce price by the previous price
                    const price = entry[1] - previousPrice;
                    previousPrice = entry[1];
                    if (price === 0) {
                        // reduce memory usage by using a single number instead of an array
                        return timestamp;
                    }
                    return [timestamp, Math.round(price * 1000) / 1000];
                });
                result[apiId] = [history[0]];
                // compress streaks of 1s
                let streakLength = 0;
                for (let i = 1; i < history.length; i++) {
                    const entry = history[i];
                    if (typeof entry === "number" && entry === 1) {
                        streakLength++;
                    } else {
                        if (streakLength > 0) {
                            if (streakLength === 1) {
                                result[apiId].push(1);
                            } else {
                                // timestamp is negative to indicate a streak
                                // negative timestamp difference cannot occur otherwise, because the data is sorted
                                result[apiId].push(-streakLength);
                            }
                            streakLength = 0;
                        }
                        result[apiId].push(entry);
                    }
                }
                if (streakLength > 0) {
                    if (streakLength === 1) {
                        result[apiId].push(1);
                    } else {
                        result[apiId].push(-streakLength);
                    }
                }
            }
            return result;
        }, {});
        const { compressed, codes, skipLast } = HuffmanEncoding.encode(JSON.stringify(history));
        try {
            localStorage.setItem(
                this.storageKeys.marketHistory + this.leagueId,
                JSON.stringify([compressed, codes, skipLast])
            );
        } catch (e) {
            console.log(e);
        }
    }

    getItemName(apiId) {
        return this.itemNames[apiId];
    }

    itemRequiresFallback(itemId) {
        return !itemId in this.idMap || this.idMap[itemId] === -1;
    }

    /**
     * Analyzes prices of an item
     * @param {string | number} apiId The apiId to analyze
     * @returns {PriceAnalysis} The analyzed prices
     */
    analyzeItem(apiId) {
        apiId = Number(apiId);
        if (isNaN(apiId) || apiId === 0) {
            return {
                minPrice: NaN,
                medianPrice: NaN,
                maxPrice: NaN,
                minSelfPrice: {
                    price: NaN,
                    type: null,
                },
                medianSelfPrice: {
                    price: NaN,
                    type: null,
                },
                maxSelfPrice: {
                    price: NaN,
                    type: null,
                },
                vendorPrice: NaN,
            };
        }
        // This is gold
        if (apiId === 1) {
            return {
                minPrice: 1,
                medianPrice: 1,
                maxPrice: 1,
                minSelfPrice: {
                    price: NaN,
                    type: null,
                },
                medianSelfPrice: {
                    price: NaN,
                    type: null,
                },
                maxSelfPrice: {
                    price: NaN,
                    type: null,
                },
                vendorPrice: NaN,
            };
        }
        const essenceIds = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        if (essenceIds.includes(apiId)) {
            const talismanIds = [500, 501, 502, 503, 504, 505, 506, 507, 508, 509];
            const talismanId = talismanIds[essenceIds.indexOf(apiId)];
            const talismanAnalysis = this.analyzeItem(talismanId);
            const essencePerTalisman = (35000 + 50000) / 2;
            return {
                minPrice: talismanAnalysis.minPrice / essencePerTalisman,
                medianPrice: talismanAnalysis.medianPrice / essencePerTalisman,
                maxPrice: talismanAnalysis.maxPrice / essencePerTalisman,
                minSelfPrice: {
                    price: NaN,
                    type: null,
                },
                medianSelfPrice: {
                    price: NaN,
                    type: null,
                },
                maxSelfPrice: {
                    price: NaN,
                    type: null,
                },
                vendorPrice: NaN,
            };
        }
        const selfPrices = this.getSelfPrices(apiId);
        if (this.marketHistory[apiId].length === 0) {
            return {
                minPrice: NaN,
                medianPrice: NaN,
                maxPrice: NaN,
                vendorPrice: this.itemVendorPrices[apiId],
                ...selfPrices,
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
            ...selfPrices,
        };
    }

    analyzeItems(apiIds) {
        const analysisArray = apiIds.map((apiId) => this.analyzeItem(apiId));
        return {
            minPrices: analysisArray.map((analysis) => analysis.minPrice),
            medianPrices: analysisArray.map((analysis) => analysis.medianPrice),
            maxPrices: analysisArray.map((analysis) => analysis.maxPrice),
            minSelfPrices: analysisArray.map((analysis) => analysis.minSelfPrice),
            medianSelfPrices: analysisArray.map((analysis) => analysis.medianSelfPrice),
            maxSelfPrices: analysisArray.map((analysis) => analysis.maxSelfPrice),
            vendorPrices: analysisArray.map((analysis) => analysis.vendorPrice),
        };
    }

    latestPrices() {
        return this.latestPriceList;
    }

    getSelfPrices(apiId) {
        if (apiId in this.selfPrices) {
            return this.selfPrices[apiId];
        }
        // Fill selfPrices with NaNs to prevent infinite loops
        this.selfPrices[apiId] = {
            minSelfPrice: {
                price: NaN,
                type: null,
            },
            medianSelfPrice: {
                price: NaN,
                type: null,
            },
            maxSelfPrice: {
                price: NaN,
                type: null,
            },
        };

        function mapIndexToType(index) {
            switch (index) {
                case 0:
                    return "crafting";
                case 1:
                    return "smithing";
                case 2:
                    return "scrollcrafting";
                case 3:
                    return "runecrafting";
                case 4:
                    return "general-shop";
                default:
                    return null;
            }
        }

        const productionPrices = [
            this.craftingPrices(apiId),
            this.smithingPrices(apiId),
            this.scrollcraftingPrices(apiId),
            this.runecraftingPrices(apiId),
            this.generalShopPrices(apiId),
        ];

        const minPrice = Math.min(...productionPrices.map((price) => price.minPrice || Infinity));
        const medianPrice = Math.min(...productionPrices.map((price) => price.medianPrice || Infinity));
        const maxPrice = Math.min(...productionPrices.map((price) => price.maxPrice || Infinity));

        this.selfPrices[apiId] = {
            minSelfPrice: {
                price: minPrice,
                type: mapIndexToType(productionPrices.findIndex((price) => price.minPrice === minPrice)),
            },
            medianSelfPrice: {
                price: medianPrice,
                type: mapIndexToType(productionPrices.findIndex((price) => price.medianPrice === medianPrice)),
            },
            maxSelfPrice: {
                price: maxPrice,
                type: mapIndexToType(productionPrices.findIndex((price) => price.maxPrice === maxPrice)),
            },
        };

        return this.selfPrices[apiId];
    }

    craftingPrices(apiId) {
        const craftingAugmenting = getIdlescapeWindowObject().craftingAugmenting;
        // Permission denied to access object without the structuredClone
        const recipes = structuredClone(craftingAugmenting[apiId]?.crafting);
        if (!recipes) {
            return {
                minPrice: NaN,
                medianPrice: NaN,
                maxPrice: NaN,
            };
        }
        const prices = recipes.reduce(
            (acc, r) => {
                const { recipe, multiplier } = r;
                const apiIds = Object.keys(recipe);
                const counts = Object.values(recipe).map((count) => count / (multiplier ?? 1));
                const recipePrices = this.analyzeItems(apiIds);
                const bestSelfPrices = this.getBestSelfPrices(recipePrices, counts);
                return {
                    minPrice: Math.min(acc.minPrice, bestSelfPrices.minPrice),
                    medianPrice: Math.min(acc.medianPrice, bestSelfPrices.medianPrice),
                    maxPrice: Math.min(acc.maxPrice, bestSelfPrices.maxPrice),
                };
            },
            { minPrice: Infinity, medianPrice: Infinity, maxPrice: Infinity }
        );
        return prices;
    }

    smithingPrices(apiId) {
        // smithing is complicated
        return {
            minPrice: NaN,
            medianPrice: NaN,
            maxPrice: NaN,
        };
    }

    scrollcraftingPrices(apiId) {
        // Scrolls aren't used in any recipes, so we don't really need this
        return {
            minPrice: NaN,
            medianPrice: NaN,
            maxPrice: NaN,
        };
        const craftingAugmenting = getIdlescapeWindowObject().craftingAugmenting;
        const recipe = craftingAugmenting[apiId]?.scrollcrafting;
        if (!recipe) {
            return {
                minPrice: NaN,
                medianPrice: NaN,
                maxPrice: NaN,
            };
        }

        const apiIds = Object.keys(recipe);
        const counts = Object.values(recipe);
        const recipePrices = this.analyzeItems(apiIds);
        const bestSelfPrices = this.getBestSelfPrices(recipePrices, counts);
        return bestSelfPrices;
    }

    runecraftingPrices(apiId) {
        const craftingAugmenting = getIdlescapeWindowObject().craftingAugmenting;
        const recipe = craftingAugmenting[apiId]?.runecrafting;
        if (!recipe) {
            return {
                minPrice: NaN,
                medianPrice: NaN,
                maxPrice: NaN,
            };
        }

        const itemData = getItemData(apiId);
        const multiplier = RunecraftingTracker.productAmount(
            itemData.class === "cloth" ? "Cloth Weaving" : "Runecrafting",
            false
        );
        const apiIds = Object.keys(recipe);
        // 113 are rune slates, which scale with the multiplier
        const counts = Object.values(recipe).map((count, index) => (apiIds[index] === "113" ? 1 : count / multiplier));
        const recipePrices = this.analyzeItems(apiIds);
        const bestSelfPrices = this.getBestSelfPrices(recipePrices, counts);
        return bestSelfPrices;
    }

    getBestSelfPrices(recipePrices, counts) {
        return {
            minPrice: counts.reduce(
                (sum, count, i) =>
                    sum +
                    count *
                        Math.min(
                            recipePrices.minPrices[i] || Infinity,
                            recipePrices.minSelfPrices[i].price || Infinity
                        ),
                0
            ),
            medianPrice: counts.reduce(
                (sum, count, i) =>
                    sum +
                    count *
                        Math.min(
                            recipePrices.medianPrices[i] || Infinity,
                            recipePrices.medianSelfPrices[i].price || Infinity
                        ),
                0
            ),
            maxPrice: counts.reduce(
                (sum, count, i) =>
                    sum +
                    count *
                        Math.min(
                            recipePrices.maxPrices[i] || Infinity,
                            recipePrices.maxSelfPrices[i].price || Infinity
                        ),
                0
            ),
        };
    }

    generalShopPrices(apiId) {
        const price =
            Object.values(getIdlescapeWindowObject().gameShopItems).find((item) => item.itemID === apiId)?.price ?? NaN;
        return {
            minPrice: price,
            medianPrice: price,
            maxPrice: price,
        };
    }

    priceQuantile(apiId, price) {
        if (!this.marketHistory[apiId] || this.marketHistory[apiId].length <= 1) {
            return 1;
        }
        const index = this.marketHistory[apiId].findLastIndex((priceTuple) => priceTuple[1] <= price);
        if (index === -1) {
            return 0;
        }
        return index / (this.marketHistory[apiId].length - 1);
    }

    latestPriceQuantiles(apiIds) {
        return apiIds.map((apiId) => {
            if (apiId in this.latestPriceList) {
                return this.priceQuantile(apiId, this.latestPriceList[apiId]);
            }
            return 1;
        });
    }

    editData(apiId, type) {
        const data = this.marketHistory[apiId];
        const onePercent = Math.max(1, Math.floor(data.length * 0.01));
        switch (type) {
            case "low":
                data.splice(0, onePercent);
                break;
            case "high":
                data.splice(data.length - onePercent, data.length);
                break;
            case "mid":
                data.splice(0, onePercent);
                data.splice(data.length - onePercent, data.length);
                break;
            default:
                console.log("Unknown edit type: " + type);
        }
        console.log("Edited data for " + this.itemNames[apiId] + " with type " + type);
        this.storeItemList();
    }

    // Sort the price tuples of a given apiId by price and then by timestamp
    sortPriceList(apiId) {
        this.marketHistory[apiId].sort((a, b) => {
            return a[1] - b[1] || a[0] - b[0];
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

    loadLeagueUnspecificStorage() {
        if (this.leagueId !== 1) return {};
        const storageHistory = this.loadLocalStorage(this.storageKeys.marketHistory, {});
        localStorage.removeItem(this.storageKeys.marketHistory);
        localStorage.setItem(this.storageKeys.marketHistory + this.leagueId, JSON.stringify(storageHistory));
        return storageHistory;
    }

    processStorageHistory(storageHistory) {
        // support for V2 storage format
        if (!Array.isArray(storageHistory)) {
            return storageHistory;
        }
        const [compressed, codes, skipLast] = storageHistory;
        const decoded = JSON.parse(HuffmanEncoding.decode(compressed, codes, skipLast));
        const history = {};
        for (const apiId in decoded) {
            history[apiId] = [];
            let previousTimestamp = 0;
            let previousPrice = 0;
            for (const priceTuple of decoded[apiId]) {
                if (typeof priceTuple === "number") {
                    // compressed price tuple
                    if (priceTuple < 0) {
                        // streak of same price
                        for (let i = 0; i < -priceTuple; i++) {
                            previousTimestamp += 1;
                            history[apiId].push([previousTimestamp, previousPrice]);
                        }
                        continue;
                    }
                    previousTimestamp += priceTuple;
                } else {
                    previousTimestamp += priceTuple[0];
                    previousPrice += priceTuple[1];
                }
                history[apiId].push([previousTimestamp, previousPrice]);
            }
        }
        return history;
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

    convertItemIdToApiId(itemId) {
        return this.idMap[itemId];
    }
}
