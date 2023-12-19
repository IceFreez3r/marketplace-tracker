class SmithingTracker {
    static id = "smithing_tracker";
    static displayName = "Smithing Tracker";
    static icon = "<img src='/images/smithing/smithing_icon.png' alt='Smithing Tracker Icon'>";
    static category = "recipe";
    css = `
.smithing-info-table {
    display: grid;
    /* Grid Layout specified by js */
    grid-gap: 3px;
    grid-column: 1 / -1;
    place-items: center;
    background-color: rgba(0,0,0,.3);
    padding: 5px;
}

.smithing-info-table-content {
    display: flex;
    align-items: center;
}

.smithing-info-table-content:first-child {
    grid-column: 2;
}

.smithing-info-table-icon {
    height: 40px;
    width: 40px;
    object-fit: contain;
    padding-right: 2px;
}

.smithing-info-table-font {
    font-size: 2.25rem;
    line-height: 2rem;
}

.smithing-intensity {
    width: 95%;
    margin: auto;
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
            this.settings.min_column === undefined ||
            this.settings.median_column === undefined ||
            this.settings.max_column === undefined
        ) {
            this.settings.min_column = true;
            this.settings.median_column = true;
            this.settings.max_column = true;
        }
        this.cssNode = injectCSS(this.css);
        this.ingredients = {};

        this.playAreaObserver = new MutationObserver((mutations) => {
            this.checkForSmithing(mutations);
        });
    }

    onGameReady() {
        const playAreaContainer = getPlayAreaContainer();
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            attributes: true,
            subtree: true,
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
    }

    settingsMenuContent() {
        let profitType = document.createElement("div");
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
                SmithingTracker.id + "-profit",
                {
                    off: "Off",
                    percent: "Percent",
                    flat: "Flat",
                    per_hour: "Per Hour",
                },
                this.settings.profit
            )
        );
        const columns = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Min Column
                </div>
                ${Templates.checkboxTemplate(SmithingTracker.id + "-min_column", this.settings.min_column)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Median Column
                </div>
                ${Templates.checkboxTemplate(SmithingTracker.id + "-median_column", this.settings.median_column)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Max Column
                </div>
                ${Templates.checkboxTemplate(SmithingTracker.id + "-max_column", this.settings.max_column)}
            </div>`;
        return [profitType, columns];
    }

    settingChanged(settingId, value) {
        return;
    }

    onAPIUpdate() {
        this.checkForSmithing(null, true);
    }

    checkForSmithing(mutations, forceUpdate = false) {
        if (getSelectedSkill() === "Smithing") {
            if (mutations && detectInfiniteLoop(mutations)) {
                return;
            }
            this.smithingTracker(forceUpdate);
        } else {
            this.ingredients = {};
        }
    }

    smithingTracker(forceUpdate = false) {
        const smithingInfo = document.getElementsByClassName("smithing-information")[0];
        const inputContainer = smithingInfo.getElementsByClassName("smithing-information-inputs")[0];
        const inputs = inputContainer.getElementsByClassName("anchor-resource-cost");
        const ingredientApiIds = [];
        const ingredientIcons = [];
        const ingredientCounts = [];
        for (const input of inputs) {
            ingredientApiIds.push(convertApiId(input));
            ingredientIcons.push(input.getElementsByClassName("anchor-resource-cost-icon")[0].src);
            ingredientCounts.push(
                parseCompactNumberString(input.getElementsByClassName("anchor-resource-cost-amount")[0].innerText)
            );
        }

        const outputContainer = smithingInfo.getElementsByClassName("smithing-information-output")[0];
        // game reuses the input css classes for the output
        const outputs = outputContainer.getElementsByClassName("smithing-information-input");
        const productId = convertApiId(outputs[0]);
        const productIcon = outputs[0].getElementsByClassName("smithing-information-input-icon")[0].src;
        let productCount = parseInt(outputs[0].getElementsByClassName("smithing-information-input-amount")[0].innerText);
        // more than one output -> second one is chance to get an extra bar
        if (outputs.length > 1) {
            productCount += parseInt(outputs[1].getElementsByClassName("smithing-information-input-owned")[0].childNodes[2].textContent) / 100;
        }

        const recipePrices = this.storage.handleRecipe(ingredientApiIds, productId);
        const ingredients = Object.assign(recipePrices.ingredients, { icons: ingredientIcons, counts: ingredientCounts });
        if (!forceUpdate && deepCompare(this.ingredients, ingredients)) {
            return;
        }
        this.ingredients = ingredients;

        const product = Object.assign(recipePrices.product, { icon: productIcon, count: productCount });
        const timePerAction = parseTimeString(
            smithingInfo
                .getElementsByClassName("smithing-information-calculations")[0]
                .getElementsByClassName("smithing-information-input-amount")[0].firstChild.textContent
        ) / 1000;

        document.getElementsByClassName("smithing-info-table")[0]?.parentElement.remove();
        saveInsertAdjacentHTML(
            smithingInfo,
            "afterend",
            `
            <div class="idlescape-container tracker-ignore">
                ${Templates.infoTableTemplate(
                    "smithing",
                    [this.settings.min_column, this.settings.median_column, this.settings.max_column],
                    this.ingredients,
                    product,
                    this.settings.profit,
                    false,
                    false,
                    timePerAction
                )}
            </div>`
        );
    }
}
