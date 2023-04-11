class Tracker {
    css = `
:root {
    --tracker-red: rgb(245, 0, 87);
    --tracker-red-transparent: rgba(245, 0, 87, 0.3);
}

.tracker-nav-tab-container {
    display: flex;
    height: 30px;
    width: 100%;
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

.tracker-settings-button {
    height: 40px;
    padding: 6px 16px;
    margin: 0 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-size: 100% 100%;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    cursor: pointer;
    position: relative;
}

.tracker-settings-button:hover {
    filter: brightness(1.5);
}

.tracker-tooltip {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.tracker-tooltip-text {
    display: none;
    position: absolute;
    z-index: 1;
    background-color: #555;
    color: #fff;
    text-align: center;
    padding: 5px;
    border-radius: 6px;
    font-size: 1rem;
    bottom: 100%;
    left: -200%;
    right: -200%;
    margin: 0 auto;
    width: fit-content;
}

.tracker-tooltip:hover .tracker-tooltip-text {
    display: block;
}

.tracker-confirm-reset {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 4px;
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
    flex-shrink: 0;
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

input[type="text"].tracker-time-duration:not(.browser-default) {
    position: relative;
    width: 42px;
    text-align: center;
    border: 1px solid var(--tracker-red) !important;
    border-radius: 5px;
    padding: 4px;
    background-color: white;
    height: unset;
    margin: unset;
    color: black;
}

.tracker-time-duration::placeholder {
    color: #9a9a9a;
}

.tracker-time-range {
    display: flex;
    gap: 3px;
}

input[type="time"].tracker-time:not(.browser-default) {
    position: relative;
    width: fit-content;
    text-align: center;
    border: 1px solid var(--tracker-red);
    border-radius: 5px;
    padding: 4px;
    background-color: white;
    font-size: 14px;
    height: unset;
    margin: unset;
    color: black;
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

.import-export-popup {
    text-align: center;
    width: 100%;
    position: absolute;
    left: 50%;
    top: 5%;
    transform: translate(-50%, 5%);
    border: 2px solid silver;
    z-index: 9;
    max-width: 600px;
    padding: 50px;
    background-color: rgba(0,0,0,.19);
    align-items: center;
    border-image-source: url(/images/ui/stone-9slice.png);
    border-image-slice: 100 fill;
    border-image-width: 100px;
    border-image-outset: 0;
    border-image-repeat: repeat;
}

.import-export-popup-title {
    margin-top: 0;
    font-size: 2rem;
    line-height: 1.2;
}

.import-export-popup-container {
    display: grid;
    grid-template-columns: 5fr 1fr;
    gap: 10px 20px;
    grid-template-areas: "settings-header settings-header"
                         "settings-textarea settings-import"
                         "settings-textarea settings-export"
                         "market-header market-header"
                         "market-textarea market-import"
                         "market-textarea market-export"
}

.import-export-popup-textarea {
    height: 100%;
}
    `;

    constructor() {
        this.modules = {};
        this.activeModules = {};
        this.gameReadyTimeout = undefined;
        this.gameReadyCallbacks = [];
        this.saveCheckmarkTimeout = undefined;
        this.settingsResetObserver = undefined;

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
            this.defaultSettings = isIronmanCharacter() ? {
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
                    runecrafting_tracker: 1,
                    smithing_tracker: 1,
                }
            };
            this.settings = this.storage.loadLocalStorage(this.settingsIdentifier, this.defaultSettings);
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

    notifyModule(moduleId, message, data) {
        if (this.activeModules[moduleId]) {
            this.activeModules[moduleId].onNotify(message, data);
        }
    }

    settingsSidebar() {
        let oldSidebarItem = document.getElementById('tracker-settings-sidebar');
        oldSidebarItem?.remove();

        const vanillaSettings = document.getElementsByClassName("Settings")[0];
        vanillaSettings.insertAdjacentHTML('afterend', `
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
    }

    settingsPage() {
        let oldNavTabContainer = document.getElementById('tracker-settings-nav-tab-container');
        oldNavTabContainer?.remove();
        let oldSettingsArea = document.getElementById('tracker-settings-area');
        oldSettingsArea?.remove();

        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        const navTabContainer = playAreaContainer.getElementsByClassName('nav-tab-container')[0];
        if (document.getElementsByClassName("game-container")[0].classList.contains("navbar-disabled")) {
            navTabContainer.style.display = "none";
        }

        navTabContainer.insertAdjacentHTML("afterend", `
            <div id="tracker-settings-nav-tab-container" class="tracker-nav-tab-container">
                <div class="nav-tab noselect selected-tab tracker">
                    ${Templates.trackerLogoTemplate('nav-tab-icon icon-border')}
                    Tracker
                </div>
            </div>`);
        const selectedSkill = getSelectedSkill();

        const playAreaBackground = playAreaContainer.getElementsByClassName('play-area-background')[0];
        const playAreas = playAreaBackground.getElementsByClassName('play-area');
        for (let i = 0; i < playAreas.length; i++) {
            playAreas[i].style.display = "none";
        }
        console.log(this.settings);
        const settingsArea = document.createElement('div');
        settingsArea.id = 'tracker-settings-area';
        settingsArea.className = 'play-area theme-default tracker';

        const settingCategories = {
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
                const category = document.createElement('div');
                category.className = 'tracker-settings-category';
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'tracker-settings-category-header';
                categoryHeader.innerText = settingCategories[module.category].name;
                category.append(categoryHeader);
                settingsArea.append(category);
                settingCategories[module.category].div = category;
            }
            const moduleSettings = document.createElement('div');
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
            const moduleSettingsContent = document.createElement('div');
            moduleSettingsContent.className = 'settings-module-content';
            this.addModuleSettings(moduleId, moduleSettingsContent);
            moduleSettings.append(moduleSettingsContent);
            settingCategories[module.category].div.append(moduleSettings);
        }
        settingsArea.insertAdjacentHTML('beforeend', `
            <div class="settings-footer">
                <div id="settings-reset" class="tracker-settings-button idlescape-button-red">
                    Reset
                    <div class="tracker-tooltip">
                        <div class="tracker-tooltip-text">
                            Requires a page refresh
                        </div>
                    </div>
                </div>
                <div id="settings-import" class="tracker-settings-button idlescape-button-blue">
                    Import/Export
                </div>
                <div id="settings-save" class="tracker-settings-button idlescape-button-green">
                    Save
                </div>
            </div>`);
        playAreaBackground.append(settingsArea);

        this.warningShown = false;
        const resetButton = document.getElementById('settings-reset');
        resetButton.addEventListener('click', () => this.resetSettings(resetButton));

        const importExportButton = document.getElementById('settings-import');
        importExportButton.addEventListener('click', () => this.importExportPopup());

        const saveButton = document.getElementById('settings-save');
        saveButton.addEventListener('click', () => this.saveSettings());

        this.settingsResetObserver?.disconnect();
        this.settingsResetObserver = new MutationObserver(mutations => {
            if (getSelectedSkill() !== selectedSkill) {
                navTabContainer.style.display = '';
                for (let i = 0; i < playAreas.length; i++) {
                    playAreas[i].style.display = "block";
                }
                document.getElementById('tracker-settings-nav-tab-container').remove();
                document.getElementById('tracker-settings-area').remove();
                clearTimeout(this.saveCheckmarkTimeout);
                // Stop observing
                this.settingsResetObserver.disconnect();
            }
        });
        this.settingsResetObserver.observe(navTabContainer, {
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

    resetSettings(resetButton) {
        if (this.warningShown) {
            this.settings = this.defaultSettings;
            this.storeSettings();
            location.reload();
        } else {
            resetButton.firstChild.textContent = 'Reset?';
            Templates.notificationTemplate('warning', 'Settingsreset', 'Please click again to confirm');
            this.warningShown = true;
        }
    }

    importExportPopup() {
        saveInsertAdjacentHTML(document.body, 'beforeend', Templates.popupTemplate(`
            <div class="import-export-popup">
                <div class="import-export-popup-title">
                    Import/Export
                </div>
                <div class="import-export-popup-container">
                    <div class="import-export-popup-text" style="grid-area: settings-header;">
                        Settings
                    </div>
                    <textarea id="import-export-settings" class="import-export-popup-textarea" style="grid-area: settings-textarea;"></textarea>
                    <div id="tracker-import-settings" class="tracker-settings-button idlescape-button-green" style="grid-area: settings-import;">
                        Import
                        <div class="tracker-tooltip">
                            <div class="tracker-tooltip-text">
                                <div>Enter settings into the textarea</div>
                                <div>Reloads the page</div>
                            </div>
                        </div>
                    </div>
                    <div id="tracker-export-settings" class="tracker-settings-button idlescape-button-blue" style="grid-area: settings-export;">
                        Export
                        <div class="tracker-tooltip">
                            <div class="tracker-tooltip-text">
                                Copies to clipboard
                            </div>
                        </div>
                    </div>
                    <div class="import-export-popup-text" style="grid-area: market-header;">
                        Marketplace Data
                    </div>
                    <textarea id="import-export-market" class="import-export-popup-textarea" style="grid-area: market-textarea;"></textarea>
                    <div id="tracker-import-market" class="tracker-settings-button idlescape-button-green" style="grid-area: market-import;">
                        Import
                        <div class="tracker-tooltip">
                            <div class="tracker-tooltip-text">
                                Enter marketplace data into the textarea
                            </div>
                        </div>
                    </div>
                    <div id="tracker-export-market" class="tracker-settings-button idlescape-button-blue" style="grid-area: market-export;">
                        Export
                        <div class="tracker-tooltip">
                            <div class="tracker-tooltip-text">
                                Copies to clipboard
                            </div>
                        </div>
                    </div>
                </div>
                <div class="import-export-popup-message">
                </div> 
                <div class="import-export-popup-button-container">
                    <div class="tracker-settings-button idlescape-button-red" id="import-export-popup-close">
                        Close
                    </div>
                </div>
            </div>`));
        document.getElementById('tracker-import-settings').addEventListener('click', () => this.importSettings());
        document.getElementById('tracker-export-settings').addEventListener('click', () => this.exportSettings());
        document.getElementById('tracker-import-market').addEventListener('click', () => this.importStorage());
        document.getElementById('tracker-export-market').addEventListener('click', () => this.exportStorage());
        document.getElementById('import-export-popup-close').addEventListener('click', () => this.closePopup());
        document.getElementsByClassName("tracker-popup-background")[0].addEventListener('click', (event) => {
            if (event.target === event.currentTarget) {
                this.closePopup();
            }
        });
    }

    importSettings() {
        try {
            const textarea = document.getElementById('import-export-settings');
            const data = textarea.value;
            const settings = JSON.parse(data);
            this.settings = settings;
            this.storeSettings();
            document.getElementsByClassName('import-export-popup-message')[0].textContent = 'Imported settings';
            setTimeout(() => location.reload(), 1500);
        }
        catch (err) {
            console.log(err);
            document.getElementsByClassName('import-export-popup-message')[0].textContent = 'Something went wrong';
        }
    }

    exportSettings() {
        navigator.clipboard.writeText(JSON.stringify(this.settings));
        document.getElementsByClassName('import-export-popup-message')[0].textContent = 'Copied settings to clipboard';
    }

    importStorage() {
        const textarea = document.getElementById('import-export-market');
        const data = textarea.value;
        const message = this.storage.importStorage(data);
        document.getElementsByClassName('import-export-popup-message')[0].textContent = message;
    }

    exportStorage() {
        navigator.clipboard.writeText(this.storage.exportStorage());
        document.getElementsByClassName('import-export-popup-message')[0].textContent = 'Copied marketplace data to clipboard';
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
        // Time inputs
        const timeInputs = document.querySelectorAll('.tracker-time, .tracker-time-duration');
        for (const timeInput of timeInputs) {
            this.setSetting(timeInput.id, timeInput.value);
        }
        // Save settings
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

    storeSettings() {
        // Save settings
        localStorage.setItem(this.settingsIdentifier, JSON.stringify(this.settings));
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
