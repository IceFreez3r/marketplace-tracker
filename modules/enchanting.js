class EnchantingTracker {
    static id = "enchanting_tracker"
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
    font-size: 1.5rem;
    line-height: 2rem;    
}
    `;

    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        if (this.settings.profit === undefined || this.settings.profit === "none") { // 2nd check for backwards compatibility
            this.settings.profit = "percent";
        }
        this.cssNode = injectCSS(this.css);

        this.observer = new MutationObserver(mutations => {
            const selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab')[0];
            if (!selectedSkill) {
                return;
            }
            if (selectedSkill.innerText !== 'Enchanting') {
                return;
            }
            this.enchantingTracker();
        });
    }
    
    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.observer.observe(playAreaContainer, {
            childList: true,
            subtree: true
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.observer.disconnect();
    }

    settingsMenuContent() {
        let moduleSetting = document.createElement('div');
        moduleSetting.classList.add('tracker-module-setting');
        moduleSetting.insertAdjacentHTML('beforeend', `
<div class="tracker-module-setting-name">
    Profit
</div>
        `);
        moduleSetting.append(this.tracker.selectMenu(EnchantingTracker.id + "-profit", {
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

    enchantingTracker() {
        let recipes = document.getElementsByClassName("scrollcrafting-container");
        for (let i = 0; i < recipes.length; i++) {
            this.processEnchantment(recipes[i]);
        }
    }

    processEnchantment(recipe) {
        // Table already exists
        if (recipe.getElementsByClassName("enchanting-info-table")[0]) {
            return;
        }
        const scrollId = convertItemId(recipe.firstChild.src);
        const scrollIcon = recipe.firstChild.src;

        let standardResources = this.getStandardResources(recipe.childNodes[4].childNodes[0]);
        let dynamicResources = this.getDynamicResources(recipe.childNodes[4].childNodes[1]);
        // combine lists of objects into separate lists
        let resourceItemIds = ["scroll"].concat(dynamicResources.map(resource => resource.itemId));
        let resourceItemIcons = ["/images/enchanting/scroll.png"].concat(dynamicResources.map(resource => resource.icon));
        let resourceItemCounts = [standardResources.scrolls].concat(dynamicResources.map(resource => resource.amount));
        let response = storageRequest({
            type: "enchanting-recipe",
            scrollId: scrollId,
            resourceItemIds: resourceItemIds
        });
        const ingredients = Object.assign(response.ingredients, { icons: resourceItemIcons, counts: resourceItemCounts });
        const product = Object.assign(response.product, { icon: scrollIcon, count: 1 });
        saveInsertAdjacentHTML(recipe, 'beforeend', infoTableTemplate('enchanting', ingredients, product, this.settings.profit, false, false, standardResources.timePerAction, standardResources.chance));
    }

    getStandardResources(node) {
        return {
            scrolls: this.getResource(node.childNodes[3].firstChild).amount,
            chance: parseFloat(this.getResource(node.childNodes[2].firstChild).amount) / 100,
            timePerAction: parseFloat(this.getResource(node.childNodes[1].firstChild).amount)
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
            itemId: convertItemId(node.childNodes[0].src),
            icon: node.childNodes[0].src,
            amount: node.childNodes[1].innerText
        };
    }
}
