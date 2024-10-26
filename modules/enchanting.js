const AFFIX_DUST_PER_ITEM_TIER = [550, 550, 550, 551, 552, 553, 554, 554, 554];
const AFFIX_GEAR_SCRAP_PER_RARITY = {
    junk: 555,
    common: 555,
    uncommon: 556,
    rare: 557,
    epic: 558,
    legendary: 559,
};

class EnchantingTracker {
    static id = "enchanting_tracker";
    static displayName = "Enchanting Tracker";
    static icon = "<img src='/images/enchanting/enchanting_logo.png' alt='Enchanting Tracker Icon'>";
    static category = "recipe";
    css = `
body .scrollcrafting-container {
    grid-template-rows: 70px 8px auto auto;
    grid-template-areas: "image title resources button"
                        "bar bar bar bar"
                        "totals totals totals totals"
                        "info info info info";
}

.enchanting-info-table {
    display: grid;
    /* Grid Layout specified by js */
    grid-gap: 5px;
    border: 2px solid hsla(0, 0%, 100%, .452);
    padding: 6px;
    margin: 6px;
    border-radius: 10px;
    grid-area: info;
    place-items: center;
}

.enchanting-info-table-content {
    display: flex;
}

.enchanting-info-table-content:first-child {
    grid-column: 2;
}

.enchanting-info-table-icon{
    height: 24px;
    width: 24px;
}

.enchanting-info-table-font {
    font-size: 2.25rem;
    line-height: 2.5rem;
}

.augmenting-button {
    float: right;
    width: 35px;
    height: 35px;
    padding: 3px;
    margin: -5px 0 -10px 5px;
    cursor: pointer;
    border-radius: 5px;
    border: 3px solid rgb(13, 4, 11);
    background-color: rgb(74, 8, 62);
}

.augmenting-button:hover {
    transform: scale(1.1);
}

.augmenting-popup-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,.19);
    display: flex;
    justify-content: center;
}

.augmenting-popup {
    text-align: center;
    width: 100%;
    max-width: 1200px;
    margin: auto;
    height: 100%;
    border: 2px solid silver;
    z-index: 9;
    padding: 50px;
    background-color: rgba(0,0,0,.19);
    border-image-source: url(/images/ui/stone-9slice.png);
    border-image-slice: 100 fill;
    border-image-width: 100px;
    border-image-outset: 0;
    border-image-repeat: repeat;
    overflow-x: hidden;
}

.augmenting-popup-title {
    margin-top: 0;
    font-size: 2rem;
    line-height: 1.2;
}

.augmenting-popup-filter-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, 30px);
  justify-content: center;
}

.augmenting-popup-filter-item {
    margin: 5px;
    height: 30px;
    width: 30px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.augmenting-popup-filter-item.selected {
    border: 2px solid lightgray;
    border-radius: 5px;
}

.augmenting-popup-filter-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.augmenting-popup-button-container {
    display: flex;
    justify-content: center;
    padding: 10px;
}

.augmenting-popup-button {
    height: 40px;
    width: 100%;
    max-width: 200px;
    padding: 6px 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-size: 100% 100%;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    cursor: pointer;
}

.augmenting-popup-button:hover {
    filter: brightness(1.5);
}

.augmenting-table {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    justify-content: center;
    align-items: center;
}

.augmenting-table > *:nth-child(n+6) {
    border-top: 1px solid silver;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.augmenting-table-icon {
    width: 50px;
    height: 50px;
    object-fit: contain;
}

.augmenting-table-price-xp {
    flex-direction: column;
}

.augmenting-table-price-xp > .gray {
    color: gray;
}

.augmenting-info-table {
    display: grid !important;
    grid-gap: 5px;
    place-items: center;
}

.augmenting-info-table-content:first-child {
    grid-column: 2;
}

.augmenting-info-table-content {
    display: flex;
    align-items: center;
}

.augmenting-info-table-icon {
    margin: 0 0 4px 10px;
    width: 32px;
    height: 32px;
    object-fit: contain;
}

.augmenting-info-table-font {
    font-size: 1.0rem;
    line-height: 1.5rem;
}
    `;

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;
        if (this.settings.profit === undefined) {
            this.settings.profit = "percent";
        }
        if (this.settings.researching_profit === undefined) {
            this.settings.researching_profit = "per_hour";
        }
        if (
            this.settings.min_row === undefined ||
            this.settings.median_row === undefined ||
            this.settings.max_row === undefined
        ) {
            this.settings.min_row = true;
            this.settings.median_row = true;
            this.settings.max_row = true;
        }
        if (this.settings.augmenting_rows === undefined) {
            this.settings.augmenting_rows = 5;
        }
        this.cssNode = injectCSS(this.css);

        // Cache variables
        this.critChance = null;
        this.researchingChance = null;
        this.costByLevel = [
            {
                baseCopies: 1,
                taps: 0,
            },
        ];
        this.augmentingTable = null;
        this.researchingTable = null;
        this.filter = null;

        this.playAreaObserver = new MutationObserver((mutations) => {
            this.playAreaObserver.disconnect();
            this.checkForEnchanting(mutations);
            this.connectPlayAreaObserver();
        });
    }

    onGameReady() {
        this.connectPlayAreaObserver();
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
    }

    settingsMenuContent() {
        const profitType = document.createElement("div");
        profitType.classList.add("tracker-module-setting");
        profitType.insertAdjacentHTML(
            "beforeend",
            `
            <div class="tracker-module-setting-name">
                Profit
            </div>`
        );
        profitType.append(
            Templates.selectMenu(
                EnchantingTracker.id + "-profit",
                {
                    off: "Off",
                    percent: "Percent",
                    flat: "Flat",
                    per_hour: "Per Hour",
                },
                this.settings.profit
            )
        );
        const rows = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Min Row
                </div>
                ${Templates.checkboxTemplate(EnchantingTracker.id + "-min_row", this.settings.min_row)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Median Row
                </div>
                ${Templates.checkboxTemplate(EnchantingTracker.id + "-median_row", this.settings.median_row)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Max Row
                </div>
                ${Templates.checkboxTemplate(EnchantingTracker.id + "-max_row", this.settings.max_row)}
            </div>`;
        const augmentingRows = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Number of rows in augmenting and researching tables
                </div>
                ${Templates.inputTemplate(
                    EnchantingTracker.id + "-augmenting_rows",
                    this.settings.augmenting_rows,
                    "number"
                )}
            </div>`;
        const researchingProfitType = document.createElement("div");
        researchingProfitType.classList.add("tracker-module-setting");
        researchingProfitType.insertAdjacentHTML(
            "beforeend",
            `
            <div class="tracker-module-setting-name">
                Researching Profit
            </div>`
        );
        researchingProfitType.append(
            Templates.selectMenu(
                EnchantingTracker.id + "-researching_profit",
                {
                    off: "Off",
                    percent: "Percent",
                    flat: "Flat",
                    per_hour: "Per Hour",
                },
                this.settings.researching_profit
            )
        );
        return [profitType, rows, augmentingRows, researchingProfitType];
    }

    settingChanged(settingId, value) {
        switch (settingId) {
            case "augmentingRows":
                this.augmentingTable = null;
            // Intentional fallthrough
            case "researchingProfit":
                this.researchingTable = null;
        }
        return;
    }

    onAPIUpdate() {
        this.critChance = null;
        this.researchingChance = null;
        this.checkForEnchanting(null, true);
    }

    connectPlayAreaObserver() {
        const playAreaContainer = getPlayAreaContainer();
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true,
        });
    }

    checkForEnchanting(mutations) {
        if (getSelectedSkill() === "Enchanting") {
            if (mutations && detectInfiniteLoop(mutations)) {
                return;
            }
            const selectedTab = getSelectedSubSkill();
            if (selectedTab === "Scrollcrafting") {
                this.enchantingTracker();
            } else if (selectedTab === "Augmenting") {
                this.addAugmentingButton("augmenting");
            } else if (selectedTab === "Item Research") {
                this.addAugmentingButton("researching");
            }
        }
    }

    enchantingTracker() {
        let recipes = document.getElementsByClassName("scrollcrafting-container");
        for (let i = 0; i < recipes.length; i++) {
            this.processEnchantment(recipes[i]);
        }
    }

    processEnchantment(recipe) {
        recipe.getElementsByClassName("enchanting-info-table")[0]?.remove();
        let scrollApiId = convertApiId(recipe);
        const scrollIcon = recipe.firstChild.src;

        let standardResources = this.getStandardResources(
            recipe.getElementsByClassName("scrollcrafting-standard-resources")[0]
        );
        let dynamicResources = this.getDynamicResources(
            recipe.getElementsByClassName("scrollcrafting-dynamic-resources")[0]
        );
        // combine lists of objects into separate lists
        let resourceApiIds = ["1600"].concat(dynamicResources.map((resource) => resource.apiId));
        let resourceItemIcons = ["/images/enchanting/scroll.png"].concat(
            dynamicResources.map((resource) => resource.icon)
        );
        let resourceItemCounts = [standardResources.scrolls].concat(
            dynamicResources.map((resource) => resource.amount)
        );
        const recipePrices = this.storage.handleRecipe(resourceApiIds, scrollApiId);
        const ingredients = Object.assign(recipePrices.ingredients, {
            icons: resourceItemIcons,
            counts: resourceItemCounts,
        });
        const product = Object.assign(recipePrices.products, { icons: [scrollIcon], counts: [1] });
        saveInsertAdjacentHTML(
            recipe,
            "beforeend",
            Templates.infoTableTemplate(
                "enchanting",
                [this.settings.min_row, this.settings.median_row, this.settings.max_row],
                ingredients,
                product,
                this.settings.profit,
                standardResources.timePerAction
            )
        );
    }

    getStandardResources(node) {
        return {
            scrolls: this.getResource(node.childNodes[2].firstChild).amount,
            timePerAction: parseFloat(node.childNodes[1].firstChild.childNodes[1].innerText),
        };
    }

    getDynamicResources(node) {
        let resources = [];
        for (let i = 0; i < node.childNodes.length; i++) {
            resources.push(this.getResource(node.childNodes[i].firstChild));
        }
        return resources;
    }

    getResource(node) {
        return {
            apiId: convertApiId(node),
            icon: node.childNodes[0].src,
            amount: node.childNodes[1].innerText,
        };
    }

    addAugmentingButton(type) {
        document.getElementsByClassName("augmenting-button")[0]?.remove();
        const enchantingContainer = document.getElementsByClassName("enchanting-container")[0];
        if (!enchantingContainer) {
            return;
        }
        // Select header of third section
        const availableSectionHeader = enchantingContainer.querySelectorAll(
            ".idlescape-container > .chakra-heading"
        )[2];

        saveInsertAdjacentHTML(availableSectionHeader, "beforeend", Templates.trackerLogoTemplate("augmenting-button"));
        availableSectionHeader
            .getElementsByClassName("augmenting-button")[0]
            .addEventListener("click", () => this.augmentingTracker(type));
    }

    augmentingTracker(type) {
        const critChance = this.getCritChance();
        const researchingChance = this.getResearchChance();
        if (critChance !== this.critChance) {
            this.critChance = critChance;
            this.augmentingTable = null;
        }
        if (researchingChance !== this.researchingChance) {
            this.researchingChance = researchingChance;
            this.researchingTable = null;
        }
        let table = type === "augmenting" ? this.augmentingTable : this.researchingTable;
        if (true || table === null) {
            const effEnchantingLevel = getSkillLevel("enchanting", null, true);
            const craftingAugmenting = Object.entries(getIdlescapeWindowObject().craftingAugmenting)
                .filter(([apiId, data]) => {
                    const itemData = getItemData(apiId);
                    return (
                        data.scrapping &&
                        !(type === "augmenting" && itemData.blockAugmenting) &&
                        !(type === "researching" && itemData.blockResearching)
                    );
                })
                .map(([apiId, data]) => {
                    const itemData = getItemData(apiId);

                    const { ingredientApiIds, ingredientCounts, productApiIds, productCounts, experience } =
                        type === "augmenting"
                            ? this.getAugmentingStats(apiId, data.scrapping, itemData, critChance)
                            : this.getResearchingStats(apiId, data.scrapping, itemData, researchingChance);

                    const ingredientPriceData = this.storage.analyzeItems(ingredientApiIds);
                    const productPriceData = this.storage.analyzeItems(productApiIds);

                    return {
                        apiId,
                        experience,
                        ingredients: {
                            apiIds: ingredientApiIds,
                            counts: ingredientCounts,
                            prices: ingredientPriceData,
                        },
                        products: {
                            apiIds: productApiIds,
                            counts: productCounts,
                            prices: productPriceData,
                        },
                        // Time is ignored for augmenting
                        time: this.scrappingTime(itemData, effEnchantingLevel),
                        minPrice: this.augmentingProfit(
                            ingredientCounts,
                            ingredientPriceData,
                            productCounts,
                            productPriceData,
                            experience,
                            "min"
                        ),
                        medianPrice: this.augmentingProfit(
                            ingredientCounts,
                            ingredientPriceData,
                            productCounts,
                            productPriceData,
                            experience,
                            "median"
                        ),
                        maxPrice: this.augmentingProfit(
                            ingredientCounts,
                            ingredientPriceData,
                            productCounts,
                            productPriceData,
                            experience,
                            "max"
                        ),
                    };
                })
                .filter(
                    (augItem) =>
                        type === "augmenting" || this.filter === null || augItem.products.apiIds.includes(this.filter)
                );

            table = Templates.popupTemplate(`
                <div class="augmenting-popup">
                    <div class="augmenting-popup-title">Best ${type} XP</div>
                    ${
                        type === "augmenting"
                            ? '<div class="augmenting-popup-info">It is almost always cheapest to augment items (transforms excluded).</div>'
                            : this.renderFilters()
                    }
                    <div class="augmenting-content-container">
                        <h3>Minimum prices</h3>
                        ${this.augmentingTableSection(type, craftingAugmenting, "min")}
                        <hr/>
                        <h3>Median prices</h3>
                        ${this.augmentingTableSection(type, craftingAugmenting, "median")}
                        <hr/>
                        <h3>Maximum prices</h3>
                        ${this.augmentingTableSection(type, craftingAugmenting, "max")}
                    </div>
                    <div class="augmenting-popup-button-container">
                        <div class="augmenting-popup-button close idlescape-button-red">Close</div>
                    </div>
                </div>`);
            if (type === "augmenting") {
                this.augmentingTable = table;
            } else {
                this.researchingTable = table;
            }
        }
        saveInsertAdjacentHTML(document.body, "beforeend", table);

        document.getElementsByClassName("close")[0].addEventListener("click", () => {
            this.tracker.closePopup();
        });
        document.getElementsByClassName("tracker-popup-background")[0].addEventListener("click", (event) => {
            if (event.target === event.currentTarget) {
                this.tracker.closePopup();
            }
        });
        document.getElementsByClassName("augmenting-popup")[0].addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.tracker.closePopup();
            }
        });
        Array.from(document.getElementsByClassName("augmenting-popup-filter-item")).forEach((filterItem) => {
            filterItem.addEventListener("click", () => {
                this.filter = filterItem.dataset.filter !== "null" ? parseInt(filterItem.dataset.filter) : null;
                this.tracker.closePopup();
                this.augmentingTracker(type);
            });
        });
    }

    augmentingProfit(ingredientCounts, ingredientPriceData, productCounts, productPriceData, experience, priceType) {
        return (
            (ingredientCounts
                .map(
                    (count, index) =>
                        count *
                        Math.min(
                            ingredientPriceData[priceType + "Prices"][index] || Infinity,
                            ingredientPriceData[priceType + "SelfPrices"][index].price || Infinity
                        )
                )
                .reduce((acc, val) => acc + val, 0) -
                productCounts
                    .map((count, index) => count * productPriceData[priceType + "Prices"][index] || 0)
                    .reduce((acc, val) => acc + val, 0) *
                    0.95) /
            experience
        );
    }

    renderFilters() {
        const dustAndScrap = Object.values(getIdlescapeWindowObject().items).filter(
            (i) => i.name.includes("Runic Dust") || i.name.includes("Gear Scrap")
        );
        return `
            <div class='augmenting-popup-filter-container'>
                <div class='augmenting-popup-filter-item ${this.filter === null ? "selected" : ""}' data-filter=null>
                    All
                </div>
                ${dustAndScrap
                    .map(
                        (item) => `
                    <div class='augmenting-popup-filter-item ${
                        this.filter === item.id ? "selected" : ""
                    }' data-filter='${item.id}'>
                        <img src='${item.itemIcon ?? item.itemImage}' class='augmenting-popup-filter-image' />
                    </div>
                `
                    )
                    .join("")}
            </div>
        `;
    }

    augmentingTableSection(type, augmentingData, priceType) {
        const bestTen = structuredClone(augmentingData)
            .sort((a, b) => a[priceType + "Price"] - b[priceType + "Price"])
            .splice(0, this.settings.augmenting_rows);
        const tableEntries = bestTen
            .map((augItem, index) => {
                const ingredients = {
                    ...augItem.ingredients.prices,
                    counts: augItem.ingredients.counts,
                    icons: augItem.ingredients.apiIds.map((apiId) => {
                        const itemData = getItemData(apiId);
                        return itemData.itemIcon ?? itemData.itemImage;
                    }),
                };
                const products = {
                    ...augItem.products.prices,
                    counts: augItem.products.counts,
                    icons: augItem.products.apiIds.map((apiId) => {
                        const itemData = getItemData(apiId);
                        return itemData.itemIcon ?? itemData.itemImage;
                    }),
                };
                const itemData = getItemData(augItem.apiId);
                return `
                    <div class='augmenting-table-font'>
                        ${index + 1}
                    </div>
                    <div>
                        <img class='augmenting-table-icon' src="${itemData.itemIcon ?? itemData.itemImage}">
                    </div>
                    <div class="augmenting-table-font">
                        ${formatNumber(augItem.experience, { fraction: true })}
                    </div>
                    <div class="augmenting-table-price-xp">
                        <div class="${priceType !== "min" ? "gray" : ""}">
                            ${formatNumber(augItem.minPrice, { fraction: true })}
                        </div>
                        <div class="${priceType !== "median" ? "gray" : ""}">
                            ${formatNumber(augItem.medianPrice, { fraction: true })}
                        </div>
                        <div class="${priceType !== "max" ? "gray" : ""}">
                            ${formatNumber(augItem.maxPrice, { fraction: true })}
                        </div>
                    </div>
                    ${Templates.infoTableTemplate(
                        "augmenting",
                        [this.settings.min_row, this.settings.median_row, this.settings.max_row],
                        ingredients,
                        products,
                        type === "augmenting" ? "off" : this.settings.researching_profit,
                        augItem.time,
                        undefined,
                        { showCounts: true, hideProductSum: type === "augmenting" && products.counts.length === 0 }
                    )}
                `;
            })
            .join("");
        return `
            <div class='augmenting-table'>
                <div class='augmenting-table-font'>Rank</div>
                <div class='augmenting-table-font'>Item</div>
                <div class='augmenting-table-font'>${
                    type === "augmenting" ? "Total XP until +10/transform" : "XP per Tab"
                }</div>
                <div class='augmenting-table-font'>Price/XP</div>
                <div class='augmenting-table-font'>Price Table</div>
                ${tableEntries}
            </div>`;
    }

    getAugmentingStats(apiId, scrapping, itemData, critChance) {
        let bestLevel = 10; // 10 is basically always the best
        const productApiIds = [];
        const productCounts = [];
        const augmentingLoot = getIdlescapeWindowObject().augmentingLoot?.[apiId];
        if (augmentingLoot?.transforms) {
            for (const transform of augmentingLoot.transforms) {
                if (!transform.augmentingTransform) continue;
                bestLevel = transform.augmentationLevel;
                productApiIds.push(transform.newItemID);
                productCounts.push(transform.chance);
            }
        }
        const baseCost = this.getCostByLevel(
            bestLevel,
            itemData.augmentOverride?.fixedSuccessCount,
            itemData.augmentOverride?.fixedBaseCount
        );
        if (!itemData.blockCritAugment) baseCost.taps *= 1 / (1 + critChance);
        return {
            ingredientApiIds: [...Object.keys(scrapping), apiId],
            ingredientCounts: [...Object.values(scrapping).map((count) => count * baseCost.taps), baseCost.baseCopies],
            productApiIds,
            productCounts,
            experience: this.augmentingExperience(itemData) * baseCost.taps,
        };
    }

    getResearchingStats(apiId, scrapping, itemData, researchingChance) {
        const rarity = itemData.rarity ?? "common";
        const dust = this.getDustIDFromItemTier(this.getItemTier(itemData));
        const scrap = itemData.researchesIntoDust ? dust : AFFIX_GEAR_SCRAP_PER_RARITY[rarity];
        const productApiIds = [dust, scrap];
        const productCounts = [researchingChance, 1 - researchingChance];
        const augmentingLoot = getIdlescapeWindowObject().augmentingLoot?.[apiId];
        if (augmentingLoot?.scrappingSuccess) {
            productApiIds.push(augmentingLoot.scrappingSuccess.itemID);
            const count =
                ((augmentingLoot.scrappingSuccess.chance ?? 1) *
                    ((augmentingLoot.scrappingSuccess.minimum ?? 1) + (augmentingLoot.scrappingSuccess.maximum ?? 1))) /
                2;
            productCounts.push(count * researchingChance);
        }
        if (augmentingLoot?.scrappingFail) {
            productApiIds.push(augmentingLoot.scrappingFail.itemID);
            const count =
                ((augmentingLoot.scrappingFail.chance ?? 1) *
                    ((augmentingLoot.scrappingFail.minimum ?? 1) + (augmentingLoot.scrappingFail.maximum ?? 1))) /
                2;
            productCounts.push(count * (1 - researchingChance));
        }
        if (augmentingLoot?.transforms) {
            for (const transform of augmentingLoot.transforms) {
                if (transform.augmentingTransform) continue;
                productApiIds.push(transform.newItemID);
                productCounts.push(transform.chance * researchingChance);
            }
        }
        return {
            ingredientApiIds: [...Object.keys(scrapping), apiId],
            ingredientCounts: [...Object.values(scrapping), 1 - researchingChance],
            productApiIds,
            productCounts,
            experience: this.augmentingExperience(itemData),
        };
    }

    getCritChance() {
        const critText = document.querySelector(".anchor-augmenting-chance")?.innerText;
        return critText ? parseFloat(critText) / 100 : this.critChance ?? 0.1;
    }

    getResearchChance() {
        const chanceText = document.querySelector(".anchor-researching-chance")?.innerText;
        return chanceText ? parseFloat(chanceText) / 100 : this.researchingChance ?? 0.9;
    }

    getCostByLevel(targetLevel, fixedSuccessCount = undefined, fixedBaseCount = undefined) {
        if (this.costByLevel.length <= targetLevel) {
            const previousCost = this.getCostByLevel(targetLevel - 1);
            const augmentingTrialCount = this.getAugmentingTrialCount(targetLevel - 1);
            const augmentItemCopyCost = this.getAugmentItemCopyCost(targetLevel - 1);
            this.costByLevel.push({
                baseCopies: previousCost.baseCopies + augmentItemCopyCost,
                taps: previousCost.taps + augmentingTrialCount,
            });
        }
        const cachedCost = this.costByLevel[targetLevel];
        return {
            baseCopies: fixedBaseCount ? targetLevel * fixedBaseCount : cachedCost.baseCopies,
            taps: fixedSuccessCount ? targetLevel * fixedSuccessCount : cachedCost.taps,
        };
    }

    // #region stolen vanilla functions (maybe slightly modified)
    augmentingExperience(itemData) {
        const itemTier = this.getItemTier(itemData);
        return Math.round(20 * Math.pow(itemTier, 2));
    }

    getItemTier(itemData) {
        let highestRequiredLevel;
        if (itemData.requiredLevel) {
            // Highest level of the required skills
            highestRequiredLevel = Math.max(...Object.values(itemData.requiredLevel));
            highestRequiredLevel = Number((highestRequiredLevel / 10).toFixed(1));
        }
        return itemData.overrideItemTier ?? highestRequiredLevel ?? itemData.enchantmentTier ?? 1;
    }

    getAugmentingTrialCount(augmentations) {
        // return itemData.augmentOverride.fixedSuccessCount ?? 10 * (5 + Math.pow(augmentations ?? 0, 2));
        return 10 * (5 + Math.pow(augmentations ?? 0, 2));
    }

    getAugmentItemCopyCost(augmentations) {
        // return itemData.augmentOverride?.fixedBaseCount ?? Math.pow(Math.floor((augmentations ?? 0) / 5), 2);
        return Math.pow(Math.floor((augmentations ?? 0) / 5), 2);
    }

    getDustIDFromItemTier(itemTier) {
        let tier = Math.floor(itemTier ?? 0);
        if (tier < 0) {
            tier = 0;
        }
        if (tier >= AFFIX_DUST_PER_ITEM_TIER.length) {
            tier = AFFIX_DUST_PER_ITEM_TIER.length - 1;
        }
        return AFFIX_DUST_PER_ITEM_TIER[tier];
    }

    scrappingTime(itemData, effectiveEnchantingLevel) {
        const tier = getItemTier(itemData);
        let time = Math.pow(2 + tier, 1.5);
        time /= (effectiveEnchantingLevel + 100) / 100;
        return Math.max(333 / 1000, time);
    }
    // #endregion
}
