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
        this.cssNode = injectCSS(this.css);

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
        return [profitType, rows];
    }

    settingChanged(settingId, value) {
        return;
    }

    onAPIUpdate() {
        this.checkForEnchanting();
    }

    connectPlayAreaObserver() {
        const playAreaContainer = getPlayAreaContainer();
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true,
        });
    }

    checkForEnchanting(mutations) {
        if (getSelectedSkill() === "Enchanting" && this.selectedTab() === "Scrollcrafting") {
            if (mutations && detectInfiniteLoop(mutations)) {
                return;
            }
            this.enchantingTracker();
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
        let resourceApiIds = ["1600"].concat(
            dynamicResources.map((resource) => resource.apiId)
        );
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
                false,
                false,
                standardResources.timePerAction,
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

    selectedTab() {
        return document.getElementsByClassName("enchanting-tab-selected")[0].lastElementChild.innerText;
    }
}
