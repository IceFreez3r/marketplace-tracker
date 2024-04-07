class CookingTracker {
    static id = "cooking_tracker";
    static displayName = "Cooking Tracker";
    static icon = "<img src='/images/cooking/cooking_icon.png' alt='Cooking Tracker Icon' />";
    static category = "recipe";
    css = `
.anchor-cooking-preparation,
.anchor-cooking-preparation-list {
    height: unset;
}

.cooking-prep-table-container {
    flex: 0 0 auto;
    width: 100%;
}

.cooking-prep-table {
    display: grid;
    grid-auto-flow: column;
    overflow-x: auto;
}

.cooking-prep-table-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 4px 10px;
}

.cooking-prep-table-content.left-border {
    border-left: 2px solid rgba(0, 0, 0, 0.8);
}

.cooking-prep-table-content:first-child {
    grid-row: 3;
}

.cooking-prep-table-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
}

.cooking-prep-table-price {
  display: flex;
  flex-direction: column;
  align-items: end;
}

.cooking-prep-table-relative-price {
    font-size: 0.8em;
}

.anchor-cooking-content {
    flex-direction: column;
    flex-wrap: unset;
}

.anchor-cooking-content > .idlescape-container {
    flex-shrink: 1;
}

.anchor-cooking-main > div:first-child > div > div:first-child:not(.anchor-resource-cost),
.anchor-cooking-content .anchor-resource-cost-icon {
    background-color: rgba(0, 0, 0, 0.8);
}

.cooking-info-table {
    display: grid;
    grid-gap: 5px;
    place-items: center;
}

.cooking-info-table-content:first-child {
    grid-column: 2;
}

.cooking-info-table-content {
    display: flex;
}

.cooking-info-table-icon {
    margin: 4px 10px;
    width: 32px;
    height: 32px;
    object-fit: contain;
}

.cooking-info-table-icon.left {
    margin-right: 0;
}

.cooking-info-table-icon.right {
    margin-left: 0;
}

.cooking-info-table-font {
    font-size: 2.25rem;
    line-height: 2.5rem;
}`;

    alchemyTags = ["spicy", "sweet", "sour", "bitter"];

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;

        if (
            this.settings.min_row === undefined ||
            this.settings.median_row === undefined ||
            this.settings.max_row === undefined
        ) {
            this.settings.min_row = true;
            this.settings.median_row = true;
            this.settings.max_row = true;
        }
        if (this.settings.ignore_pots === undefined) {
            this.settings.ignore_pots = true;
        }
        this.settingChanged("ignore_pots", this.settings.ignore_pots);
        this.cssNode = injectCSS(this.css);

        this.lastCookedApiId = null;
        this.lastAugment = null;
        this.lastBuffSrc = null;

        this.cachedPreparationTable = "";

        this.playAreaObserver = new MutationObserver((mutations) => {
            this.checkForCooking(mutations);
        });
    }

    onGameReady() {
        const playAreaContainer = getPlayAreaContainer();
        this.playAreaObserver.observe(playAreaContainer, {
            attributes: true,
            childList: true,
            subtree: true,
        });
        this.sanitizeChatInput();
        this.cachedPreparationTable = this.preparationTable();
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
    }

    settingsMenuContent() {
        let rows = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Min Row
                </div>
                ${Templates.checkboxTemplate(CookingTracker.id + "-min_row", this.settings.min_row)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Median Row
                </div>
                ${Templates.checkboxTemplate(CookingTracker.id + "-median_row", this.settings.median_row)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Max Row
                </div>
                ${Templates.checkboxTemplate(CookingTracker.id + "-max_row", this.settings.max_row)}
            </div>`;

        let ignorePots = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Ignore Input Pots
                </div>
                ${Templates.checkboxTemplate(CookingTracker.id + "-ignore_pots", this.settings.ignore_pots)}
            </div>`;
        return [rows, ignorePots];
    }

    settingChanged(settingId, value) {
        switch (settingId) {
            case "ignore_pots":
                if (value) {
                    this.potIds = [2139, 2140, 2141, 2142, 2143, 2144, 2145, 2146, 2147, 2148, 2149];
                } else {
                    this.potIds = [];
                }
        }
        return;
    }

    onAPIUpdate() {
        this.cachedPreparationTable = this.preparationTable();
        this.checkForCooking(null, true);
    }

    checkForCooking(mutations, forceUpdate = false) {
        if (getSelectedSkill() === "Cooking") {
            if (mutations && detectInfiniteLoop(mutations)) {
                return;
            }
            this.cookingTracker(forceUpdate);
        }
    }

    cookingTracker(forceUpdate = false) {
        const selectedTabNode = document.querySelector(".cooking-tab-selected");
        const selectedTab = selectedTabNode.lastChild.textContent;
        if (selectedTab === "Preparing") {
            this.preparationTracker(forceUpdate);
        } else {
            this.recipeTable(forceUpdate);
        }
    }

    preparationTracker(forceUpdate = false) {
        const oldTable = document.querySelector(".cooking-prep-table-container");
        if (!forceUpdate && oldTable) {
            return;
        }
        oldTable?.remove();
        const prepContainer = document.querySelector(".cooking-container .idlescape-container");
        saveInsertAdjacentHTML(prepContainer.parentElement, "beforeend", this.cachedPreparationTable);
    }

    getBestIngredient(allIngredientApiIds, ingredientPriceData, ingredientIndices, cookingData, isAlchemy, field) {
        const bestIngredient = ingredientIndices.reduce(
            (min, index) => {
                const ingredientPrice = ingredientPriceData[field][index];
                const apiId = allIngredientApiIds[index];
                const size = isAlchemy ? cookingData[apiId].alchemySize : cookingData[apiId].size;
                if (ingredientPrice / size < min.price / min.size) {
                    return {
                        apiId: apiId,
                        price: ingredientPrice,
                        prices: {
                            minPrice: ingredientPriceData.minPrices[index],
                            medianPrice: ingredientPriceData.medianPrices[index],
                            maxPrice: ingredientPriceData.maxPrices[index],
                        },
                        size: size,
                    };
                }
                return min;
            },
            {
                apiId: undefined,
                price: Infinity,
                prices: {
                    minPrice: Infinity,
                    medianPrice: Infinity,
                    maxPrice: Infinity,
                },
                size: 0,
            }
        );
        delete bestIngredient.price;
        return bestIngredient;
    }

    preparationTable() {
        const itemObject = getIdlescapeWindowObject().items;
        const cookingData = getIdlescapeWindowObject().cooking;
        const preparedApiIds = Object.keys(cookingData).filter(
            (apiId) => cookingData[apiId].prepared && itemObject[apiId].tradeable
        );
        const allIngredientApiIds = Object.keys(cookingData).filter((apiId) => !cookingData[apiId].prepared);
        const ingredientPriceData = this.storage.analyzeItems(allIngredientApiIds);
        const inputData = preparedApiIds.map((apiId) => {
            const ingredientTag = cookingData[apiId].ingredientTags[0];
            const ingredientIndices = allIngredientApiIds
                .map((id, index) => index)
                .filter((index) => cookingData[allIngredientApiIds[index]].ingredientTags?.includes(ingredientTag));
            const isAlchemy = this.alchemyTags.includes(ingredientTag);
            return {
                apiId,
                prices: this.storage.analyzeItem(apiId),
                minIngredient: this.getBestIngredient(
                    allIngredientApiIds,
                    ingredientPriceData,
                    ingredientIndices,
                    cookingData,
                    isAlchemy,
                    "minPrices"
                ),
                medianIngredient: this.getBestIngredient(
                    allIngredientApiIds,
                    ingredientPriceData,
                    ingredientIndices,
                    cookingData,
                    isAlchemy,
                    "medianPrices"
                ),
                maxIngredient: this.getBestIngredient(
                    allIngredientApiIds,
                    ingredientPriceData,
                    ingredientIndices,
                    cookingData,
                    isAlchemy,
                    "maxPrices"
                ),
            };
        });
        // 5 rows (prep icon, market icon + ingredients, min, median, max), 4 columns per preparation ingredient (market, min, median, max)
        let fields = {
            min: this.settings.min_row,
            median: this.settings.median_row,
            max: this.settings.max_row,
        };
        const rows = 2 + this.settings.min_row + this.settings.median_row + this.settings.max_row;
        // left side
        let table = `
            <div class="cooking-prep-table-container idlescape-container">
                <div class="cooking-prep-table" style="grid-template-rows: repeat(${rows}, 1fr);">`;
        if (fields.min) table += `<div class="cooking-prep-table-content">Minimum Marketprice</div>`;
        if (fields.median) table += `<div class="cooking-prep-table-content">Median Marketprice</div>`;
        if (fields.max) table += `<div class="cooking-prep-table-content">Maximum Marketprice</div>`;
        // main table
        for (const data of inputData) {
            // Prevent duplicate columns
            const columns = Object.keys(fields).reduce((acc, key) => {
                if (fields[key] && data[key + "Ingredient"].apiId !== undefined) {
                    acc[key] = [key];
                }
                return acc;
            }, {});
            for (const column in columns) {
                const apiId = data[column + "Ingredient"].apiId;
                // if there is another column with the same id, add it's array to this and delete the other
                for (const otherColumn in columns) {
                    if (column === otherColumn) continue;
                    const otherApiId = data[otherColumn + "Ingredient"].apiId;
                    if (apiId === otherApiId) {
                        columns[column].push(...columns[otherColumn]);
                        delete columns[otherColumn];
                    }
                }
            }
            const span = 1 + Object.keys(columns).length;
            // Top Icon
            table += `
                <div class="cooking-prep-table-content top-icon left-border" style="grid-column: span ${span}">
                    <img class="cooking-prep-table-icon" src="${itemObject[data.apiId].itemImage}" alt="${
                itemObject[data.apiId].name
            }"/>
                </div>`;
            // Marketplace column
            table += `
                <div class="cooking-prep-table-content left-border">
                    <img class="cooking-prep-table-icon" src="/images/ui/marketplace_icon.png" alt="Marketprice"/>
                </div>`;
            for (const column in fields) {
                if (!fields[column]) continue;
                table += `
                    <div class="cooking-prep-table-content left-border">
                        ${formatNumber(data.prices[column + "Price"])}
                    </div>`;
            }
            // Best min/median/max ingredient columns
            for (const column in columns) {
                const columnData = data[column + "Ingredient"];
                if (!columnData.apiId) continue;
                table += `
                    <div class="cooking-prep-table-content">
                        <img class="cooking-prep-table-icon" src="${itemObject[columnData.apiId].itemImage}" alt="${
                    itemObject[columnData.apiId].name
                }"/>
                        ${columnData.size}
                    </div>
                    ${
                        fields["min"]
                            ? `<div class="cooking-prep-table-content">
                        <div class="cooking-prep-table-price">
                            <div>${formatNumber(columnData.prices.minPrice)}</div>
                            <div class="cooking-prep-table-relative-price">(${formatNumber(
                                columnData.prices.minPrice / columnData.size
                            )})</div>
                        </div>
                        ${columns[column].includes("min") ? Templates.dotTemplate("1em", "", "rgb(0, 255, 0)") : ""}
                    </div>`
                            : ""
                    }
                    ${
                        fields["median"]
                            ? `<div class="cooking-prep-table-content">
                        <div class="cooking-prep-table-price">
                            <div>${formatNumber(columnData.prices.medianPrice)}</div>
                            <div class="cooking-prep-table-relative-price">(${formatNumber(
                                columnData.prices.medianPrice / columnData.size
                            )})</div>
                        </div>
                        ${columns[column].includes("median") ? Templates.dotTemplate("1em", "", "rgb(0, 255, 0)") : ""}
                    </div>`
                            : ""
                    }
                    ${
                        fields["max"]
                            ? `<div class="cooking-prep-table-content">
                        <div class="cooking-prep-table-price">
                            <div>${formatNumber(columnData.prices.maxPrice)}</div>
                            <div class="cooking-prep-table-relative-price">(${formatNumber(
                                columnData.prices.maxPrice / columnData.size
                            )})</div>
                        </div>
                        ${columns[column].includes("max") ? Templates.dotTemplate("1em", "", "rgb(0, 255, 0)") : ""}
                    </div>`
                            : ""
                    }`;
            }
        }
        table += "</div></div>";
        return table;
    }

    recipeTable(forceUpdate = false) {
        const productNode = document.querySelector(".anchor-cooking-result");
        const productIcon = productNode.querySelector(".item-icon")?.src;
        if (!productIcon) {
            return;
        }
        const productApiId = convertApiId(productNode.firstChild);
        const augment = parseInt(productNode.querySelector(".item-augment")?.textContent.split("+")[1] ?? 0);
        const buffSrc = productNode.querySelector(".anchor-item-enchant")?.src;
        const buffSrcShort = buffSrc ? buffSrc.split("/").pop() : null;
        if (
            !forceUpdate &&
            productApiId === this.lastCookedApiId &&
            augment === this.lastAugment &&
            buffSrc === this.lastBuffSrc
        ) {
            return;
        }
        // TODO: fish oil? maybe as negative ingredient
        const buffStacks = this.buffStacks(augment, productApiId, buffSrcShort);
        const totalHeal = this.totalHeal(productApiId, augment);

        const resourceNodes = Array.from(document.querySelectorAll(".anchor-resource-cost"));
        let resourceApiIds = resourceNodes.map((node) => convertApiId(node));
        const pots = resourceApiIds.map((id) => this.potIds.includes(Number(id)));
        resourceApiIds = resourceApiIds.filter((id, index) => !pots[index]);
        const resourceCounts = resourceNodes
            .map((node) => node.querySelector(".anchor-resource-cost-amount").textContent)
            .filter((count, index) => !pots[index]);
        const resourceIcons = resourceNodes
            .map((node) => node.querySelector(".anchor-resource-cost-icon").src)
            .filter((icon, index) => !pots[index]);

        const timePerAction = parseFloat(document.querySelector(".anchor-cooking-duration").textContent);

        const recipePrices = this.storage.handleRecipe(resourceApiIds, productApiId);

        const ingredients = Object.assign(recipePrices.ingredients, {
            icons: resourceIcons,
            counts: resourceCounts,
        });
        const totalMinRecipePrice = totalRecipePrice(ingredients.minPrices, resourceCounts);
        const totalMedianRecipePrice = totalRecipePrice(ingredients.medianPrices, resourceCounts);
        const totalMaxRecipePrice = totalRecipePrice(ingredients.maxPrices, resourceCounts);
        let product = {
            minPrices: [],
            medianPrices: [],
            maxPrices: [],
            vendorPrices: [],
            icons: [],
            counts: [],
        };
        if (buffStacks > 1) {
            product.minPrices.push(totalMinRecipePrice / buffStacks);
            product.medianPrices.push(totalMedianRecipePrice / buffStacks);
            product.maxPrices.push(totalMaxRecipePrice / buffStacks);
            product.vendorPrices.push(0);
            product.icons.push(
                `
                    <img class="cooking-info-table-icon left" src="/images/money_icon.png" alt="Gold per Stacks">
                    <span class="cooking-info-table-font">/</span>
                    <img class="cooking-info-table-icon right" src="${buffSrc}" alt="Buff Icon">`
            );
            product.counts.push(0);
        }
        if (totalHeal > 0) {
            product.minPrices.push(totalMinRecipePrice / totalHeal);
            product.medianPrices.push(totalMedianRecipePrice / totalHeal);
            product.maxPrices.push(totalMaxRecipePrice / totalHeal);
            product.vendorPrices.push(0);
            product.icons.push(
                `
                    <img class="cooking-info-table-icon left" src="/images/money_icon.png" alt="Gold per Heal">
                    <span class="cooking-info-table-font">/</span>
                    <img class="cooking-info-table-icon right" src="/images/combat/constitution_icon.png" alt="Heal">`
            );
            product.counts.push(0);
        }

        document.querySelector(".cooking-info-table")?.remove();
        const cookingMain = document.querySelector(".anchor-cooking-main");
        saveInsertAdjacentHTML(
            cookingMain,
            "beforeend",
            Templates.infoTableTemplate(
                "cooking",
                [this.settings.min_row, this.settings.median_row, this.settings.max_row],
                ingredients,
                product,
                "off",
                timePerAction,
                "idlescape-container"
            )
        );

        this.lastCookedApiId = productApiId;
        this.lastAugment = augment;
        this.lastBuffSrc = buffSrc;
    }

    // modified version of the games own buffStacks function
    buffStacks(augments, apiId, enchantmentSrc) {
        if (!enchantmentSrc) {
            return null;
        }
        const items = getIdlescapeWindowObject().items;
        const itemMultiplier = items[apiId].stackMultiplier ?? 1;
        const enchantmentMultiplier = getEnchantmentBySrc(enchantmentSrc).stackMult ?? 1;
        return Math.max(1, Math.floor((1 + augments * 2) * itemMultiplier * enchantmentMultiplier));
    }

    totalHeal(apiId, augments) {
        const itemData = getItemData(apiId);
        if (!itemData?.healing) {
            return 0;
        }
        const totalTicks = itemData.healing.totalTicks ?? 0;
        const healTick = Math.floor((itemData.healing.perTick ?? 0) * Math.max(1, (1 + augments) / 2)) ?? 0;
        const healing = itemData.healing.hp * (1 + augments) ?? 0;
        return totalTicks * healTick + healing;
    }

    // yes this is absolutely necessary
    sanitizeChatInput() {
        const chatInput = document.querySelector(".chat-container > .anchor-idlescape-input .chakra-input");
        if (!chatInput) {
            return;
        }
        chatInput.addEventListener("input", (event) => {
            const input = event.target.value;
            if (input.toLowerCase().includes("beav")) {
                const newValue = input.replace(/beav/gi, "Ice");
                setReactNativeValue(chatInput, newValue);
            }
        });
    }
}
