class Templates {
    static arrowDownTemplate(classes = "") {
        return `
            <svg class="${classes}" viewBox="0 0 20.633 20.633">
                <path d="M10.79,15.617l9.648-9.646c0.133-0.131,0.195-0.301,0.195-0.473s-0.062-0.344-0.195-0.473l-0.012-0.012
                c-0.125-0.127-0.295-0.195-0.472-0.195h-4.682c-0.18,0-0.348,0.068-0.473,0.195l-4.48,4.479l-4.48-4.479
                C5.711,4.886,5.54,4.818,5.366,4.818H0.684c-0.182,0-0.349,0.068-0.475,0.195L0.196,5.025C0.068,5.148,0,5.322,0,5.498
                c0,0.176,0.068,0.348,0.196,0.473l9.648,9.646C10.108,15.88,10.53,15.88,10.79,15.617z"/>
            </svg>`;
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
    static checkboxTemplate(id, active, classes = "") {
        return `
            <input id="${id}" type="checkbox" class="tracker-settings-checkbox ${classes}"${active ? " checked" : ""}>
            <label for="${id}" class="settings-checkbox-label">
                <svg class="settings-checkbox-svg" focusable="false" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            </label>`;
    }

    static checkmarkTemplate(classes = "") {
        return `
            <svg class="checkmark ${classes}" viewBox="0 0 24 24">
                <path d="M4.1 12.7L9 17.6 20.3 6.3" fill="none">
                    <animate attributeType="XML" attributeName="stroke-dashoffset" from="24" to="0" dur="1s" restart="always"/>
                </path>
            </svg>`;
    }

    static colorTemplate(classes = "") {
        return `
            <svg class="${classes}" viewbox="0 0 100 100" style="stroke:rgb(255,255,255); stroke-width:8px; fill:black;">
                <rect class="rect-third" x="5" y="8" width="50" height="50" rx="5" ry="5"/>
                <rect class="rect-second" x="34" y="18" width="50" height="50" rx="5" ry="5"/>
                <rect class="rect-first" x="12" y="38" width="50" height="50" rx="5" ry="5"/>
            </svg>`;
        }
    
    static dotTemplate(size, classes = "", color = "hsl(40, 80%, 40%)") {
        return `
            <svg class="${classes}" viewbox="0 0 100 100" style="width: ${size}; height: ${size}; fill: ${color};">
                <circle cx="50" cy="50" r="50"/>
            </svg>`;
    }
    
    static favoriteTemplate(classes = "") {
        return `
            <svg class="${classes}" stroke="rgb(255,255,0)" stroke-width="30px" fill="rgb(255,255,0)" x="0px" y="0px" width="24px" heigth="24px" viewBox="-15 -10 366 366">
                <path d="M329.208,126.666c-1.765-5.431-6.459-9.389-12.109-10.209l-95.822-13.922l-42.854-86.837  c-2.527-5.12-7.742-8.362-13.451-8.362c-5.71,0-10.925,3.242-13.451,8.362l-42.851,86.836l-95.825,13.922  c-5.65,0.821-10.345,4.779-12.109,10.209c-1.764,5.431-0.293,11.392,3.796,15.377l69.339,67.582L57.496,305.07  c-0.965,5.628,1.348,11.315,5.967,14.671c2.613,1.899,5.708,2.865,8.818,2.865c2.387,0,4.784-0.569,6.979-1.723l85.711-45.059  l85.71,45.059c2.208,1.161,4.626,1.714,7.021,1.723c8.275-0.012,14.979-6.723,14.979-15c0-1.152-0.13-2.275-0.376-3.352  l-16.233-94.629l69.339-67.583C329.501,138.057,330.972,132.096,329.208,126.666z">
            </svg>`;
    }

    /**
     * 
     * @param {string} classId used for css classes, `[classId]-info-table`, `[classId]-info-table-content`, `[classId]-info-table-icon` and `[classId]-info-table-font` can be used to style the table
     * @param {Object} ingredients icons, counts, minPrices and maxPrices as arrays of the ingredients
     * @param {Object} product icon, count, minPrice and maxPrice of the product
     * @param {string} profitType options are `off`, `percent`, `flat` and `per_hour`
     * @param {Boolean=} compactDisplay when working with limited space, the table can be displayed in a compact way
     * @param {Boolean=} showCounts display the count of the ingredients and product beside their respective icons
     * @param {Number=} secondsPerAction only required if profitType is `per_hour`
     * @param {Number=} chance chance to successfully craft the product
     * @returns {string} html string
     */
    static infoTableTemplate(classId, ingredients, product, profitType, compactDisplay = false, showCounts = false, secondsPerAction = null, chance = 1) {
        const { icons: ingredientIcons, counts: ingredientCounts, minPrices: ingredientMinPrices, maxPrices: ingredientMaxPrices } = ingredients;
        const { icon: productIcon, count: productCount, minPrice: productMinPrice, maxPrice: productMaxPrice } = product;
        // Ingredients
        let header = "";
        for (let i = 0; i < ingredientIcons.length; i++) {
            header += Templates.infoTableCell(classId, `
                <img class="${classId}-info-table-icon" src="${ingredientIcons[i]}">
                ${showCounts ? `<span class="${classId}-info-table-font">${ingredientCounts[i]}</span>` : ""}`);
        }
        // Total crafting cost
        header += Templates.infoTableCell(classId, `
            <span class="${classId}-info-table-font">
                &Sigma;
            </span>`);
        // Product
        header += Templates.infoTableCell(classId, `<img class="${classId}-info-table-icon" src="${productIcon}">`);
        if (productCount > 1) {
            header += Templates.infoTableCell(classId, `
                <span class="${classId}-info-table-font">
                    &Sigma;
                </span>`);
        }
        // Profit
        if (profitType !== "off") {
            header += Templates.infoTableCell(classId, `
                <img class="${classId}-info-table-icon" src="/images/money_icon.png" alt="Profit">
                ${profitType === "per_hour" ? `<span class="${classId}-info-table-font">/h</span>` : ""}`);
        }

        const minPrice = Templates.infoTableRow(classId, ingredientMinPrices, ingredientCounts, productMinPrice, productCount, profitType, compactDisplay, secondsPerAction, chance);
        const maxPrice = Templates.infoTableRow(classId, ingredientMaxPrices, ingredientCounts, productMaxPrice, productCount, profitType, compactDisplay, secondsPerAction, chance);
        return `
            <div class="${classId}-info-table" style="grid-template-columns: max-content repeat(${ingredientMinPrices.length + 2 + (productCount > 1) + (profitType !== "off")}, 1fr)">
                ${header}
                ${Templates.infoTableCell(classId, compactDisplay ? "Min" : "Minimal Marketprice")}
                ${minPrice}
                ${Templates.infoTableCell(classId, compactDisplay ? "Max" : "Maximal Marketprice")}
                ${maxPrice}
            </div>`;
    }

static infoTableRow(classId, ingredientPrices, ingredientCounts, productPrice, productCount, profitType, compactDisplay, secondsPerAction, chance) {
    let row = "";
    // Ingredients
    row += ingredientPrices.map(price => Templates.infoTableCell(classId, formatNumber(price, { compactDisplay: compactDisplay }))).join("");
    // Total crafting cost
    const totalIngredientPrice = totalRecipePrice(ingredientPrices, ingredientCounts) / chance;
    const totalProductPrice = productPrice * productCount;
    row += Templates.infoTableCell(classId, formatNumber(totalIngredientPrice, { compactDisplay: compactDisplay }));
    // Product
    row += Templates.infoTableCell(classId, formatNumber(productPrice, { compactDisplay: compactDisplay }));
    if (productCount > 1) {
        row += Templates.infoTableCell(classId, formatNumber(totalProductPrice, { compactDisplay: compactDisplay }));
    }
    // Profit
    if (profitType !== "off") {
        row += Templates.infoTableCell(classId, formatNumber(profit(profitType, totalIngredientPrice, totalProductPrice, secondsPerAction), { compactDisplay: compactDisplay, profitType: profitType }));
    }
    return row;
}

    static infoTableCell(classId, content) {
        return `
            <div class="${classId}-info-table-content">
                ${content}
            </div>`;
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
     * @returns {Node} div holding the select menu with working staticality.
     */
    static selectMenu(id, options, currentlySelected) {
        if (document.getElementById(id)) {
            console.log("Menu with id " + id + " already exists!");
            return;
        }
        let menu = document.createElement('div');
        menu.classList.add('tracker-select-menu');
        let content = `
            <div class="tracker-select-menu-current">
                <span class="tracker-select-menu-selection" id="${id}" data-for="${currentlySelected}">${options[currentlySelected]}</span>
                ${Templates.arrowDownTemplate('arrow-down')}
            </div>
            <div class="tracker-options">`;
        for (let option in options) {
            content += `
                <div class="tracker-option${option == currentlySelected ? " tracker-selected" : ""}" data-for="${option}">
                    ${options[option]}
                </div>`;
        }
        content += "</div>";
        saveInsertAdjacentHTML(menu, 'beforeend', content);

        const optionDivs = menu.getElementsByClassName('tracker-option');
        for (let optionDiv of optionDivs) {
            optionDiv.addEventListener('click', (e) => {
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

    /**
     * Creates a template for a slider
     *
     * @param {string} id When saving settings the id gets split at all '-' and then saved in the settings menu at that position
     *                    e.g. the selected value of the select menu with id "module-css-header" will be stored at 
     *                    `this.settings.module.css.header`. The setting needs to be set to a default value in the constructor of 
     *                    the corresponding module if it's not set.
     *                    !! This will not check if the path exists in the settings !!
     * @param {Array} range minimum and maximum value of the slider, a third value can be provided to set the step size
     * @param {string} currentlySelected The currently selected value
     * @param {string=} classes additional css classes
     * @returns {Node} div holding the select menu with working staticality.
     */
    static sliderTemplate(id, range, currentlySelected, classes = "") {
        return `<input id="${id}" class="tracker-slider ${classes}" type="range" min="${range[0]}" max="${range[1]}" step="${range[2] || 1}" value="${currentlySelected}">`;
    }

    static trackerLogoTemplate(classes = "") {
        return `
            <svg class="${classes}" viewBox="0 0 119.24264 119.24264">
                <path fill="green" stroke="green" stroke-width="1" d="M7, 67 L37, 37 A8.48528 8.48528 0 0 1 49 37 L69 57 L99 27 L79, 27 A3.62132 3.62132 0 0 1 79 19.75736 L105 19.75736 A8.48528 8.48528 0 0 1 112.24264 27 L112.24264 53 A3.62132 3.62132 0 0 1 105 53 L105 33 L75 63 A8.48528 8.48528 0 0 1 63 63 L43 43 L13 73 A4.24264 4.24264 0 0 1 7 67 Z" />
            </svg>`;
    }

    static warningTemplate(classes = "", fill = "rgb(255, 172, 0)") {
        return `
            <svg class="warning ${classes}" viewBox="0 0 485.811 485.811" style="width: 20px; height: 20px; margin-left: 5px; fill: ${fill};">
                <path d="M476.099,353.968l-170.2-294.8c-27.8-48.7-98.1-48.7-125.8,0l-170.3,294.8c-27.8,48.7,6.8,109.2,62.9,109.2h339.9
                    C468.699,463.168,503.899,402.068,476.099,353.968z M242.899,397.768c-14.8,0-27.1-12.3-27.1-27.1s12.3-27.1,27.1-27.1
                    c14.8,0,27.1,12.3,26.5,27.8C270.099,385.468,257.099,397.768,242.899,397.768z M267.599,222.568c-1.2,21-2.5,41.9-3.7,62.9
                    c-0.6,6.8-0.6,13-0.6,19.7c-0.6,11.1-9.3,19.7-20.4,19.7s-19.7-8-20.4-19.1c-1.8-32.7-3.7-64.8-5.5-97.5
                    c-0.6-8.6-1.2-17.3-1.9-25.9c0-14.2,8-25.9,21-29.6c13-3.1,25.9,3.1,31.5,15.4c1.9,4.3,2.5,8.6,2.5,13.6
                    C269.499,195.468,268.199,209.068,267.599,222.568z"/>
            </svg>`;
    }
}
