// example:
// "/images/mining/stygian_ore.png" -> "stygian_ore"
function convertItemId(itemName) {
    itemName = itemName.substring(itemName.lastIndexOf('/') + 1, itemName.lastIndexOf('.'));
    itemName = itemName.replace(/-/g, '_');
    return itemName;
}

// Add thousands separator to number
function numberWithSeparators(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Inspired from https://github.com/daelidle/ISscripts/blob/ac93a2c4d2b52f37ffaefd42e3dd54959d6c258a/src/utils/GeneralUtils.js#L22
function shortenNumber(number) {
    const suffix = number.toString().replace(/[\+\-0-9\.]/g, '');
    const isNegative = number < 0;
    number = Math.abs(number);
    if (number < 10000) {
        return (isNegative ? -1 : 1) * cleanToFixed(number, 1) + suffix;
    }
    const SYMBOL = ['', 'K', 'M', 'B', 'T', 'P', 'E'];
    let index = 0;
    while (number >= 1000) {
        number /= 1000;
        index++;
    }
    return (isNegative ? -1 : 1) * cleanToFixed(number, 1) + SYMBOL[index] + suffix;
}

/**
 * 
 * @param {number} number number to format
 * @param {number | undefined} decimalPlaces maximum number of decimal places to round to
 * @returns {number} number with at most `decimalPlaces` decimal places	and no trailing 0's
 */
function cleanToFixed(number, decimalPlaces) {
    return parseFloat(number.toFixed(decimalPlaces));
}

function parseNumberString(numberString) {
    const baseNumber = parseFloat(numberString.replace(localNumberSeparators['group'], '').replace(localNumberSeparators['decimal'], '.'));
    let scale = 0;
    switch (numberString.slice(-1)) {
        case 'K':
            scale = 3;
            break;
        case 'M':
            scale = 6;
            break;
        case 'B':
            scale = 9;
            break;
        case 'T':
            scale = 12;
            break;
        case 'P':
            scale = 15;
            break;
        case 'E':
            scale = 18;
            break;
    }
    return Math.round(baseNumber * Math.pow(10, scale));
}

// Parses a time string and returns the time in milliseconds
function parseTimeString(timeString, returnScale = false) {
    timeString.replace("s ", "");
    const secondRegex = /(\d+) second/;
    const minuteRegex = /(\d+) minute/;
    const hourRegex = /(\d+) hour/;
    const dayRegex = /(\d+) day/;
    const secondMatch = secondRegex.exec(timeString);
    const minuteMatch = minuteRegex.exec(timeString);
    const hourMatch = hourRegex.exec(timeString);
    const dayMatch = dayRegex.exec(timeString);
    let time = 0;
    let scale;
    if (secondMatch) {
        time += parseInt(secondMatch[1]) * 1000;
        scale = 1000;
    }
    if (minuteMatch) {
        time += parseInt(minuteMatch[1]) * 60 * 1000;
        scale = 60 * 1000;
    }
    if (hourMatch) {
        time += parseInt(hourMatch[1]) * 60 * 60 * 1000;
        scale = 60 * 60 * 1000;
    }
    if (dayMatch) {
        time += parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000;
        scale = 24 * 60 * 60 * 1000;
    }
    if (returnScale) {
        return [time, scale];
    }
    return time;
}

function totalRecipePrices(resourceMinPrices, resourceMaxPrices, resourceCounts, chance = 1) {
    let totalResourceMinPrice = 0;
    let totalResourceMaxPrice = 0;
    for (let i = 0; i < resourceCounts.length; i++) {
        if (resourceMinPrices[i] !== "?") {
            if (resourceCounts[i] > 0) {
                totalResourceMinPrice += resourceMinPrices[i] * resourceCounts[i];
                totalResourceMaxPrice += resourceMaxPrices[i] * resourceCounts[i];
            } else {
                totalResourceMinPrice += resourceMaxPrices[i] * resourceCounts[i];
                totalResourceMaxPrice += resourceMinPrices[i] * resourceCounts[i];
            }
        }
    }
    return [totalResourceMinPrice / chance, totalResourceMaxPrice / chance];
}

function totalRecipePrice(resourcePrices, resourceCounts, chance = 1) {
    // dot product of prices and counts divided by chance
    return resourcePrices.map((price, index) => price !== "?" ? price * resourceCounts[index] : 0).reduce((a, b) => a + b, 0) / chance;
}

/**
 * Returns the profit including market fee as a string
 * 
 * @param {string} type Specifies how the profit is calculated. Allowed options are: `percent`, `flat`, `per_hour`
 * @param {number|string} buyPrice "?" or the buy price
 * @param {number|string} sellPrice "?" or the sell price
 * @param {number=} secondsPerAction only required if type is `per_hour`
 * @returns {number|string} "?" or the profit
 */
function profit(type, buyPrice, sellPrice, secondsPerAction = null) {
    if (buyPrice === "?" || sellPrice === "?") {
        return "?";
    }
    switch (type) {
        case "percent":
            return ((sellPrice * 0.95 - buyPrice) / buyPrice * 100);
        case "flat":
            return sellPrice * 0.95 - buyPrice;
        case "per_hour":
            return ((sellPrice * 0.95 - buyPrice) * (60 * 60 / secondsPerAction));
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
        header += `
<div class="${classId}-info-table-content">
    <img class="${classId}-info-table-icon" src="${ingredientIcons[i]}">
    ${showCounts ? `<span class="${classId}-info-table-font">${ingredientCounts[i]}</span>` : ""}
</div>
            `;
    }
    // Total crafting cost
    header += `
<div class="${classId}-info-table-content">
    <span class="${classId}-info-table-font">
        &Sigma;
    </span>
</div>
    `;
    // Product
    header += `
<div class="${classId}-info-table-content">
    <img class="${classId}-info-table-icon" src="${productIcon}">
</div>
    `;
    if (productCount > 1) {
        header += `
<div class="${classId}-info-table-content">
    <span class="${classId}-info-table-font">
        &Sigma;
    </span>
</div>
        `;
    }
    // Profit
    if (profitType !== "none") {
        header += `
<div class="${classId}-info-table-content">
    <img class="${classId}-info-table-icon" src="/images/money_icon.png" alt="Profit">
    ${profitType === "per_hour" ? `<span class="${classId}-info-table-font">/h</span>` : ""}
</div>
        `;
    }

    const minPrice = priceRow(classId, ingredientMinPrices, ingredientCounts, productMinPrice, productCount, profitType, compactDisplay, secondsPerAction, chance);
    const maxPrice = priceRow(classId, ingredientMaxPrices, ingredientCounts, productMaxPrice, productCount, profitType, compactDisplay, secondsPerAction, chance);
    return `
<div class="${classId}-info-table" style="grid-template-columns: max-content repeat(${ingredientMinPrices.length + 2 + (productCount > 1) + (profitType !== "none")}, 1fr)">
    ${header}
    <div class="${classId}-info-table-content">
        ${compactDisplay ? "Min" : "Minimal Marketprice"}
    </div>
    ${minPrice}
    <div class="${classId}-info-table-content">
        ${compactDisplay ? "Max" : "Maximal Marketprice"}
    </div>
    ${maxPrice}
</div>
    `;
}

function priceRow(classId, ingredientPrices, ingredientCounts, productPrice, productCount, profitType, compactDisplay, secondsPerAction, chance) {
    let row = "";
    // Ingredients
    row += ingredientPrices.map(price => `
<div class="${classId}-info-table-content">
    ${formatNumber(price)}
</div>
    `).join("");
    // Total crafting cost
    const totalIngredientPrice = totalRecipePrice(ingredientPrices, ingredientCounts) / chance;
    const totalProductPrice = productPrice * productCount;
    row += `
<div class="${classId}-info-table-content">
    ${formatNumber(totalIngredientPrice, compactDisplay)}
</div>
    `;
    // Product
    row += `
<div class="${classId}-info-table-content">
    ${formatNumber(productPrice, compactDisplay) }
</div>
    `;
    if (productCount > 1) {
        row += `
<div class="${classId}-info-table-content">
    ${formatNumber(totalProductPrice, compactDisplay)}
</div>
        `;
    }
    // Profit
    if (profitType !== "none") {
        row += `
<div class="${classId}-info-table-content">
    ${formatNumber(profit(profitType, totalIngredientPrice, totalProductPrice, secondsPerAction), compactDisplay, profitType)}
    ${profitType === "percent" ? "%" : ""}
</div>
        `;
    }
    return row;
}

function formatNumber(number, compactDisplay, profitType = null) {
    if (number === "?") {
        return "?";
    }
    if (compactDisplay) {
        return numberWithSeparators(shortenNumber(number));
    } else if (profitType === "percent") {
        return numberWithSeparators(cleanToFixed(number, 2));
    } else {
        return numberWithSeparators(cleanToFixed(number, 0));
    }
}
