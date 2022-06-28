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
    let itemCounts = [];
    for (let itemNode of offlineProgressBox.childNodes) {
        let itemId = convertItemId(itemNode.firstChild.src);
        if (itemId.includes('essence')) {
            continue;
        }
        itemIds.push(itemId);
        itemCounts.push(parseNumberString(itemNode.childNodes[1].innerText));
    }
    let itemValues = storageRequest({
        type: 'get-item-values',
        itemIds: itemIds,
    });
    let lastLogin = storageRequest({
        type: 'get-last-login',
    });
    let [totalMinValue, totalMaxValue] = totalRecipePrice(itemValues.itemMinPrices, itemValues.itemMaxPrices, itemCounts);

    /* Offline Time
        The background script stores the last login time in localStorage whenever the tab is closed.
        This time from the background script is as accurate as it gets, but the "Offline progress"
        tab might also appear due to reconnects or character switches. The background time is
        therefore only used when the time difference is not too large. Otherwise the less accurate 
        time from the "Offline progress" tab itself is used.
        Offline time is also limited to a maximum of 12 hours.
    */ 
    let offlineTimeBackground = Date.now() - lastLogin;
    let offlineTimeScrappedString = offlineProgressBox.previousElementSibling.innerText;
    let [offlineTimeScrapped, offlineTimeScrappedScale] = parseTimeString(offlineTimeScrappedString, returnScale = true);
    let offlineTime = calculateOfflineTime(offlineTimeBackground, offlineTimeScrapped, offlineTimeScrappedScale);
    saveInsertAdjacentHTML(offlineProgressBox, 'afterend', offlineInfoTemplate(totalMinValue, 
                                                                                totalMaxValue, 
                                                                                offlineTime));
}

function calculateOfflineTime(background, scrapped, scale) {
    if (background < scrapped) {
        return Math.min(12 * 60 * 60 * 1000, scrapped);
    }
    // background and scale differ by more than one time unit (second/minute/hour/day)
    if (((background / scale) - (scrapped / scale)) > 1) {
        return Math.min(12 * 60 * 60 * 1000, scrapped);
    }
    return Math.min(12 * 60 * 60 * 1000, background);
}

function offlineInfoTemplate(totalMinValue, totalMaxValue, offlineTime) {
    let minPerHour = 0;
    let maxPerHour = 0;
    if (offlineTime > 0) {
        minPerHour = Math.floor(totalMinValue * 1000 * 60 * 60 / offlineTime);
        maxPerHour = Math.floor(totalMaxValue * 1000 * 60 * 60 / offlineTime);
    }
    return `
<div class="offline-progress-box offline-info-box">
    <div class="offline-info-title">
        Total value
    </div>
    <div class="offline-info-value">
        <div class="left-info">
            <span>
                ${numberWithSeparators(limitDecimalPlaces(totalMinValue, 0))}
                <img src="/images/money_icon.png" class="offline-gold-icon">
            </span>
            <br>
            <span>
                ${numberWithSeparators(minPerHour)}/h
            </span>
        </div>
        <div class="center-info">
            <span> - </span>
            <br>
            <span> - </span>
        </div>
        <div class="right-info">
            <span>
                ${numberWithSeparators(limitDecimalPlaces(totalMaxValue, 0))}
                <img src="/images/money_icon.png" class="offline-gold-icon">
            </span>
            <br>
            <span>
                ${numberWithSeparators(maxPerHour)}/h
            </span>
        </div>
    </div>
</div>
    `;
}
