// example:
// "/images/mining/stygian_ore.png" -> "stygian_ore"
function convertItemId(itemName) {
    itemName = itemName.substring(itemName.lastIndexOf("/") + 1, itemName.lastIndexOf("."));
    itemName = itemName.replace(/-/g, "_");
    return itemName;
}

function parseNumberString(numberString) {
    return parseFloat(numberString.replaceAll(",", ""));
}

function parseCompactNumberString(numberString) {
    const baseNumber = parseNumberString(numberString);
    const parseScale = {
        K: 3,
        M: 6,
        B: 9,
        T: 12,
        P: 15,
        E: 18,
    };
    const scale = parseScale[numberString.slice(-1).toUpperCase()] || 0;
    return Math.round(baseNumber * Math.pow(10, scale));
}

// Parses a time string and returns the time in milliseconds
function parseTimeString(timeString, returnScale = false) {
    const regex =
        /(?<days>\d+\sday)?[s\s]*(?<hours>\d+\shour)?[s\s]*(?<minutes>\d+\sminute)?[s\s]*(?<seconds>\d+\ssecond)?[s\s]*\.?$/;
    const compactRegex =
        /(?<days>\d+d)?[s\s]*(?<hours>\d+h)?[s\s]*(?<minutes>\d+m)?[s\s]*(?<seconds>\d+(\.\d+)?s)?[s\s]*\.?$/;
    const match = timeString.match(regex);
    const compactMatch = timeString.match(compactRegex);
    const days = match.groups.days ? parseInt(match.groups.days) : (compactMatch.groups.days ? parseInt(compactMatch.groups.days) : 0);
    const hours = match.groups.hours ? parseInt(match.groups.hours) : (compactMatch.groups.hours ? parseInt(compactMatch.groups.hours) : 0);
    const minutes = match.groups.minutes ? parseInt(match.groups.minutes) : (compactMatch.groups.minutes ? parseInt(compactMatch.groups.minutes) : 0);
    const seconds = match.groups.seconds ? parseInt(match.groups.seconds) : (compactMatch.groups.seconds ? parseFloat(compactMatch.groups.seconds) : 0);
    const time = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
    if (!returnScale) {
        return time;
    }
    const scaleOptions = [1000 * 60 * 60 * 24, 1000 * 60 * 60, 1000 * 60, 1000, 1];
    return [time, scaleOptions.find((scale) => time >= scale)];
}

function totalRecipePrice(resourcePrices, resourceCounts, chance = 1) {
    // dot product of prices and counts divided by chance
    return (
        resourcePrices
            .map((price, index) => (!isNaN(price) ? price * resourceCounts[index] : 0))
            .reduce((a, b) => a + b, 0) / chance
    );
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
            return (Math.floor(sell * postFee) - buy) * ((60 * 60) / secondsPerAction);
        default:
            console.error("Unknown profit type: " + type);
    }
}

function saveInsertAdjacentHTML(element, position, html) {
    element.insertAdjacentHTML(position, DOMPurify.sanitize(html));
}

function injectCSS(css) {
    let style = document.createElement("style");
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
    return style;
}

function getCharacterName() {
    return document.getElementsByClassName("navbar1-box left drawer-button")?.[0]?.childNodes?.[1]?.textContent;
}

function isIronmanCharacter() {
    return document.getElementsByClassName("header-league-icon")[0].src.includes("ironman");
}

function getLeagueId() {
    const leagueIcon = document.getElementsByClassName("header-league-icon")[0];
    if (leagueIcon.src.endsWith("default_league_icon.png")) {
        return 1;
    } else if (leagueIcon.src.endsWith("ironman_league_icon_v5.png")) {
        return 2;
    } else if (leagueIcon.src.endsWith("nogather_ironman_league.png")) {
        return 3;
    } else if (leagueIcon.src.endsWith("group_ironman.png")) {
        return 4;
    } else if (leagueIcon.src.endsWith("pre_league_test.png")) {
        return 5;
    } else if (leagueIcon.src.endsWith("season1.png")) {
        return 6;
    } else if (leagueIcon.src.endsWith("season1ironman.png")) {
        return 7;
    }
    console.log("Unknown league icon: " + leagueIcon.src + ". Defaulting to normal league.");
    return 1;
}

function getSelectedSkill() {
    const selectedSkill = document.getElementsByClassName("nav-tab selected-tab")[0];
    return selectedSkill ? selectedSkill.innerText : "";
}

function detectInfiniteLoop(mutations) {
    const whitelistedChildren = ["chest-tooltip", "resource-container-tooltip"];
    const ignoredTargets = ["price", "heat-highlight"];
    const ignoredNodes = [
        "react-tiny-popover-container",
        "scrollcrafting-totals-bar",
        "quantile-dot",
        "alert-icon",
        "tracker-ignore",
    ];
    const ignoredChildren = ["daelis-wow-tooltip"];
    for (const mutation of mutations) {
        const nodes = Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes));
        // Whitelist
        for (const node of nodes) {
            for (const whitelistedChild of whitelistedChildren) {
                if (node.getElementsByClassName?.(whitelistedChild).length > 0) {
                    return false;
                }
            }
        }
        // Blacklist
        if (ignoredTargets.some((target) => mutation.target.classList.contains(target))) {
            return true;
        }
        for (const node of nodes) {
            if (node.classList && ignoredNodes.some((target) => node.classList.contains(target))) {
                return true;
            }
            for (const ignoredChild of ignoredChildren) {
                if (node.getElementsByClassName?.(ignoredChild).length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function formatNumber(number, options = {}) {
    const { compactDisplay, profitType, showSign, fraction } = options;
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
    const skillElement = document.getElementsByClassName(`anchor-levels-${skill}`)[0];
    if (!skillElement) return 99;
    const level = skillElement.getElementsByClassName("anchor-levels-level")[0].innerText;
    if (!total) return parseInt(level);
    const masteryLevel = skillElement.getElementsByClassName("anchor-levels-mastery-level")[0].innerText;
    return parseInt(level) + parseInt(masteryLevel);
}

function insertTrackerButtons() {
    const trackerButtons = document.getElementById("tracker-buttons");
    if (trackerButtons) {
        return trackerButtons;
    }
    const marketplaceFilter =
        document.getElementsByClassName("anchor-marketplace-filter")[0] ??
        document.getElementsByClassName("marketplace-buy-info")[0];
    marketplaceFilter.insertAdjacentHTML("afterend", '<div id="tracker-buttons" />');
    return document.getElementById("tracker-buttons");
}

function stringToHTMLElement(HTMLString) {
    const template = document.createElement("template");
    saveInsertAdjacentHTML(template, "beforeend", HTMLString);
    return template.children[0];
}
