// example:
// "/images/mining/stygian_ore.png" -> "stygian_ore"
function convertItemId(itemName) {
    itemName = itemName.substring(itemName.lastIndexOf('/') + 1, itemName.lastIndexOf('.'));
    itemName = itemName.replace(/-/g, '_');
    return itemName;
}

function parseNumberString(numberString) {
    return parseFloat(numberString.replace(localNumberSeparators['group'], '').replace(localNumberSeparators['decimal'], '.'));
}

function parseCompactNumberString(numberString) {
    const baseNumber = parseNumberString(numberString);
    const parseScale = {
        'K': 3,
        'M': 6,
        'B': 9,
        'T': 12,
        'P': 15,
        'E': 18,
    }
    const scale = parseScale[numberString.slice(-1)] || 0;
    return Math.round(baseNumber * Math.pow(10, scale));
}

// Parses a time string and returns the time in milliseconds
function parseTimeString(timeString, returnScale = false) {
    const regex = /(?<days>\d+\sday)?[s\s]*(?<hours>\d+\shour)?[s\s]*(?<minutes>\d+\sminute)?[s\s]*(?<seconds>\d+\ssecond)?[s\s]*$/;
    const match = timeString.match(regex);
    const days = match.groups.days ? parseInt(match.groups.days) : 0;
    const hours = match.groups.hours ? parseInt(match.groups.hours) : 0;
    const minutes = match.groups.minutes ? parseInt(match.groups.minutes) : 0;
    const seconds = match.groups.seconds ? parseInt(match.groups.seconds) : 0;
    const time = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
    if (!returnScale) {
        return time;
    }
    const scaleOptions = [1000 * 60 * 60 * 24, 1000 * 60 * 60, 1000 * 60, 1000, 1];
    return [time, scaleOptions.find(scale => time >= scale)];
}

function totalValue(resourceMinPrices, resourceMaxPrices, resourceCounts, chance = 1) {
    let totalMinValue = 0;
    let totalMaxValue = 0;
    for (let i = 0; i < resourceCounts.length; i++) {
        if (!isNaN(resourceMinPrices[i])) {
            if (resourceCounts[i] > 0) {
                totalMinValue += resourceMinPrices[i] * resourceCounts[i];
                totalMaxValue += resourceMaxPrices[i] * resourceCounts[i];
            } else {
                totalMinValue += resourceMaxPrices[i] * resourceCounts[i];
                totalMaxValue += resourceMinPrices[i] * resourceCounts[i];
            }
        }
    }
    return [totalMinValue / chance, totalMaxValue / chance];
}

function totalRecipePrice(resourcePrices, resourceCounts, chance = 1) {
    // dot product of prices and counts divided by chance
    return resourcePrices.map((price, index) => !isNaN(price) ? price * resourceCounts[index] : 0).reduce((a, b) => a + b, 0) / chance;
}

/**
 * Returns the profit including market fee as a string
 * 
 * @param {string} type Specifies how the profit is calculated. Allowed options are: `percent`, `flat`, `per_hour`
 * @param {number} buyPrice
 * @param {number} sellPrice
 * @param {number=} secondsPerAction only required if type is `per_hour`
 * @returns {number}
 */
function profit(type, buyPrice, sellPrice, secondsPerAction = null) {
    switch (type) {
        case "percent":
            return (Math.floor(sellPrice * 0.95) - buyPrice) / buyPrice;
        case "flat":
            return Math.floor(sellPrice * 0.95) - buyPrice;
        case "per_hour":
            return ((Math.floor(sellPrice * 0.95) - buyPrice) * (60 * 60 / secondsPerAction));
        default:
            console.error("Unknown profit type: " + type);
    }
}

function saveInsertAdjacentHTML(element, position, html) {
    element.insertAdjacentHTML(position, DOMPurify.sanitize(html));
}

// Inspired from https://github.com/daelidle/ISscripts/blob/ac93a2c4d2b52f37ffaefd42e3dd54959d6c258a/src/utils/GeneralUtils.js#L55
function getLocalNumberSeparators() {
    const parts = Intl.NumberFormat().formatToParts(10000000.1);
    return {
        group: parts.find(part => part.type === "group").value,
        decimal: parts.find(part => part.type === "decimal").value
    };
}

const localNumberSeparators = getLocalNumberSeparators();

function loadLocalStorage(key, fallback) {
    const value = localStorage.getItem(key);
    if (value === null) {
        // if fallback is a function, call it
        if (typeof fallback === "function") {
            return fallback();
        }
        return fallback;
    }
    return JSON.parse(value);
}

function injectCSS(css) {
    let style = document.createElement("style");
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
    return style;
}

function getCharacterName() {
    return document.getElementsByClassName("navbar1-box left drawer-button noselect")[0].childNodes[1].textContent;
}

function isIronmanCharacter() {
    return document.getElementsByClassName("header-league-icon")[0].src.includes("ironman");
}

/**
 * 
 * @param {string} classId used for css classes, `[classId]-info-table`, `[classId]-info-table-content`, `[classId]-info-table-icon` and `[classId]-info-table-font` can be used to style the table
 * @param {Object} ingredients icons, counts, minPrices and maxPrices as arrays of the ingredients
 * @param {Object} product icon, count, minPrice and maxPrice of the product
 * @param {string} profitType options are `none`, `percent`, `flat` and `per_hour`
 * @param {Boolean=} compactDisplay when working with limited space, the table can be displayed in a compact way
 * @param {Boolean=} showCounts display the count of the ingredients and product beside their respective icons
 * @param {Number=} secondsPerAction only required if profitType is `per_hour`
 * @param {Number=} chance chance to successfully craft the product
 * @returns {string} html string
 */
function infoTableTemplate(classId, ingredients, product, profitType, compactDisplay = false, showCounts = false, secondsPerAction = null, chance = 1) {
    const { icons: ingredientIcons, counts: ingredientCounts, minPrices: ingredientMinPrices, maxPrices: ingredientMaxPrices } = ingredients;
    const { icon: productIcon, count: productCount, minPrice: productMinPrice, maxPrice: productMaxPrice } = product;
    // Ingredients
    let header = "";
    for (let i = 0; i < ingredientIcons.length; i++) {
        header += infoTableCell(classId, `
<img class="${classId}-info-table-icon" src="${ingredientIcons[i]}">
${showCounts ? `<span class="${classId}-info-table-font">${ingredientCounts[i]}</span>` : ""}
        `);
    }
    // Total crafting cost
    header += infoTableCell(classId, `
<span class="${classId}-info-table-font">
    &Sigma;
</span>
    `);
    // Product
    header += infoTableCell(classId, `<img class="${classId}-info-table-icon" src="${productIcon}">`);
    if (productCount > 1) {
        header += infoTableCell(classId, `
<span class="${classId}-info-table-font">
    &Sigma;
</span>
        `);
    }
    // Profit
    if (profitType !== "none") {
        header += infoTableCell(classId, `
<img class="${classId}-info-table-icon" src="/images/money_icon.png" alt="Profit">
${profitType === "per_hour" ? `<span class="${classId}-info-table-font">/h</span>` : ""}
        `);
    }

    const minPrice = infoTableRow(classId, ingredientMinPrices, ingredientCounts, productMinPrice, productCount, profitType, compactDisplay, secondsPerAction, chance);
    const maxPrice = infoTableRow(classId, ingredientMaxPrices, ingredientCounts, productMaxPrice, productCount, profitType, compactDisplay, secondsPerAction, chance);
    return `
<div class="${classId}-info-table" style="grid-template-columns: max-content repeat(${ingredientMinPrices.length + 2 + (productCount > 1) + (profitType !== "none")}, 1fr)">
    ${header}
    ${infoTableCell(classId, compactDisplay ? "Min" : "Minimal Marketprice")}
    ${minPrice}
    ${infoTableCell(classId, compactDisplay ? "Max" : "Maximal Marketprice")}
    ${maxPrice}
</div>
    `;
}

function infoTableRow(classId, ingredientPrices, ingredientCounts, productPrice, productCount, profitType, compactDisplay, secondsPerAction, chance) {
    let row = "";
    // Ingredients
    row += ingredientPrices.map(price => infoTableCell(classId, formatNumber(price, { compactDisplay: compactDisplay }))).join("");
    // Total crafting cost
    const totalIngredientPrice = totalRecipePrice(ingredientPrices, ingredientCounts) / chance;
    const totalProductPrice = productPrice * productCount;
    row += infoTableCell(classId, formatNumber(totalIngredientPrice, { compactDisplay: compactDisplay }));
    // Product
    row += infoTableCell(classId, formatNumber(productPrice, { compactDisplay: compactDisplay }));
    if (productCount > 1) {
        row += infoTableCell(classId, formatNumber(totalProductPrice, { compactDisplay: compactDisplay }));
    }
    // Profit
    if (profitType !== "none") {
        row += infoTableCell(classId, formatNumber(profit(profitType, totalIngredientPrice, totalProductPrice, secondsPerAction), { compactDisplay: compactDisplay, profitType: profitType }));
    }
    return row;
}

function infoTableCell(classId, content) {
    return `
<div class="${classId}-info-table-content">
    ${content}
</div>
    `;
}

function formatNumber(number, options = {}) {
    const {compactDisplay, profitType, showSign} = options;
    if (isNaN(number)) {
        return "?";
    }
    let formatterOptions = {
        maximumFractionDigits: 0,
    };
    if (profitType === "percent") {
        Object.assign(formatterOptions, { maximumFractionDigits: 2, style: "percent" });
    }
    if (compactDisplay) {
        Object.assign(formatterOptions, { maximumFractionDigits: 1, notation: "compact" });
    }
    if (showSign) {
        Object.assign(formatterOptions, { signDisplay: "always" });
    }
    const formatter = new Intl.NumberFormat("en-US", formatterOptions);
    return formatter.format(number);
}
