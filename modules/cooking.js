class CookingTracker {
    static id = "cooking_tracker";
    static displayName = "Cooking Tracker";
    static icon = "<img src='/images/cooking/cooking_icon.png' alt='Cooking Tracker Icon' />";
    static category = "recipe";
    css = `
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

.cooking-info-table-vendor-icon {
    width: 16px;
    height: 16px;
    object-fit: contain;
}

.cooking-info-table-font {
    font-size: 2.25rem;
    line-height: 2.5rem;
}`;

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;

        if (
            this.settings.min_column === undefined ||
            this.settings.median_column === undefined ||
            this.settings.max_column === undefined
        ) {
            this.settings.min_column = true;
            this.settings.median_column = true;
            this.settings.max_column = true;
        }
        if (this.settings.ignore_pots === undefined) {
            this.settings.ignore_pots = true;
        }
        this.settingChanged("ignore_pots", this.settings.ignore_pots);
        this.cssNode = injectCSS(this.css);

        this.lastCookedApiId = null;
        this.lastAugment = null;
        this.lastBuffSrc = null;

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
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
    }

    settingsMenuContent() {
        let columns = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Minimum Column
                </div>
                ${Templates.checkboxTemplate(CookingTracker.id + "-min_column", this.settings.min_column)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Median Column
                </div>
                ${Templates.checkboxTemplate(CookingTracker.id + "-median_column", this.settings.median_column)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Maximum Column
                </div>
                ${Templates.checkboxTemplate(CookingTracker.id + "-max_column", this.settings.max_column)}
            </div>`;

        let ignorePots = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Ignore Input Pots
                </div>
                ${Templates.checkboxTemplate(CookingTracker.id + "-ignore_pots", this.settings.ignore_pots)}
            </div>`;
        return [columns, ignorePots];
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
            return;
        }
        const productNode = document.querySelector(".anchor-cooking-result");
        const productIcon = productNode.querySelector(".item-icon")?.src;
        if (!productIcon) {
            return;
        }
        const productApiId = convertApiId(productNode.firstChild);
        const augment = parseInt(productNode.querySelector(".item-augment")?.textContent.split("+")[1]);
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
                [this.settings.min_column, this.settings.median_column, this.settings.max_column],
                ingredients,
                product,
                "off",
                false,
                false,
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
        const itemData = getIdlescapeWindowObject().items[apiId];
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
