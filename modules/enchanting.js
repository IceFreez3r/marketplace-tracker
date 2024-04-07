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
    margin-bottom: -10px;
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

.augmenting-table-font {
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
}

.augmenting-info-table-icon {
    margin: 4px 10px;
    width: 32px;
    height: 32px;
    object-fit: contain;
}

.augmenting-info-table-icon.left {
    margin-right: 0;
}

.augmenting-info-table-icon.right {
    margin-left: 0;
}

.augmenting-info-table-font {
    font-size: 2.25rem;
    line-height: 2.5rem;
}
    `;

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;
        if (this.settings.profit === undefined) {
            this.settings.profit = "percent";
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
        this.effLevel = null;
        this.accChances = [];
        this.accXP = {}; // array of xp values for each tier
        this.avgXP = {}; // avg total xp for each tier
        this.augmentingTable = null;

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
                    Augmenting Rows
                </div>
                ${Templates.inputTemplate(
                    EnchantingTracker.id + "-augmenting_rows",
                    this.settings.augmenting_rows,
                    "number"
                )}
            </div>`;
        return [profitType, rows, augmentingRows];
    }

    settingChanged(settingId, value) {
        return;
    }

    onAPIUpdate() {
        this.checkForEnchanting(null, true);
    }

    connectPlayAreaObserver() {
        const playAreaContainer = getPlayAreaContainer();
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true,
        });
    }

    checkForEnchanting(mutations, force = false) {
        if (getSelectedSkill() === "Enchanting") {
            if (mutations && detectInfiniteLoop(mutations)) {
                return;
            }
            if (this.selectedTab() === "Scrollcrafting") {
                this.enchantingTracker();
            } else if (this.selectedTab() === "Augmenting") {
                this.addAugmentingButton(force);
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
            timePerAction: parseFloat(this.getResource(node.childNodes[1].firstChild).amount),
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

    addAugmentingButton() {
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
            .addEventListener("click", () => this.augmentingTracker());
    }

    augmentingTracker(force = false) {
        if (force) {
            this.augmentingTable = null;
        }
        if (this.augmentingTable !== null) {
            saveInsertAdjacentHTML(document.body, "beforeend", this.augmentingTable);
        } else {
            const effEnchantingLevel = getSkillLevel("enchanting", null, true);
            const averageAugsPerItem = this.averageAugsPerItem(effEnchantingLevel);

            const craftingAugmenting = Object.entries(getIdlescapeWindowObject().craftingAugmenting)
                .filter(([apiId, data]) => {
                    const itemData = getItemData(apiId);
                    return (
                        data.augmenting &&
                        itemData &&
                        // ignore items with special augmenting rules
                        !(itemData.maxAugLevel || itemData.augCostScaling || itemData.forcedAugmentChance)
                    );
                })
                .map(([apiId, data]) => {
                    const priceData = this.storage.handleRecipe(Object.keys(data.augmenting), apiId);
                    return {
                        product: { apiId, prices: priceData.products },
                        experience: this.averageXPPerItem(effEnchantingLevel, apiId),
                        ingredients: {
                            apiIds: Object.keys(data.augmenting),
                            counts: Object.values(data.augmenting),
                            prices: priceData.ingredients,
                        },
                    };
                })
                .map((augItem) => ({
                    apiId: augItem.product.apiId,
                    experience: augItem.experience,
                    minPrice: this.convertAugItemToPrice(averageAugsPerItem, augItem, "minPrices", "minSelfPrices"),
                    medianPrice: this.convertAugItemToPrice(
                        averageAugsPerItem,
                        augItem,
                        "medianPrices",
                        "medianSelfPrices"
                    ),
                    maxPrice: this.convertAugItemToPrice(averageAugsPerItem, augItem, "maxPrices", "maxSelfPrices"),
                    ...augItem,
                }));

            this.augmentingTable = Templates.popupTemplate(`
                <div class="augmenting-popup">
                    <div class="augmenting-popup-title">Best augmenting XP</div>
                    <div class="augmenting-content-container">
                        <h3>Minimum prices</h3>
                        ${this.augmentingTableSection(craftingAugmenting, "min")}
                        <hr/>
                        <h3>Median prices</h3>
                        ${this.augmentingTableSection(craftingAugmenting, "median")}
                        <hr/>
                        <h3>Maximum prices</h3>
                        ${this.augmentingTableSection(craftingAugmenting, "max")}
                    </div>
                    <div class="augmenting-popup-button-container">
                        <div class="augmenting-popup-button close idlescape-button-red">Close</div>
                    </div>
                </div>`);
            saveInsertAdjacentHTML(document.body, "beforeend", this.augmentingTable);
        }

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
    }

    augmentingTableSection(augmentingData, type) {
        const bestTen = augmentingData
            .sort((a, b) => a[type + "Price"] - b[type + "Price"])
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
                const itemData = getItemData(augItem.apiId);
                const product = {
                    ...augItem.product.prices,
                    counts: [1],
                    icons: [itemData.itemIcon ?? itemData.itemImage],
                };
                // Add product to the end of ingredients, since it's not the normal product here
                for (const [key, value] of Object.entries(product)) {
                    ingredients[key].push(value.pop());
                }
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
                    <div class="augmenting-table-font">
                        ${formatNumber(augItem[type + "Price"], { fraction: true })}
                    </div>
                    ${Templates.infoTableTemplate(
                        "augmenting",
                        [this.settings.min_row, this.settings.median_row, this.settings.max_row],
                        ingredients,
                        product,
                        "off",
                        0,
                        undefined,
                        { showCounts: true, hideSum: true }
                    )}
                `;
            })
            .join("");
        return `
            <div class='augmenting-table'>
                <div class='augmenting-table-font'>Rank</div>
                <div class='augmenting-table-font'>Item</div>
                <div class='augmenting-table-font'>Avg XP</div>
                <div class='augmenting-table-font'>Price/XP</div>
                <div class='augmenting-table-font'>Price Table</div>
                ${tableEntries}
            </div>`;
    }

    convertAugItemToPrice(averageAugsPerItem, augItem, priceType, selfPriceType) {
        const basePrice = Math.min(
            augItem.product.prices[priceType][0] || Infinity,
            augItem.product.prices[selfPriceType][0].price || Infinity
        );
        const augPrice = augItem.ingredients.counts.reduce((acc, count, index) => {
            return (
                acc +
                count *
                    Math.min(
                        augItem.ingredients.prices[priceType][index] || Infinity,
                        augItem.ingredients.prices[selfPriceType][index].price || Infinity
                    )
            );
        }, 0);
        return (basePrice + averageAugsPerItem * augPrice) / augItem.experience;
    }

    averageAugsPerItem(effLevel) {
        const eps = 0.01;
        let augCounter = 0;
        let accChance = 1;
        let avgAugs = 0;
        while (accChance > eps && augCounter < 50) {
            accChance = this.accumulatedAugmentingChance(effLevel, augCounter);
            augCounter++;
            avgAugs += accChance;
        }
        return avgAugs;
    }

    /** Calculates the accumulated augmenting chance recursively and caches results */
    accumulatedAugmentingChance(effLevel, itemAug) {
        this.checkEffLevel(effLevel);
        if (itemAug < 0) {
            return 1;
        }
        if (this.accChances.length > itemAug) {
            return this.accChances[itemAug];
        }
        const prevAccChance = this.accumulatedAugmentingChance(effLevel, itemAug - 1);
        const augChance = this.augmentingChance(effLevel, itemAug);
        // Cache result
        this.accChances.push(prevAccChance * augChance);
        return this.accChances[itemAug];
    }

    /** Resets the cache if the effective level changed. accXP is independent of the effective level so it can stay */
    checkEffLevel(effLevel) {
        if (this.effLevel !== effLevel) {
            this.effLevel = effLevel;
            this.accChances = [];
            this.avgXP = {};
        }
    }

    // Vanilla function
    augmentingChance(effLevel, itemAug) {
        const base_probability = 0.9;
        const level_scaling = 1.5;
        const level_norm = 203;
        const level_weight = 1.25;
        const chance_increase = 0.05;

        const chance =
            (base_probability + Math.sqrt(effLevel * level_scaling) / level_norm) **
                Math.pow(itemAug + 1, level_weight) +
            chance_increase;
        return Math.min(1, chance);
    }

    averageXPPerItem(effLevel, apiId) {
        const itemData = getItemData(apiId);
        const itemTier = getItemTier(itemData);
        this.checkEffLevel(effLevel);
        if (this.avgXP[itemTier] !== undefined) {
            return this.avgXP[itemTier];
        }

        const eps = 0.1;
        let avgTotalXP = 0;
        let augCounter = 0;
        while (augCounter < 50) {
            const augXPPreviousLevels = this.accumulatedAugmentingExperience(itemData, augCounter - 1);
            const augXPHere = this.augmentingExperience(itemData, augCounter);
            const chanceToBreakHere =
                this.accumulatedAugmentingChance(effLevel, augCounter - 1) -
                this.accumulatedAugmentingChance(effLevel, augCounter);
            // Half XP on break
            const avgXP = chanceToBreakHere * (augXPPreviousLevels + augXPHere / 2);
            avgTotalXP += avgXP;
            // avgXP stays at 0 for the first augments, when the chance to break is 0
            if (augCounter > 5 && avgXP < eps) {
                break;
            }
            augCounter++;
        }
        // Cache result
        this.avgXP[itemTier] = avgTotalXP;
        return avgTotalXP;
    }

    accumulatedAugmentingExperience(itemData, itemAug) {
        if (itemAug < 0) {
            return 0;
        }
        const itemTier = getItemTier(itemData);
        this.accXP[itemTier] ??= [];
        const relevantAccXP = this.accXP[itemTier];
        if (relevantAccXP.length > itemAug) {
            return relevantAccXP[itemAug];
        }
        const prevAccXP = this.accumulatedAugmentingExperience(itemData, itemAug - 1);
        const augXP = this.augmentingExperience(itemData, itemAug);
        relevantAccXP[itemAug] = prevAccXP + augXP;
        return relevantAccXP[itemAug];
    }

    // modified version of vanilla version
    augmentingExperience(itemData, currentItemLevel = 0) {
        const itemTier = getItemTier(itemData);
        return Math.round(Math.pow(currentItemLevel + 1, 1.25) * Math.pow(itemTier, 2.5) * 20);
    }

    selectedTab() {
        return document.getElementsByClassName("enchanting-tab-selected")[0].lastElementChild.innerText;
    }
}
