// example:
// "/images/mining/stygian_ore.png" -> "stygian_ore"
function convertItemId(itemName) {
    itemName = itemName.substring(itemName.lastIndexOf('/') + 1, itemName.lastIndexOf('.'));
    itemName = itemName.replace(/-/g, '_');
    return itemName;
}

// Add thousands separator to number
function formatNumber(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Inspired from https://github.com/daelidle/ISscripts/blob/ac93a2c4d2b52f37ffaefd42e3dd54959d6c258a/src/utils/GeneralUtils.js#L22
function shortenNumber(number) {
    let suffix = number.toString().replace(/[\+\-0-9\.]/g, '');
    number = parseFloat(number);
    if (number < 10000) {
        return number.toFixed(1).replace('.0', '') + suffix;
    }
    const SYMBOL = ['', 'K', 'M', 'B', 'T', 'P', 'E'];
    let index = 0;
    while (number >= 1000) {
        number /= 1000;
        index++;
    }
    return number.toFixed(1).replace('.0', '') + SYMBOL[index] + suffix;
}

function sendMessage(message) {
    message = JSON.stringify(message);
    return browser.runtime.sendMessage({
        data: message
    });
}

function parseNumberString(numberString) {
    const baseNumber = parseFloat(numberString.replace(/\./g, '').replace(/,/, '.'));
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
    const baseTime = parseFloat(timeString);
    let scale = 1;
    if (timeString.includes('day')) {
        scale = 1000 * 60 * 60 * 24;
    } else if (timeString.includes('hour')) {
        scale = 1000 * 60 * 60;
    } else if (timeString.includes('minute')) {
        scale = 1000 * 60;
    } else if (timeString.includes('second')) {
        scale = 1000;
    }
    if (returnScale) {
        return [baseTime * scale, scale];
    }
    return baseTime * scale;
}

function totalRecipePrice(resourceMinPrices,
                            resourceMaxPrices,
                            resourceCounts) {
    let totalResourceMinPrice = 0;
    let totalResourceMaxPrice = 0;
    for (let i = 0; i < resourceCounts.length; i++) {
        if (resourceMinPrices[i] !== "?") {
            totalResourceMinPrice += resourceMinPrices[i] * resourceCounts[i];
            totalResourceMaxPrice += resourceMaxPrices[i] * resourceCounts[i];
        }
    }
    return [totalResourceMinPrice, totalResourceMaxPrice];
}

// Returns the profit including market fee in percent as a string
function profitPercent(buyPrice, sellPrice, decimalPlaces = 2) {
    if (buyPrice === "?" || sellPrice === "?") {
        return "?";
    }
    return ((sellPrice * 0.95 - buyPrice) / buyPrice * 100).toFixed(decimalPlaces) + "%";
}
