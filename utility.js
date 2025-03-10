// example:
// "/images/mining/stygian_ore.png" -> "stygian_ore"
function convertItemId(itemName) {
    itemName = itemName.substring(itemName.lastIndexOf("/") + 1, itemName.lastIndexOf("."));
    itemName = itemName.replace(/-/g, "_");
    return itemName;
}

function convertApiId(element) {
    const apiId = element.dataset.itemid;
    if (!apiId) {
        // throw new Error("No apiId found on element: " + element);
        console.error("Bad element passed to convertApiId: " + element);
        return null;
    }
    return apiId;
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
    const days = match.groups.days
        ? parseInt(match.groups.days)
        : compactMatch.groups.days
        ? parseInt(compactMatch.groups.days)
        : 0;
    const hours = match.groups.hours
        ? parseInt(match.groups.hours)
        : compactMatch.groups.hours
        ? parseInt(compactMatch.groups.hours)
        : 0;
    const minutes = match.groups.minutes
        ? parseInt(match.groups.minutes)
        : compactMatch.groups.minutes
        ? parseInt(compactMatch.groups.minutes)
        : 0;
    const seconds = match.groups.seconds
        ? parseInt(match.groups.seconds)
        : compactMatch.groups.seconds
        ? parseFloat(compactMatch.groups.seconds)
        : 0;
    const time = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
    if (!returnScale) {
        return time;
    }
    const scaleOptions = [1000 * 60 * 60 * 24, 1000 * 60 * 60, 1000 * 60, 1000, 1];
    return [time, scaleOptions.find((scale) => time >= scale)];
}

function priceStringToNumber(priceString) {
    priceString = priceString.replace(/[^0-9kKmMbB.]/g, "");
    let price = parseFloat(priceString);
    if (isNaN(price)) return 0;
    const scale = {
        k: 1000,
        m: 1000000,
        b: 1000000000,
    };
    const stringExponent = priceString.match(/[kKmMbB]/i);
    if (stringExponent) {
        const factor = stringExponent[0];
        priceString = price.toString() + factor;
        price *= scale[factor.toLowerCase()];
    }
    return price;
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
    return document.querySelector(".header-username")?.textContent;
}

function isIronmanCharacter() {
    return document.getElementsByClassName("header-league-icon")[0].src.includes("ironman");
}

function getLeagueId(leagueIcon, leagueList) {
    if (!leagueList) leagueList = getIdlescapeWindowObject()?.leagues;
    if (!leagueList) return undefined;
    const league = Object.values(leagueList).find((league) => leagueIcon.src.endsWith(league.icon));
    if (league) {
        let id = league.id;
        // Get the next lower market league
        // Assumes that market leagues are always before ironman leagues
        while (id > 0) {
            if (leagueList[id]?.rules.marketplace) break;
            id--;
        }
        if (id === 0) return undefined;
        return id;
    }
    return undefined;
}

function getSelectedSkill() {
    const selectedSkillNavTab = document.getElementsByClassName("nav-tab selected-tab")[0];
    if (selectedSkillNavTab) return selectedSkillNavTab.innerText;
    const selectedSkillMobileTab = document.getElementsByClassName("anchor-mobile-tab-active")[0];
    if (selectedSkillMobileTab) return selectedSkillMobileTab.firstChild.firstChild.innerText;
    return "";
}

function getSelectedSubSkill() {
    const selectedSubSkillNavTab = document.querySelector(".anchor-selected-skill-tab > span");
    return selectedSubSkillNavTab?.innerText;
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
    const { compactDisplay, profitType, showSign, fraction, longFraction } = options;
    if (isNaN(number)) {
        return "?";
    }
    let formatterOptions = {
        maximumFractionDigits: longFraction ? 4 : fraction ? 2 : 0,
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

function getSkillLevel(skill, total, effective = false) {
    const skillElement = document.getElementsByClassName(`anchor-levels-${skill}`)[0];
    // Fallback, this shouldn't happen
    if (!skillElement) return 99;
    if (effective) {
        const effectiveLevel = skillElement.getElementsByClassName("anchor-levels-effective-level")[0].innerText;
        return parseInt(effectiveLevel);
    }
    const level = skillElement.getElementsByClassName("anchor-levels-level")[0].innerText;
    if (!total) return parseInt(level);
    const masteryLevel = skillElement.getElementsByClassName("anchor-levels-mastery-level")[0].innerText;
    return parseInt(level) + parseInt(masteryLevel);
}

function insertTrackerButtons() {
    let trackerButtons = document.getElementById("tracker-buttons");
    if (!trackerButtons) {
        const marketplaceFilter = document.querySelector(".marketplace-search > .anchor-idlescape-input");
        marketplaceFilter.insertAdjacentHTML("beforebegin", '<div id="tracker-buttons" />');
        trackerButtons = document.getElementById("tracker-buttons");
    }
    const page = getMarketPage();
    trackerButtons.classList.remove(trackerButtons.classList[trackerButtons.classList.length - 1]);
    trackerButtons.classList.add(page);
    return trackerButtons;
}

function stringToHTMLElement(HTMLString) {
    const template = document.createElement("template");
    saveInsertAdjacentHTML(template, "beforeend", HTMLString);
    return template.children[0];
}

function getPlayAreaContainer() {
    return document.getElementsByClassName("play-area-wrapper")[0];
}

function getHSLColor(quantile, colorBlindMode = false) {
    let hue = 120 * (1 - quantile);
    if (colorBlindMode) {
        hue = 360 - hue * 1.5;
    }
    return `hsl(${hue}, 80%, 40%)`;
}

function getIdlescapeWindowObject() {
    return window.wrappedJSObject?.Idlescape?.data ?? window.Idlescape?.data;
}

function getItemData(apiId) {
    return getIdlescapeWindowObject().items[apiId];
}

function getEnchantmentBySrc(src) {
    const enchantments = getIdlescapeWindowObject().enchantments;
    return Object.values(enchantments).find((enchantment) => enchantment.buffIcon.endsWith(src));
}

// https://stackoverflow.com/a/52486921/12540220
function setReactNativeValue(element, value) {
    const lastValue = element.value;
    element.value = value;
    const event = new Event("input", { target: element, bubbles: true });
    // React 15
    event.simulated = true;
    // React 16
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
}

// vanilla function
function getItemTier(itemData) {
    let highestRequiredLevel;
    if (itemData.requiredLevel) {
        // Highest level of the required skills
        highestRequiredLevel = Math.max(...Object.values(itemData.requiredLevel));
        highestRequiredLevel = Number(highestRequiredLevel / 10);
    }
    return itemData.overrideItemTier ?? highestRequiredLevel ?? itemData.enchantmentTier ?? 1;
}

function combineWithSelfPrices(ingredientPrices, ingredientSelfPrices) {
    return ingredientPrices.map((price, index) => {
        if ((price || Infinity) > ingredientSelfPrices[index].price) {
            return ingredientSelfPrices[index];
        }
        return { price, type: null };
    });
}

function getMarketPage() {
    if (document.querySelector(".marketplace-show-both, .marketplace-show-buy, .marketplace-show-sell")) return "buy";
    if (document.querySelector(".anchor-sell-all-items")) return "listings";
    if (document.querySelector(".anchor-sell-listings")) return "listings";
    if (document.querySelector(".anchor-buy-offers")) return "offers";
    if (document.querySelector(".anchor-buy-all-items")) return "overview";
    if (document.querySelector(".marketplace-history-container")) return "history";
    return "unknown";
}

/** Only works on buy page */
function getApiId() {
    const marketplaceTableHeader = document.getElementsByClassName("anchor-market-tables-header")[0];
    if (marketplaceTableHeader) return convertApiId(marketplaceTableHeader.getElementsByClassName("item")[0]);
    return -1;
}
