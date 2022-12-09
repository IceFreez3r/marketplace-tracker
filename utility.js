// example:
// "/images/mining/stygian_ore.png" -> "stygian_ore"
function convertItemId(itemName) {
    itemName = itemName.substring(itemName.lastIndexOf('/') + 1, itemName.lastIndexOf('.'));
    itemName = itemName.replace(/-/g, '_');
    return itemName;
}

function parseNumberString(numberString) {
    return parseFloat(numberString.replaceAll(localNumberSeparators['group'], '').replaceAll(localNumberSeparators['decimal'], '.'));
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

function getSelectedSkill() {
    const selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab')[0];
    return selectedSkill ? selectedSkill.innerText : "";
}

function detectInfiniteLoop(mutations) {
    for (let mutation of mutations) {
        // Daels inventory prices
        if (mutation.target.classList.contains("price")) {
            return true;
        }
        // Heat highlight marker
        if (mutation.target.classList.contains("heat-highlight")) {
            return true;
        }
        for (let addedNode of mutation.addedNodes) {
            if (addedNode.classList) {
                // Quantile dots
                if (addedNode.classList.contains("quantile-dot")) {
                    return true;
                }
            }
        }
    }
    return false;
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
