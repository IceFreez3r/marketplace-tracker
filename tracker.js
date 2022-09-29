class Tracker {
    css = `
:root {
    --tracker-red: #f50057;
}

.settings-module {
    margin-bottom: 1rem;
}

.tracker-settings-category-header {
    text-align: center;
    font-size: 2rem;
    border-bottom: 1px solid var(--tracker-red);
    margin: 5px 50px;
    padding-bottom: 8px;
    background-color: rgba(0, 0, 0, 0.5);
}

.settings-module-header {
    display: flex;
    align-items: center;
    font-size: 1.5rem;
    font-weight: bold;
}

.settings-module-header-title {
    flex: 1;
}

.settings-module-header-toggle-icon {
    margin-right: 0.5rem;
}

.settings-module-header-toggle-icon > :is(img, svg){
    width: 30px;
    height: 30px;
}

.settings-module-content > :last-child {
    margin-bottom: -5px;
}

.settings-footer {
    display: flex;
    justify-content: center;
}

.settings-save {
    height: 40px;
    padding: 6px 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-size: 100% 100%;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    cursor: pointer;
}

.settings-save:hover {
    filter: brightness(1.5);
}

.tracker-module-setting {
    display: flex;
    justify-content: space-between;
    margin: 5px 50px;
    align-items: center;
}

.tracker-module-setting-name {
    font-size: 1.2rem;
}

.settings-checkbox-label {
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid #fff;
    border-radius: 2px;
    margin-bottom: unset;
}

.settings-checkbox-svg {
    display: none;
    fill: var(--tracker-red);
    transition: fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    width: 100%;
    height: 100%;
}

.tracker-settings-checkbox:checked + .settings-checkbox-label > .settings-checkbox-svg {
    display: block;
}

.tracker-select-menu {
    position: relative;
    width: 150px;
}

.tracker-select-menu:hover>.tracker-options {
    display: block;
}

.tracker-select-menu-current {
    background: #808080;
    border: 1px solid #fff;
    border-radius: 5px;
    cursor: pointer;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.tracker-options {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    border: 2px solid #fff;
    border-radius: 5px;
    width: 100%;
    box-sizing: border-box;
    z-index: 1;
    overflow: hidden;
}

.tracker-option {
    background: gray;
    cursor: pointer;
    padding: 5px;
}

.tracker-option:hover {
    filter: brightness(1.25);
}

.tracker-selected {
    background: #2a2c30;
    color: white;
}

.arrow-down {
    float: right;
    width: 16px;
    fill: var(--tracker-red);
}

.settings-save-checkmark {
    width: 25px;
    margin-left: 10px;
    stroke: white;
}

.checkmark path {
    fill: none;
    stroke-width: 4;
    stroke-dasharray: 23;
    stroke-linecap: round;
    stroke-linejoin: round
}
    `;

    constructor() {
        this.modules = {};
        this.activeModules = {};
        this.gameReadyTimeout = undefined;
        this.gameReadyCallbacks = [];
        this.saveCheckmarkTimeout = undefined;

        window.addEventListener('beforeunload', function () {
            storageRequest({
                type: 'close'
            });
        });

        injectCSS(this.css);
        this.onGameReady(() => {
            this.settingsIdentifier = `TrackerSettings${getCharacterName()}`;
            const defaultSettings = isIronmanCharacter() ? {
                activeModules: {
                    farming_tracker: 1,
                }
            } : {
                activeModules: {
                    crafting_tracker: 1,
                    enchanting_tracker: 1,
                    farming_tracker: 1,
                    favorite_tracker: 1,
                    marketplace_tracker: 1,
                    offline_tracker: 1,
                    smithing_tracker: 1,
                }
            };
            this.settings = loadLocalStorage(this.settingsIdentifier, defaultSettings);
            this.settingsSidebar();
        });
    }

    addModule(module) {
        this.modules[module.id] = module;
        this.onGameReady(() => {
            if (this.settings.activeModules[module.id]) {
                this.activateModule(module.id);
            }
        });
    }

    activateModule(moduleId) {
        if (this.modules[moduleId] && !this.activeModules[moduleId]) {
            this.settings.activeModules[moduleId] = 1;
            if (!this.settings[moduleId]) {
                this.settings[moduleId] = {};
            }
            this.activeModules[moduleId] = new this.modules[moduleId](this, this.settings[moduleId]);
            this.activeModules[moduleId].onGameReady();
            console.log(`Activated module ${moduleId}`);
            return true;
        }
        return false;
    }

    deactivateModule(moduleId) {
        if (this.activeModules[moduleId]) {
            this.settings.activeModules[moduleId] = 0;
            this.activeModules[moduleId].deactivate();
            delete this.activeModules[moduleId];
            console.log(`Deactivated module ${moduleId}`);
            return true;    
        }
        return false;
    }

    settingsSidebar() {
        let oldSidebarItem = document.getElementById('tracker-settings-sidebar');
        if (oldSidebarItem) {
            oldSidebarItem.remove();
        }

        let navDrawerContainer = document.getElementsByClassName('nav-drawer-container')[0];
        for (let drawerItem of navDrawerContainer.getElementsByClassName('drawer-item')) {
            if (drawerItem.firstChild.innerText === 'Settings') {
                drawerItem.insertAdjacentHTML('afterend', `
<div id="tracker-settings-sidebar" class="drawer-item active noselect tracker">
    <div class="drawer-item-left">
        ${this.trackerLogoTemplate('drawer-item-icon')}
        Marketplace Tracker
    </div>
</div>
                `);
                document.getElementById('tracker-settings-sidebar').addEventListener('click', () => {
                    // Hide sidebar unless it's pinned
                    if (!document.getElementsByClassName('drawer-item center')[0].lastChild.classList.contains('pressed')) {
                        document.getElementsByClassName('nav-drawer')[0].classList.add('drawer-closed');
                    }
                    this.settingsPage();
                });
                break;
            }
        }
    }


    settingsPage() {
        let oldNavTab = document.getElementById('tracker-settings-nav-tab');
        if (oldNavTab) {
            oldNavTab.remove();
        }
        let oldSettingsArea = document.getElementById('tracker-settings-area');
        if (oldSettingsArea) {
            oldSettingsArea.remove();
        }

        let playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        let navTabContainer = playAreaContainer.getElementsByClassName('nav-tab-container')[0];
        let navTabsLeft = navTabContainer.getElementsByClassName('nav-tab-left');
        for (let i = 0; i < navTabsLeft.length; i++) {
            navTabsLeft[i].style.display = 'none';
        }
        navTabContainer.insertAdjacentHTML("afterbegin", `
<div id="tracker-settings-nav-tab" class="nav-tab-left noselect selected-tab tracker">
    ${this.trackerLogoTemplate('nav-tab-icon icon-border')}
    Tracker
</div>
        `);

        let playAreas = playAreaContainer.getElementsByClassName('play-area')
        for (let i = 0; i < playAreas.length; i++) {
            playAreas[i].style.display = "none";
        }
        console.log(this.settings);
        let settingsArea = document.createElement('div');
        settingsArea.id = 'tracker-settings-area';
        settingsArea.className = 'play-area theme-default tracker';

        let settingCategories = {
            "economy": {
                "name": "Economy",
                "div": undefined,
            },
            "recipe": {
                "name": "Recipes",
                "div": undefined,
            },
            "visual": {
                "name": "Visual Changes",
                "div": undefined,
            }
        };
        for (let moduleId in this.modules) {
            const module = this.modules[moduleId];
            // Create new category block if the category doesn't exist yet
            if (settingCategories[module.category].div === undefined) {
                let category = document.createElement('div');
                category.className = 'tracker-settings-category';
                let categoryHeader = document.createElement('div');
                categoryHeader.className = 'tracker-settings-category-header';
                categoryHeader.innerText = settingCategories[module.category].name;
                category.append(categoryHeader);
                settingsArea.append(category);
                settingCategories[module.category].div = category;
            }
            let moduleSettings = document.createElement('div');
            moduleSettings.className = 'settings-module';
            saveInsertAdjacentHTML(moduleSettings, 'beforeend', `
<div class="settings-module-header">
    <div class="settings-module-header-toggle-icon">
        ${module.icon}
    </div>
    <div class="settings-module-header-title">
        ${module.displayName}
    </div>
    ${this.checkboxTemplate(moduleId, this.settings.activeModules[moduleId])}
</div>
            `);
            let moduleSettingsContent = document.createElement('div');
            moduleSettingsContent.className = 'settings-module-content';
            this.addModuleSettings(moduleId, moduleSettingsContent);
            moduleSettings.append(moduleSettingsContent);
            settingCategories[module.category].div.append(moduleSettings);
        }
        settingsArea.insertAdjacentHTML('beforeend', `
<div class="settings-footer">
    <div id="settings-save" class="settings-save idlescape-button-green">
        Save
    </div>
</div>
        `);
        playAreaContainer.append(settingsArea);

        let saveButton = document.getElementById('settings-save');
        saveButton.addEventListener('click', () => this.saveSettings());

        const resetObserver = new MutationObserver(mutations => {
            for (let i = 0; i < navTabsLeft.length; i++) {
                navTabsLeft[i].style.display = 'block';
            }
            for (let i = 0; i < playAreas.length; i++) {
                playAreas[i].style.display = "block";
            }
            document.getElementById('tracker-settings-nav-tab').remove();
            document.getElementById('tracker-settings-area').remove();
            clearTimeout(this.saveCheckmarkTimeout);
            // Stop observing
            resetObserver.disconnect();
        });
        resetObserver.observe(playAreaContainer.getElementsByClassName('play-area')[0], {
            childList: true,
            subtree: true
        });
    }

    addModuleSettings(moduleId, element) {
        if (this.settings.activeModules[moduleId]) {
            const menuContent = this.activeModules[moduleId].settingsMenuContent();
            if (typeof menuContent === 'string') {
                saveInsertAdjacentHTML(element, 'beforeend', menuContent);
            } else if (menuContent instanceof HTMLElement) {
                element.append(menuContent);
            } else if (menuContent instanceof Array) {
                for (let content of menuContent) {
                    if (typeof content === 'string') {
                        saveInsertAdjacentHTML(element, 'beforeend', content);
                    } else if (content instanceof HTMLElement) {
                        element.append(content);
                    }
                }
            }
        };
    }
    
    saveSettings() {
        // checkboxes
        const checkboxes = document.getElementsByClassName('tracker-settings-checkbox');
        for (const checkbox of checkboxes) {
            if(checkbox.id.includes('-')) {
                // Normal setting
                this.setSetting(checkbox.id, checkbox.checked ? 1 : 0);
            } else {
                // Activate/deactivate module
                if (checkbox.id in this.modules) {
                    if (checkbox.checked) {
                        const changed = this.activateModule(checkbox.id);
                        if (changed) {
                            // Add module settings
                            this.addModuleSettings(checkbox.id, checkbox.parentNode.parentNode.getElementsByClassName('settings-module-content')[0]);
                        }
                    } else {
                        const changed = this.deactivateModule(checkbox.id);
                        if (changed) {
                            // Remove module settings
                            const settingsModuleContent = checkbox.parentNode.parentNode.getElementsByClassName('settings-module-content')[0];
                            while (settingsModuleContent.firstChild) {
                                settingsModuleContent.lastChild.remove();
                            }
                        }
                    }
                }
            }
        }
        // Select menus
        const selectMenus = document.getElementsByClassName('tracker-select-menu-selection');
        for (const selectMenu of selectMenus) {
            this.setSetting(selectMenu.id, selectMenu.dataset.for);
        }
        // Save settings
        console.log(this.settings);
        localStorage.setItem(this.settingsIdentifier, JSON.stringify(this.settings));

        // Visual feedback
        const saveButton = document.getElementById('settings-save');
        const checkmark = saveButton.parentElement.getElementsByClassName('settings-save-checkmark')[0];
        if (checkmark) {
            // Restart animation
            checkmark.getElementsByTagName('animate')[0].beginElement()
            clearTimeout(this.saveCheckmarkTimeout);
        } else {
            saveButton.insertAdjacentHTML('beforeend', this.checkmarkTemplate("settings-save-checkmark"));
        }
        this.saveCheckmarkTimeout = setTimeout(() => {
            saveButton.parentElement.getElementsByClassName('settings-save-checkmark')[0].remove();
        }, 5000);
    }

    setSetting(settingId, value) {
        let setting = this.settings;
        const idArray = settingId.split('-');
        for (let j = 0; j < idArray.length - 1; j++) {
            setting = setting[idArray[j]];
        }
        if (setting[idArray[idArray.length - 1]] !== value) {
            setting[idArray[idArray.length - 1]] = value;
            const module = this.activeModules[idArray[0]];
            if (module) {
                module.settingChanged(settingId.slice(settingId.indexOf('-') + 1), value);
            }
        }
    }

    /**
     * Queue callback functions until the game is ready.
     * 
     * @param {callback} callback The callback function to call when the game has finished loading. Ommited in recursive calls.
     */
    onGameReady(callback) {
        // Manual call -> reset existing timer and add callback to the queue
        if (callback) {
            clearTimeout(this.gameReadyTimeout);
            this.gameReadyCallbacks.push(callback);
        }
        const gameContainer = document.getElementsByClassName("play-area-container")[0];
        if (!gameContainer) {
            this.gameReadyTimeout = setTimeout(() => this.onGameReady(), 250);
        } else {
            this.gameReadyTimeout = undefined;
            for (const callback of this.gameReadyCallbacks) {
                callback();
            }
            this.gameReadyCallbacks = [];
        }
    }

    trackerLogoTemplate(classes = "") {
        return `
<svg class="${classes}" viewBox="0 0 119.24264 119.24264">
    <path fill="green" stroke="green" stroke-width="1" d="M7, 67 L37, 37 A8.48528 8.48528 0 0 1 49 37 L69 57 L99 27 L79, 27 A3.62132 3.62132 0 0 1 79 19.75736 L105 19.75736 A8.48528 8.48528 0 0 1 112.24264 27 L112.24264 53 A3.62132 3.62132 0 0 1 105 53 L105 33 L75 63 A8.48528 8.48528 0 0 1 63 63 L43 43 L13 73 A4.24264 4.24264 0 0 1 7 67 Z" />
</svg>
    `;
    }

    /**
     * Creates a checkbox template
     * 
     * @param {string} id When saving settings the id gets split at all '-' and then saved in the settings menu at that position
     *                    e.g. a checkbox with id "module-css-header" will store `1` or `0` in `this.settings.module.css.header`.
     *                    The setting needs to be set to a default value in the constructor of the corresponding module if it's
     *                    not set.
     *                    !! This will not check if the path exists in the settings !!
     * @param {boolean} active The start state of the checkbox
     * @param {string=} classes additional css classes
     * @returns HTML template
     */
    checkboxTemplate(id, active, classes = "") {
        return `
<input id="${id}" type="checkbox" class="tracker-settings-checkbox ${classes}"${active ? " checked" : ""}>
<label for="${id}" class="settings-checkbox-label">
    <svg class="settings-checkbox-svg" focusable="false" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
</label>
        `;
    }

    /**
     * Creates a select menu with the provided options.
     * 
     * @param {string} id When saving settings the id gets split at all '-' and then saved in the settings menu at that position
     *                    e.g. the selected value of the select menu with id "module-css-header" will be stored at 
     *                    `this.settings.module.css.header`. The setting needs to be set to a default value in the constructor of 
     *                    the corresponding module if it's not set.
     *                    !! This will not check if the path exists in the settings !!
     * @param {Object} options object with pairs of the internal settingsname and a string for the display
     * @param {string} currentlySelected A key existing in options
     * @returns {Node} div holding the select menu with working functionality.
     */
    selectMenu(id, options, currentlySelected) {
        if (document.getElementById(id)) {
            console.log("Menu with id " + id + " already exists!");
            return;
        }
        let menu = document.createElement('div');
        menu.classList.add('tracker-select-menu');
        let content = `
<div class="tracker-select-menu-current">
    <span class="tracker-select-menu-selection" id="${id}" data-for="${currentlySelected}">${options[currentlySelected]}</span>
    ${this.arrowDownTemplate('arrow-down')}
</div>
<div class="tracker-options">
        `;
        for (let option in options) {
            content += `
<div class="tracker-option${option == currentlySelected ? " tracker-selected" : ""}" data-for="${option}">
    ${options[option]}
</div>
            `;
        }
        content += "</div>";
        saveInsertAdjacentHTML(menu, 'beforeend', content);

        const optionDivs = menu.getElementsByClassName('tracker-option');
        for (let optionDiv of optionDivs) {
            optionDiv.addEventListener('click', function (e) {
                if (optionDiv.classList.contains('tracker-selected')) {
                    return;
                }
                const oldSelection = menu.getElementsByClassName('tracker-selected')[0];
                oldSelection.classList.remove('tracker-selected');
                optionDiv.classList.add('tracker-selected');
                const newValue = optionDiv.getAttribute('data-for');
                let current = document.getElementById(id);
                current.dataset.for = newValue;
                current.innerText = options[newValue];
            });
        }
        return menu;
    }

    arrowDownTemplate(classes = "") {
        return `
<svg class="${classes}" viewBox="0 0 20.633 20.633">
    <path d="M10.79,15.617l9.648-9.646c0.133-0.131,0.195-0.301,0.195-0.473s-0.062-0.344-0.195-0.473l-0.012-0.012
        c-0.125-0.127-0.295-0.195-0.472-0.195h-4.682c-0.18,0-0.348,0.068-0.473,0.195l-4.48,4.479l-4.48-4.479
        C5.711,4.886,5.54,4.818,5.366,4.818H0.684c-0.182,0-0.349,0.068-0.475,0.195L0.196,5.025C0.068,5.148,0,5.322,0,5.498
        c0,0.176,0.068,0.348,0.196,0.473l9.648,9.646C10.108,15.88,10.53,15.88,10.79,15.617z"/>
</svg>
        `;
    }

    checkmarkTemplate(classes = "") {
        return `
<svg class="checkmark ${classes}" viewBox="0 0 24 24">
    <path d="M4.1 12.7L9 17.6 20.3 6.3" fill="none">
        <animate attributeType="XML" attributeName="stroke-dashoffset" from="24" to="0" dur="1s" restart="always"/>
    </path>
</svg>
        `;
    }
}
