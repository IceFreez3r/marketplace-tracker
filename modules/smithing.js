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
        if (this.settings.profit === undefined || this.settings.profit === "none") { // 2nd check for backwards compatibility
            this.settings.profit = "percent";
        }
        this.cssNode = injectCSS(this.css);
        this.ingredients = {};

        this.playAreaObserver = new MutationObserver(mutations => {
            if (getSelectedSkill() === "Smithing") {
                if (detectInfiniteLoop(mutations)) {
                    return;
                }
                this.smithingTracker();
            }
        });
    }
    
    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            attributes: true,
            subtree: true
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
    }

    settingsMenuContent() {
        let moduleSetting = document.createElement('div');
        moduleSetting.classList.add('tracker-module-setting');
        moduleSetting.insertAdjacentHTML('beforeend', `
            <div class="tracker-module-setting-name">
                Profit
            </div>`);
        moduleSetting.append(Templates.selectMenu(SmithingTracker.id + "-profit", {
            off: "Off",
            percent: "Percent",
            flat: "Flat",
            per_hour: "Per Hour",
        }, this.settings.profit));
        return moduleSetting;
    }

    settingChanged(settingId, value) {
        return;
    }

    onAPIUpdate() {
        return;
    }

    smithingTracker() {
        const smithingInfo = document.getElementsByClassName('smithing-information')[0];
        const inputContainer = smithingInfo.getElementsByClassName('smithing-information-inputs')[0];
        const inputs = inputContainer.getElementsByClassName('smithing-information-input');
        const ingredientIds = [];
        const ingredientIcons = [];
        const ingredientCounts = [];
        for(const input of inputs) {
            ingredientIds.push(convertItemId(input.getElementsByClassName('smithing-information-input-icon')[0].src));
            ingredientIcons.push(input.getElementsByClassName('smithing-information-input-icon')[0].src);
            ingredientCounts.push(parseInt(input.getElementsByClassName('smithing-information-input-amount')[0].innerText));
        }

        const outputContainer = smithingInfo.getElementsByClassName('smithing-information-output')[0];
        // game reuses the input css classes for the output
        const outputs = outputContainer.getElementsByClassName('smithing-information-input');
        const productId = convertItemId(outputs[0].getElementsByClassName('smithing-information-input-icon')[0].src);
        const productIcon = outputs[0].getElementsByClassName('smithing-information-input-icon')[0].src;
        let productCount = parseInt(outputs[0].getElementsByClassName('smithing-information-input-amount')[0].innerText);
        // more than one output -> second one is chance to get an extra bar
        if (outputs.length > 1) {
            productCount += parseInt(outputs[1].getElementsByClassName('smithing-information-input-owned')[0].childNodes[2].textContent) / 100;
        }

        const recipePrices = this.storage.handleRecipe(ingredientIds, productId);
        const ingredients = Object.assign(recipePrices.ingredients, { icons: ingredientIcons, counts: ingredientCounts });
        if (deepCompare(this.ingredients, ingredients)) {
            return;
        }
        this.ingredients = ingredients;

        const product = Object.assign(recipePrices.product, { icon: productIcon, count: productCount });
        const timePerAction = parseFloat(smithingInfo.getElementsByClassName('smithing-information-calculations')[0].getElementsByClassName('smithing-information-input-amount')[0].firstChild.textContent);

        document.getElementsByClassName("smithing-info-table")[0]?.parentElement.remove();
        saveInsertAdjacentHTML(smithingInfo, 'afterend', `
            <div class="idlescape-container tracker-ignore">
                ${Templates.infoTableTemplate('smithing', this.ingredients, product, this.settings.profit, false, false, timePerAction)}
            </div>`);
    }
}
