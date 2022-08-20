class Tracker {
    constructor() {
        this.extensions = {};
        this.activeExtensions = {};
        this.settings = loadLocalStorage('TrackerSettings', {activeExtensions: {}});
        console.log(this.settings);
        this.onGameReady(() => this.settingsSidebar());
    }

    addExtension(extension) {
        this.extensions[extension.id] = extension;
        if (this.settings.activeExtensions[extension.id]) {
            this.activateExtension(extension.id);
        }
    }

    activateExtension(extensionId) {
        if (this.extensions[extensionId] && !this.activeExtensions[extensionId]) {
            this.settings.activeExtensions[extensionId] = 1;
            if (!this.settings[extensionId]) {
                this.settings[extensionId] = {};
            }
            this.activeExtensions[extensionId] = new this.extensions[extensionId](this, this.settings[extensionId]);
            this.onGameReady(() => this.activeExtensions[extensionId].onGameReady());
            console.log(`Activated extension ${extensionId}`);
        }
    }

    deactivateExtension(extensionId) {
        if (this.activeExtensions[extensionId]) {
            this.settings.activeExtensions[extensionId] = 0;
            this.activeExtensions[extensionId].deactivate();
            delete this.activeExtensions[extensionId];
            console.log(`Deactivated extension ${extensionId}`);
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
        let setting = document.createElement('div');
        setting.id = 'tracker-settings-area';
        setting.className = 'play-area theme-default tracker';

        let settingCategories = {
            "economy": {
                "name": "Economy",
            },
            "recipe": {
                "name": "Recipes",
            },
            "visual": {
                "name": "Visual Changes",
            }
        };
        for (let extensionId in this.extensions) {
            console.log(extensionId);
            if (settingCategories[this.extensions[extensionId].category].div === undefined) {
                console.log("Creating category " + this.extensions[extensionId].category);
                let category = document.createElement('div');
                category.className = 'tracker-settings-category';
                let categoryHeader = document.createElement('div');
                categoryHeader.className = 'tracker-settings-category-header';
                categoryHeader.innerText = settingCategories[this.extensions[extensionId].category].name;
                category.append(categoryHeader);
                setting.append(category);
                settingCategories[this.extensions[extensionId].category].div = category;
            }
            settingCategories[this.extensions[extensionId].category].div.append(this.extensionSettings(extensionId));
        }
        setting.insertAdjacentHTML('beforeend', `
<div class="settings-footer">
    <div id="settings-save" class="settings-save idlescape-button-green">
        Save
    </div>
</div>
        `);
        playAreaContainer.append(setting);

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
            // Stop observing
            resetObserver.disconnect();
        });
        resetObserver.observe(playAreaContainer.getElementsByClassName('play-area')[0], {
            childList: true,
            subtree: true
        });
    }

    extensionSettings(extensionId) {
        let setting = document.createElement('div');
        setting.className = 'settings-extension';
        saveInsertAdjacentHTML(setting, 'beforeend', `
<div class="settings-extension-header">
    <div class="settings-extension-header-toggle-icon">
        ${this.extensions[extensionId].icon}
    </div>
    <div class="settings-extension-header-title">
        ${this.extensions[extensionId].displayName}
    </div>
    ${this.checkboxTemplate(extensionId, this.settings.activeExtensions[extensionId])}
</div>
        `);
        if (this.settings.activeExtensions[extensionId]) {
            let extensionContent = document.createElement('div');
            extensionContent.className = 'settings-extension-content';
            const menuContent = this.activeExtensions[extensionId].settingsMenuContent();
            if (typeof menuContent === 'string') {
                saveInsertAdjacentHTML(extensionContent, 'beforeend', menuContent);
            } else {
                extensionContent.append(menuContent);
            }
            setting.append(extensionContent);
        };
        return setting;
    }
    
    saveSettings() {
        // checkboxes
        const checkboxes = document.getElementsByClassName('tracker-settings-checkbox');
        for (let i = 0; i < checkboxes.length; i++) {
            if(checkboxes[i].id.includes('-')) {
                // Normal setting
                this.setSetting(checkboxes[i].id, checkboxes[i].checked ? 1 : 0);
            } else {
                // Activate/deactivate extension
                if (checkboxes[i].id in this.extensions) {
                    if (checkboxes[i].checked) {
                        this.activateExtension(checkboxes[i].id);
                    } else {
                        this.deactivateExtension(checkboxes[i].id);
                    }
                }
            }
        }
        // Select menus
        const selectMenus = document.getElementsByClassName('tracker-select-menu-selection');
        for (let i = 0; i < selectMenus.length; i++) {
            this.setSetting(selectMenus[i].id, selectMenus[i].dataset.for);
        }
        // Save settings
        console.log(this.settings);
        localStorage.setItem('TrackerSettings', JSON.stringify(this.settings));
    }

    setSetting(settingId, value) {
        let setting = this.settings;
        const idArray = settingId.split('-');
        for (let j = 0; j < idArray.length - 1; j++) {
            setting = setting[idArray[j]];
        }
        setting[idArray[idArray.length - 1]] = value;
    }

    onGameReady(callback) {
        const gameContainer = document.getElementsByClassName("play-area-container")[0];
        if (!gameContainer) {
            setTimeout(() => this.onGameReady(callback), 250);
        } else {
            callback();
        }
    }

    trackerLogoTemplate(classes = "") {
        return `
<svg class="${classes}" viewBox="0 0 119.24264 119.24264">
    <path id="Arrow" fill="green" stroke="green" stroke-width="1" d="M7, 67 L37, 37 A8.48528 8.48528 0 0 1 49 37 L69 57 L99 27 L79, 27 A3.62132 3.62132 0 0 1 79 19.75736 L105 19.75736 A8.48528 8.48528 0 0 1 112.24264 27 L112.24264 53 A3.62132 3.62132 0 0 1 105 53 L105 33 L75 63 A8.48528 8.48528 0 0 1 63 63 L43 43 L13 73 A4.24264 4.24264 0 0 1 7 67 Z" />
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
}
