const FORGE_REFINING_PROBABILITY_ADJUSTMENT = 120_000_000;
const SAPPHIRE_ID = 400;

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
    overflow-x: scroll;
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

/* Copy of chakra input */
#tracker-refining-input {
    min-width: 0px;
    outline: 2px solid transparent;
    outline-offset: 2px;
    position: relative;
    appearance: none;
    transition-property: var(--chakra-transition-property-common);
    transition-duration: var(--chakra-transition-duration-normal);
    font-size: var(--chakra-fontSizes-md);
    padding-inline-start: var(--chakra-space-4);
    padding-inline-end: var(--chakra-space-4);
    height: var(--chakra-sizes-10);
    border-radius: var(--chakra-radii-md);
    border: 1px solid;
    border-color: inherit;
    background: inherit;
    width: 100%;
}
#tracker-refining-input:hover {
    border-color: var(--chakra-colors-gray-300);
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
            this.settings.min_row === undefined ||
            this.settings.median_row === undefined ||
            this.settings.max_row === undefined
        ) {
            this.settings.min_row = true;
            this.settings.median_row = true;
            this.settings.max_row = true;
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
        const rows = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Min Row
                </div>
                ${Templates.checkboxTemplate(SmithingTracker.id + "-min_row", this.settings.min_row)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Median Row
                </div>
                ${Templates.checkboxTemplate(SmithingTracker.id + "-median_row", this.settings.median_row)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Max Row
                </div>
                ${Templates.checkboxTemplate(SmithingTracker.id + "-max_row", this.settings.max_row)}
            </div>`;
        return [profitType, rows];
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
        const forge = this.getForge();
        const intensity = parseInt(document.querySelector(".smithing-intensity-slider-thumb").textContent);

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
        const productApiId = convertApiId(outputs[0]);
        const productIcon = outputs[0].getElementsByClassName("smithing-information-input-icon")[0].src;
        let productCount = parseInt(
            outputs[0].getElementsByClassName("smithing-information-input-amount")[0].innerText
        );
        // more than one output -> second one is chance to get an extra bar
        if (outputs.length > 1) {
            productCount +=
                parseInt(
                    outputs[1].getElementsByClassName("smithing-information-input-owned")[0].childNodes[2].textContent
                ) / 100;
        }
        const infoNode = smithingInfo.querySelector(".smithing-information-calculations");
        const timePerAction =
            parseTimeString(
                infoNode.getElementsByClassName("smithing-information-input-amount")[0].firstChild.textContent
            ) / 1000;

        let productApiIds = [productApiId];
        let productIcons = [productIcon];
        let productCounts = [productCount];

        // Insert refining strength input if it doesn't exist yet
        let refiningInput = document.getElementById("tracker-refining-input");
        if (!refiningInput) {
            saveInsertAdjacentHTML(
                infoNode,
                "beforeend",
                `
                <div>
                    <label for="tracker-refining-input">Refining Strength</label>
                    <input id="tracker-refining-input" type="number" min="0" value="${this.refiningStrength ?? 0}">
                </div>`
            );
            refiningInput = document.getElementById("tracker-refining-input");
            refiningInput.addEventListener("input", () => {
                this.checkForSmithing(null, true);
            });
        }
        // Refining has 2 str per level
        const refiningStrength = (refiningInput.value ?? 0) * 2;
        if (refiningStrength > 0) {
            const itemList = getIdlescapeWindowObject().items;
            const productData = itemList[productApiId];
            const duration = this.getForgeTime(productData, forge, intensity);
            const refiningChance =
                (duration * forge.refiningStrengthMult * refiningStrength) / FORGE_REFINING_PROBABILITY_ADJUSTMENT;
            const refiningOutput = this.refiningTable(forge, productData, intensity, refiningStrength, refiningChance);
            console.log(refiningChance, refiningOutput);
            const refiningItems = refiningOutput.map((item) => item.id);
            const refiningCounts = refiningOutput.map((item) => item.amount);
            const refiningIcons = refiningOutput.map((item) => itemList[item.id].itemImage);

            productApiIds.push(...refiningItems);
            productIcons.push(...refiningIcons);
            productCounts.push(...refiningCounts);
        }

        const recipePrices = this.storage.handleRecipe(ingredientApiIds, productApiIds);
        const ingredients = Object.assign(recipePrices.ingredients, {
            icons: ingredientIcons,
            counts: ingredientCounts,
        });
        if (!forceUpdate && deepCompare(this.ingredients, ingredients) && this.refiningStrength === refiningStrength) {
            return;
        }
        this.ingredients = ingredients;

        const product = Object.assign(recipePrices.products, {
            icons: productIcons,
            counts: productCounts,
        });

        document.getElementsByClassName("smithing-info-table")[0]?.parentElement.remove();
        saveInsertAdjacentHTML(
            smithingInfo,
            "afterend",
            `
            <div class="idlescape-container tracker-ignore">
                ${Templates.infoTableTemplate(
                    "smithing",
                    [this.settings.min_row, this.settings.median_row, this.settings.max_row],
                    this.ingredients,
                    product,
                    this.settings.profit,
                    timePerAction
                )}
            </div>`
        );
    }

    getForge() {
        const forges = getIdlescapeWindowObject().forges;
        const forgeImage = document.querySelector(".smithing-furnace-list-item-active > img").src;
        return Object.values(forges).find((forge) => forgeImage.endsWith(forge.image));
    }

    getForgeTime(bar, forge, intensity) {
        const forgeSpeedMult = forge.forgeSpeedMult;
        const intensityMult = this.getIntensitySpeedMult(this.getBarTier(bar), intensity, forge);
        return bar.time * forgeSpeedMult * intensityMult;
    }

    getBarTier(bar) {
        return bar.smithingTier ?? Math.max(1, Math.round((bar.level || 1) / 10));
    }

    getIntensitySpeedMult(barTier, intensity, forge) {
        return forge.forgeIntensitySpeedMult ** (intensity - barTier);
    }

    refiningTable(forge, bar, intensity, refiningStrength, refiningChance) {
        const chancePower = (1 + refiningStrength / 8) * (1 + intensity / 16);
        const chanceAdd = (this.getBarTier(bar) + intensity) / 666;
        let table = [];
        for (const loot of forge.refiningTable) {
            // This ignore obsidian forgery, which would increase the chance of obby glass in forge 1
            if (loot.chance === undefined) continue;
            table.push({
                ...loot,
                chance: Math.max(0, Math.min(1, 1 - (1 - loot.chance - chanceAdd) ** chancePower)),
            });
        }
        // Should sort so lowest chances are first
        table.sort((a, b) => {
            if (b.chance && a.chance) {
                return a.chance - b.chance;
            }
            return 0;
        });
        const missingToOne = 1 - (table[table.length - 1].chance || 0);
        // Compute individual chances
        for (let i = table.length - 1; i > 0; i--) {
            const entry = table[i];
            if (!entry.chance) continue;
            entry.chance -= table[i - 1].chance || 0;
        }
        let added = false;
        for (const loot of table) {
            if (loot.id === SAPPHIRE_ID && loot.chance) {
                loot.chance += missingToOne;
                added = true;
                break;
            }
        }
        if (!added) {
            table.push({ id: SAPPHIRE_ID, chance: missingToOne });
        }
        table = table.filter((loot) => loot.chance && loot.chance > 0);
        table = table.map((loot) => ({
            id: loot.id,
            amount: loot.chance * (loot.minAmount ?? 1) * (loot.maxAmount ?? 1) * refiningChance,
        }));
        return table;
    }
}
