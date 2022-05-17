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

function sendMessage(message) {
    message = JSON.stringify(message);
    return browser.runtime.sendMessage({
        data: message
    });
}

function parseNumberString(numberString) {
    const baseNumber = parseFloat(numberString.replace(/\./g, ''));
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
    }
    return baseNumber * Math.pow(10, scale);
}

function parseTimeString(timeString) {
    const baseTime = parseFloat(timeString);
    let scale = 1;
    if (timeString.includes('day')) {
        scale = 60 * 60 * 24;
    } else if (timeString.includes('hour')) {
        scale = 60 * 60;
    } else if (timeString.includes('minute')) {
        scale = 60;
    }
    return baseTime * scale;
}
