class RunecraftingTracker{
    static id = 'runecrafting_tracker';
    static displayName = 'Runecrafting Tracker';
    static icon = '<img src="/images/runecrafting/RuneCraftingIcon.png" alt="Runecrafting Tracker Icon"/>';
    static category = 'recipe';
    css = `
body .resource-as-row-container {
    grid-template-rows: 70px 8px auto;
    grid-template-areas: "image title resources button"
                        "bar bar bar bar"
                        "info info info info";
    height: unset;
}

body .essence-list {
    grid-template-rows: unset;
}

body .runecrafting-essence-display {
    display: flex;
    align-items: center;
    justify-content: center;
}

body .runecrafting-essence-counter {
    height: unset;
    padding-top: unset;
    position: unset;
}

.runecrafting-info-table {
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

.runecrafting-info-table-content {
    display: flex;
}

.runecrafting-info-table-content:first-child {
    grid-column: 2;
}

.runecrafting-info-table-icon{
    height: 24px;
    width: 24px;
}

.runecrafting-info-table-font {
    font-size: 1.5rem;
    line-height: 2rem;
}

    `;

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;
        if (this.settings.profit === undefined) {
            this.settings.profit = "flat";
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

        this.playAreaObserver = new MutationObserver(mutations => {
            this.playAreaObserver.disconnect();
            this.checkForRunecrafting(mutations);
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
        let profitType = document.createElement('div');
        profitType.classList.add('tracker-module-setting');
        profitType.insertAdjacentHTML('beforeend', `
        <div class="tracker-module-setting-name">
            Profit
        </div>`);
        profitType.append(Templates.selectMenu(RunecraftingTracker.id + "-profit", {
            off: "Off",
            percent: "Percent",
            flat: "Flat",
            per_hour: "Per Hour",
        }, this.settings.profit));
        const rows = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Min Row
                </div>
                ${Templates.checkboxTemplate(RunecraftingTracker.id + "-min_row", this.settings.min_row)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Median Row
                </div>
                ${Templates.checkboxTemplate(RunecraftingTracker.id + "-median_row", this.settings.median_row)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Max Row
                </div>
                ${Templates.checkboxTemplate(RunecraftingTracker.id + "-max_row", this.settings.max_row)}
            </div>`;
        return [profitType, rows];
    }

    settingChanged(settingId, value) {
        return;
    }

    onAPIUpdate() {
        this.checkForRunecrafting();
    }

    connectPlayAreaObserver() {
        const playAreaContainer = getPlayAreaContainer();
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true,
        });
    }

    checkForRunecrafting(mutations) {
        if (getSelectedSkill() === "Runecrafting") {
            if (mutations && detectInfiniteLoop(mutations)) {
                return;
            }
            this.runecraftingTracker();
        }
    }

    runecraftingTracker() {
        if (document.getElementsByClassName("runecrafting-container").length === 0) {
            return;
        }
        const activeTab = getSelectedSubSkill();
        const recipes = document.getElementsByClassName("resource-as-row-container");
        const essenceDisplays = document.getElementsByClassName("runecrafting-essence-display");
        const activeTalismans = [];
        for (const essenceDisplay of essenceDisplays) {
            activeTalismans.push(essenceDisplay.getElementsByClassName("has-talisman").length > 0);
        }
        for (let i = 0; i < recipes.length; i++) {
            this.processRecipe(recipes[i], activeTab, activeTalismans[i]);
        }
    }

    processRecipe(recipe, activeTab, activeTalisman) {
        recipe.getElementsByClassName("runecrafting-info-table")[0]?.remove();

        const productApiId = convertApiId(recipe);
        const productIcon = recipe.getElementsByClassName("resource-as-row-image")[0].src;

        const resources = recipe.getElementsByClassName("resource-node-time-tooltip"); // very interesting class name
        const ingredientApiIds = [];
        const ingredientIcons = [];
        const ingredientAmounts = [];
        let timePerAction = 0;
        let experiencePerAction = 0;
        for (const resource of resources) {
            const ingredientId = convertItemId(resource.firstElementChild.src);
            if (ingredientId === "RuneCraftingIcon") {
                // required runecrafting level, irrelevant for us
                continue;
            }
            if (ingredientId === "imbued_elder_cloth") {
                // dungeon drop chance, irrelevant for us
                continue;
            }
            if (ingredientId === "clock") {
                timePerAction = parseFloat(resource.childNodes[1].innerText);
                continue;
            }
            if (ingredientId === "total_level") {
                experiencePerAction = parseInt(resource.childNodes[1].innerText);
                continue;
            }
            ingredientApiIds.push(convertApiId(resource));
            ingredientIcons.push(resource.firstElementChild.src);
            ingredientAmounts.push(parseInt(resource.childNodes[1].innerText));
        }
        const productAmount = RunecraftingTracker.productAmount(activeTab, activeTalisman);

        const recipePrices = this.storage.handleRecipe(ingredientApiIds, productApiId);
        const ingredients = Object.assign(recipePrices.ingredients, { icons: ingredientIcons, counts: ingredientAmounts });
        const product = Object.assign(recipePrices.products, { icons: [productIcon], counts: [productAmount] });
        saveInsertAdjacentHTML(
            recipe,
            "beforeend",
            Templates.infoTableTemplate(
                "runecrafting",
                [this.settings.min_row, this.settings.median_row, this.settings.max_row],
                ingredients,
                product,
                this.settings.profit,
                timePerAction
            )
        );
    }

    static productAmount(activeTab, activeTalisman) {
        if (activeTab === "Cloth Weaving") {
            return 1;
        }
        if (activeTab === "Runecrafting") {
            return 1 + getSkillLevel("runecrafting", false, true) / 20 + activeTalisman;
        }
    }
}
