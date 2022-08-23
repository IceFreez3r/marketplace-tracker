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

function limitDecimalPlaces(number, decimalPlaces = 0) {
    if (number === "?") {
        return "?";
    }
    return Math.round(number * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

// Inspired from https://github.com/daelidle/ISscripts/blob/ac93a2c4d2b52f37ffaefd42e3dd54959d6c258a/src/utils/GeneralUtils.js#L22
function shortenNumber(number) {
    const suffix = number.toString().replace(/[\+\-0-9\.]/g, '');
    number = parseFloat(number);
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

function totalRecipePrice(resourceMinPrices,
                            resourceMaxPrices,
                            resourceCounts) {
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
    return [totalResourceMinPrice, totalResourceMaxPrice];
}

/**
 * Returns the profit including market fee as a string
 * 
 * @param {string} type Specifies how the profit is calculated. Allowed options are: `percent`, `flat`, `per_hour`
 * @param {number} buyPrice 
 * @param {number} sellPrice 
 * @param {number=} decimalPlaces ignored when type is `flat`
 * @param {number=} secondsPerAction only required if type is `per_hour`
 * @returns {string} 
 */
function profit(type, buyPrice, sellPrice, decimalPlaces = 2, secondsPerAction = null) {
    if (buyPrice === "?" || sellPrice === "?") {
        return "?";
    }
    switch (type) {
        case "percent":
            return cleanToFixed(((sellPrice * 0.95 - buyPrice) / buyPrice * 100), decimalPlaces) + "%";
        case "flat":
            return (sellPrice * 0.95 - buyPrice).toString();
        case "per_hour":
            return cleanToFixed(((sellPrice * 0.95 - buyPrice) * (60 * 60 / secondsPerAction)), decimalPlaces);
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
