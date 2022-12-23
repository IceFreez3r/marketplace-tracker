class Tracker {
    css = `
:root {
    --tracker-red: rgb(245, 0, 87);
    --tracker-red-transparent: rgba(245, 0, 87, 0.3);
}

.drawer-item {
    justify-content: space-between;
}

.drawer-item-left {
    width: 100%;
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
    object-fit: contain;
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

.tracker-module-setting-description {
    font-size: 1rem;
    margin-left: 20px;
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

.tracker-slider[type="range"] {
    width: 150px;
    border: unset;
    color: var(--tracker-red);
    box-shadow: unset;
}

/* styling the slider thumb needs browser specific prefixes */
.tracker-slider[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    background: var(--tracker-red);
}

.tracker-slider[type="range"]::-moz-range-thumb {
    background: var(--tracker-red);
}

.tracker-slider[type="range"]::-ms-thumb {
    background: var(--tracker-red);
}

.keyboard-focused .tracker-slider[type="range"]:focus:not(.active)::-webkit-slider-thumb {
    box-shadow: 0 0 0 10px var(--tracker-red-transparent);
}

.keyboard-focused .tracker-slider[type="range"]:focus:not(.active)::-moz-range-thumb {
    box-shadow: 0 0 0 10px var(--tracker-red-transparent);
}

.keyboard-focused .tracker-slider[type="range"]:focus:not(.active)::-ms-thumb {
    box-shadow: 0 0 0 10px var(--tracker-red-transparent);
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

#tracker-popup {
    z-index: 1300;
    position: fixed;
}

.tracker-popup-background {
    position: fixed;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: -1;
    inset: 0;
}
    `;

    constructor() {
        this.modules = {};
        this.activeModules = {};
        this.gameReadyTimeout = undefined;
        this.gameReadyCallbacks = [];
        this.saveCheckmarkTimeout = undefined;

        this.storage = new Storage(() => this.onApiUpdate());

        window.addEventListener('beforeunload', () => this.storage.handleClose());
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closePopup();
            }
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
                    market_highlights: 1,
                    marketplace_tracker: 1,
                    offline_tracker: 1,
                    smithing_tracker: 1,
                }
            };
            this.settings = this.storage.loadLocalStorage(this.settingsIdentifier, defaultSettings);
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
            this.activeModules[moduleId] = new this.modules[moduleId](this, this.settings[moduleId], this.storage);
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

    onApiUpdate() {
        for (let module of Object.values(this.activeModules)) {
            module.onAPIUpdate();
        }
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
                            ${Templates.trackerLogoTemplate('drawer-item-icon')}
                            Marketplace Tracker
                        </div>
                    </div>`);
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
                ${Templates.trackerLogoTemplate('nav-tab-icon icon-border')}
                Tracker
            </div>`);

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
                    ${Templates.checkboxTemplate(moduleId, this.settings.activeModules[moduleId])}
                </div>`);
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
            </div>`);
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
        // Slider
        const sliders = document.getElementsByClassName('tracker-slider');
        for (const slider of sliders) {
            this.setSetting(slider.id, slider.value);
        }
        // Save settings
        console.log(this.settings);
        this.storeSettings();

        // Visual feedback
        const saveButton = document.getElementById('settings-save');
        const checkmark = saveButton.parentElement.getElementsByClassName('settings-save-checkmark')[0];
        if (checkmark) {
            // Restart animation
            checkmark.getElementsByTagName('animate')[0].beginElement()
            clearTimeout(this.saveCheckmarkTimeout);
        } else {
            saveButton.insertAdjacentHTML('beforeend', Templates.checkmarkTemplate("settings-save-checkmark"));
        }
        this.saveCheckmarkTimeout = setTimeout(() => {
            saveButton.parentElement.getElementsByClassName('settings-save-checkmark')[0].remove();
        }, 5000);
    }

    storeSettings() {
        localStorage.setItem(this.settingsIdentifier, JSON.stringify(this.settings));
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

    closePopup() {
        document.getElementById('tracker-popup')?.remove();
    }
}
