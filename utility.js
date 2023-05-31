// example:
// "/images/mining/stygian_ore.png" -> "stygian_ore"
function convertItemId(itemName) {
    itemName = itemName.substring(itemName.lastIndexOf('/') + 1, itemName.lastIndexOf('.'));
    itemName = itemName.replace(/-/g, '_');
    return itemName;
}

function parseNumberString(numberString, numberSeparators = localNumberSeparators) {
    return parseFloat(numberString.replaceAll(numberSeparators['group'], '').replaceAll(numberSeparators['decimal'], '.'));
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
    const scale = parseScale[numberString.slice(-1).toUpperCase()] || 0;
    return Math.round(baseNumber * Math.pow(10, scale));
}

// Parses a time string and returns the time in milliseconds
function parseTimeString(timeString, returnScale = false) {
    const regex = /(?<days>\d+\sday)?[s\s]*(?<hours>\d+\shour)?[s\s]*(?<minutes>\d+\sminute)?[s\s]*(?<seconds>\d+\ssecond)?[s\s]*\.?$/;
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
function profit(type, buyPrice, sellPrice, secondsPerAction = null, noMarketFee = false) {
    const buy = isNaN(buyPrice) ? 0 : buyPrice;
    const sell = isNaN(sellPrice) ? 0 : sellPrice;
    const postFee = noMarketFee ? 1 : 0.95;
    switch (type) {
        case "percent":
            return (Math.floor(sell * postFee) - buy) / buy;
        case "flat":
            return Math.floor(sell * postFee) - buy;
        case "per_hour":
            return ((Math.floor(sell * postFee) - buy) * (60 * 60 / secondsPerAction));
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
    const selectedSkill = document.getElementsByClassName('nav-tab noselect selected-tab')[0];
    return selectedSkill ? selectedSkill.innerText : "";
}

function detectInfiniteLoop(mutations) {
    const ignoredTargets = ["price", "heat-highlight"];
    const ignoredNodes = ["react-tiny-popover-container", "scrollcrafting-totals-bar", "quantile-dot", "alert-icon", "tracker-ignore"];
    const ignoredChildren = ["daelis-wow-tooltip"];
    for (const mutation of mutations) {
        if (ignoredTargets.some(target => mutation.target.classList.contains(target))) {
            return true;
        }
        const nodes = Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes));
        for (const node of nodes) {
            if (node.classList && ignoredNodes.some(target => node.classList.contains(target))) {
                return true;
            }
            for (const ignoredChild of ignoredChildren) {
                if (node.getElementsByClassName(ignoredChild).length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function formatNumber(number, options = {}) {
    const {compactDisplay, profitType, showSign, fraction} = options;
    if (isNaN(number)) {
        return "?";
    }
    let formatterOptions = {
        maximumFractionDigits: fraction ? 2 : 0,
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

function sortObj(obj) {
    return Object.keys(obj).sort().reduce((result, key) => {
        result[key] = obj[key];
        return result;
    }, {});
}

function durationToMilliseconds(duration) {
    const [hours, minutes] = duration.split(":");
    return (parseInt(hours) * 60 + parseInt(minutes)) * 60 * 1000;
}

function millisecondsToDuration(milliseconds) {
    const hours = Math.floor(milliseconds / 1000 / 60 / 60);
    milliseconds -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(milliseconds / 1000 / 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function deepCompare(object1, object2) {
    return JSON.stringify(object1) === JSON.stringify(object2);
}

function getSkillLevel(skill, total) {
    // Dael's script attaches the skill levels to window
    if (window.ISState) {
        if (total) {
            return 99 + window.ISstate.skills[skill].masteryLevel;
        }
        return window.ISstate.skills[skill].level;
    }
    // If the user activated levels in the sidebar, the skill level is always accessible from there
    const upperCaseSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
    const sidebarSkill = document.getElementsByClassName("nav-drawer-container")[0].getElementsByClassName(upperCaseSkill)[0];
    if (sidebarSkill) {
        const level = parseInt(sidebarSkill.getElementsByClassName("skill-level-bar-ni-exp-level")[0].innerText);
        if (sidebarSkill.getElementsByClassName("mastery-bar")[0]) {
            if (total && level !== 99) {
                return 99 + level;
            }
            return 99;
        }
        return level;
    }
    // Last option is the header, which might not be shown if the window is in half screen mode
    // Normal header with skills as circles
    const headerCircles = document.getElementsByClassName("exp-tooltip");
    for (const headerSkill of headerCircles) {
        if (headerSkill.dataset.for === `${skill}Header`) {
            if (headerSkill.getElementsByClassName("standard-levels-maxed")[0]) {
                if (total) {
                    return 99 + parseInt(headerSkill.getElementsByClassName("CircularProgressbar-text")[0].innerText);
                }
                return 99;
            }
            return parseInt(headerSkill.getElementsByClassName("CircularProgressbar-text")[0].innerText);
        }
    }
    // Compact header with skills as bars
    const headerSkillBars = document.getElementsByClassName("skill-level-bar");
    for (const headerSkill of headerSkillBars) {
        if (headerSkill.dataset.for === `${skill}Header`) {
            const level = parseInt(headerSkill.getElementsByClassName("skill-level-bar-exp-level")[0].innerText);
            if (headerSkill.firstChild.classList.contains("max-skill-glow30")) {
                if (total && level !== 99) {
                    return 99 + level;
                }
                return 99;
            }
            return level;
        }
    }
    // Last fallback
    return 99;
}

function insertTrackerButtons() {
    const trackerButtons = document.getElementById("tracker-buttons");
    if (trackerButtons) {
        return trackerButtons;
    }
    const marketplaceFilter = document.getElementsByClassName("anchor-marketplace-filter")[0] ?? document.getElementsByClassName("marketplace-buy-info")[0];
    marketplaceFilter.insertAdjacentHTML("afterend", '<div id="tracker-buttons" />');
    return document.getElementById("tracker-buttons");
}
