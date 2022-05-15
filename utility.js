// example:
// "/images/mining/stygian_ore.png" -> "Stygian Ore"
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
