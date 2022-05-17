function offlineTracker(){
    let offlineProgressBox = document.getElementsByClassName('offline-progress-box all-items');
    if (offlineProgressBox.length === 0) {
        return;
    }
    // Offline Info already exists
    if (document.getElementsByClassName('offline-info-box').length !== 0) {
        return;
    }
    offlineProgressBox = offlineProgressBox[0];
    let itemIds = [];
    let resourceCounts = [];
    for (let itemNode of offlineProgressBox.childNodes) {
        itemIds.push(convertItemId(itemNode.firstChild.src));
        resourceCounts.push(parseNumberString(itemNode.childNodes[1].innerText));
    }
    Promise.all([
        sendMessage({
            type: 'get-item-values',
            itemIds: itemIds,
        }),
        sendMessage({
            type: 'get-last-login',
        }),
    ]).then(function(results) {
        let itemValues = results[0];
        let totalMinValue = 0;
        let totalMaxValue = 0;
        for (let i = 0; i < itemIds.length; i++) {
            // ignore items with no known value (e.g. essences)
            if (itemValues.itemMinPrices[i] === '?' || itemValues.itemMaxPrices[i] === '?') {
                continue;
            }
            totalMinValue += itemValues.itemMinPrices[i] * resourceCounts[i];
            totalMaxValue += itemValues.itemMaxPrices[i] * resourceCounts[i];
        }

        /* Offline Time
           The background script stores the last login time in localStorage whenever the tab is closed.
           This time from the background script is as accurate as it gets, but the "Offline progress"
           tab might also appear due to reconnects or character switches. The background time is
           therefore only used when the time difference is not too large. Otherwise the less accurate 
           time from the "Offline progress" tab itself is used.
           Offline time is also limited to a maximum of 12 hours.
        */ 
        let lastLogin = results[1];
        let offlineTimeBackground = Math.min(12 * 60 * 60 * 1000, Date.now() - lastLogin);
        let offlineTimeScrapped = Math.min(12 * 60 * 60 * 1000, parseTimeString(offlineProgressBox.previousSibling.childNodes[1].textContent) * 1000);
        console.log(offlineTimeBackground, offlineTimeScrapped);
        if (offlineTimeScrapped * 2 < offlineTimeBackground) {
            offlineProgressBox.insertAdjacentHTML('afterend', offlineInfoTemplate(totalMinValue, totalMaxValue, offlineTimeBackground));
        } else {
            offlineProgressBox.insertAdjacentHTML('afterend', offlineInfoTemplate(totalMinValue, totalMaxValue, offlineTimeScrapped));
        }
    });
}

function offlineInfoTemplate(totalMinValue, totalMaxValue, offlineTime) {
    let minPerHour = 0;
    let maxPerHour = 0;
    if (totalMinValue > 0) {
        minPerHour = Math.floor(totalMinValue * 1000 * 60 * 60 / offlineTime);
    }
    if (totalMaxValue > 0) {
        maxPerHour = Math.floor(totalMaxValue * 1000 * 60 * 60 / offlineTime);
    }
    return `
<div class="offline-progress-box offline-info-box">
    <div class="offline-info-title">
        Total offline value
    </div>
    <div class="offline-info-value">
        <div class="left-info">
            <span>
                ${formatNumber(totalMinValue)}
                <img src="/images/money_icon.png" class="offline-gold-icon">
            </span>
            <br>
            <span>
                ${formatNumber(minPerHour)}/h
            </span>
        </div>
        <div class="center-info">
            <span> - </span>
            <br>
            <span> - </span>
        </div>
        <div class="right-info">
            <span>
                ${formatNumber(totalMaxValue)}
                <img src="/images/money_icon.png" class="offline-gold-icon">
            </span>
            <br>
            <span>
                ${formatNumber(maxPerHour)}/h
            </span>
        </div>
    </div>
</div>
    `;
}
