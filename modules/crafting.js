class CraftingTracker {
    static id = "crafting_tracker"
    static displayName = "Crafting Tracker";
    static icon = "<img src='images/ui/crafting_icon.png' alt='Crafting Tracker Icon'/>";
    static category = "recipe";
    css = `
.crafting-item-container {
    display: flex;
    flex-direction: column;
}

body .crafting-container {
    height: auto;
    flex: 1 0 auto;
}

.crafting-info-table {
    display: grid; /* Grid Layout specified by js */
    grid-gap: 5px;
    /* combination of rgba(36, 36, 36, .671) in front of rgba(0, 0, 0, .705) */
    background: rgba(24.156, 24.156, 24.156, .902945);
    border: 2px solid gray;
    padding: 6px;
    margin-top: 6px;
    border-radius: 6px;
    place-items: center;
}

.crafting-info-table-content:first-child {
    grid-column: 2;
}

.crafting-info-table-icon {
    margin: 4px 10px;
    width: 32px;
    height: 32px;
    object-fit: contain;
}

.crafting-info-table-font {
    font-size: 2.25rem;
    line-height: 2.5rem;
}

/* Gold per experience */
.crafting-gold-per-exp {
    text-align: center;
    font-size: 16px;
}

.crafting-gold-per-exp-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
}
    `;

    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        if (this.settings.profit === undefined || this.settings.profit === "none") { // 2nd check for backwards compatibility
            this.settings.profit = "off";
        }
        if (this.settings.goldPerXP === undefined) {
            this.settings.goldPerXP = 1;
        }
        this.cssNode = injectCSS(this.css);

        this.lastCraftedItemId = null;
        this.lastSelectedNavTab = null;

        this.playAreaObserver = new MutationObserver(mutations => {
            if (detectInfiniteLoop(mutations)) {
                return;
            }
            if (getSelectedSkill() === "Crafting") {
                this.craftingTracker();
            }
        });
    }

    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.playAreaObserver.observe(playAreaContainer, {
            attributes: true,
            attributeFilter: ['src'],
            childList: true,
            subtree: true,
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
    }

    settingsMenuContent() {
        let moduleSetting = document.createElement('div');
        moduleSetting.classList.add('tracker-module-setting');
        moduleSetting.insertAdjacentHTML('beforeend',`
            <div class="tracker-module-setting-name">
                Profit
            </div>`);
        moduleSetting.append(Templates.selectMenu(CraftingTracker.id + "-profit", {
                off: "Off",
                percent: "Percent",
                flat: "Flat",
            }, this.settings.profit));

        const goldPerXP = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Show Gold Per Experience
                </div>
                ${Templates.checkboxTemplate(CraftingTracker.id + "-goldPerXP", this.settings.goldPerXP)}
            </div>`;
        return [moduleSetting, goldPerXP];
    }

    settingChanged(settingId, value) {
        return;
    }

    craftingTracker(){
        let recipeNode = document.getElementsByClassName("crafting-container")[0];
        if (!recipeNode) {
            this.lastCraftedItemId = null;
            return;
        }
        const craftedItemId = convertItemId(recipeNode.getElementsByClassName("crafting-item-icon")[0].firstChild.src);
        let craftingAmount = 1;
        // prevent repeated calls
        if (craftedItemId === this.lastCraftedItemId) {
            // for items with multiple recipes
            const selectedNavTab = recipeNode.getElementsByClassName("selected-tab")[0];
            if (!selectedNavTab) {
                return;
            }
            if (this.lastSelectedNavTab === selectedNavTab.innerText) {
                return;
            }
            this.lastSelectedNavTab = selectedNavTab.innerText;
            // amount of crafts might be higher than one when only switching recipes for the same item
            craftingAmount = document.getElementById('craftCount').value;
        }
        this.lastCraftedItemId = craftedItemId;

        const craftedItemIcon = recipeNode.getElementsByClassName("crafting-item-icon")[0].firstChild.src;
        let craftedItemCount = 1;
        // for recipes which result in more than one item (usually baits)
        const description = recipeNode.getElementsByClassName('crafting-item-description')[0].innerText;
        const regex = /(?<=Each craft results in )\d+/.exec(description);
        if (regex !== null) {
            craftedItemCount = parseInt(regex[0]);
        }

        const resourceItemNodes = recipeNode.getElementsByClassName("crafting-item-resource");
        let resourceItemIds = [];
        let resourceItemIcons = [];
        let resourceItemCounts = [];
        for (let i = 0; i < resourceItemNodes.length; i++) {
            let resourceItemId = convertItemId(resourceItemNodes[i].childNodes[1].src);
            if (resourceItemId.includes('essence')) {
                continue;
            }
            resourceItemIds.push(resourceItemId);
            resourceItemIcons.push(resourceItemNodes[i].childNodes[1].src);
            resourceItemCounts.push(parseNumberString(resourceItemNodes[i].firstChild.textContent) / craftingAmount);
        }

        let response = storageRequest({
            type: 'crafting-recipe',
            craftedItemId: craftedItemId,
            resourceItemIds: resourceItemIds
        });
        // TODO: use vendor price where appropriate

        // crafting info table
        document.getElementsByClassName("crafting-info-table")[0]?.remove();
        let craftingContainer = document.getElementsByClassName("crafting-item-container")[0];
        const ingredients = Object.assign(response.ingredients, {icons: resourceItemIcons, counts: resourceItemCounts});
        const product = Object.assign(response.product, {icon: craftedItemIcon, count: craftedItemCount});
        saveInsertAdjacentHTML(craftingContainer, 'beforeend', Templates.infoTableTemplate('crafting', ingredients, product, this.settings.profit));
        
        if (this.settings.goldPerXP) {
            this.goldPerXP(recipeNode, ingredients, product, resourceItemCounts);
        }
    }
    
    goldPerXP(recipeNode, ingredients, product, resourceItemCounts) {
        document.getElementsByClassName('crafting-gold-per-exp')[0]?.remove();
        const experienceNode = recipeNode.getElementsByClassName("crafting-item-exp small")[0];
        const experience = parseNumberString(experienceNode.childNodes[0].textContent);
        if (experience === 0) {
            return;
        }
        let minCost = - profit('flat', totalRecipePrice(ingredients.minPrices, resourceItemCounts), product.minPrice * product.count);
        let maxCost = - profit('flat', totalRecipePrice(ingredients.maxPrices, resourceItemCounts), product.maxPrice * product.count);
        // swap min and max if min is higher than max
        if (minCost > maxCost) {
            [minCost, maxCost] = [maxCost, minCost];
        }
        saveInsertAdjacentHTML(experienceNode, 'afterend', `
            <div class="crafting-gold-per-exp">
                <span>
                    ${formatNumber(minCost / experience, true)} ~ ${formatNumber(maxCost / experience, true)}
                </span>
                <img class="crafting-gold-per-exp-icon" src="/images/money_icon.png">
                <span>/</span>
                <img class="crafting-gold-per-exp-icon" src="/images/total_level.png">
            </div>`);
    }
}
