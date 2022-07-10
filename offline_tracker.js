class OfflineTracker {
    constructor() {
        this.observer = new MutationObserver(mutations => {
            this.offlineTracker();
        });
        this.observer.observe(document.body, {
            childList: true
        });
    };

    offlineTracker(){
        const offlineProgressBox = document.getElementsByClassName('offline-progress-box all-items')[0];
        if (!offlineProgressBox) {
            return;
        }
        // Offline Info already exists
        if (document.getElementsByClassName('offline-info-box').length !== 0) {
            return;
        }
        const title = document.getElementsByClassName('MuiTypography-root MuiTypography-h6')[0].innerText;
        const isDaelsTracker = title === 'Resources Tracker';
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
        const itemValues = storageRequest({
            type: 'get-item-values',
            itemIds: itemIds,
        });
        const lastLogin = storageRequest({
            type: 'get-last-login',
        });
        const [totalMinValue, totalMaxValue] = totalRecipePrice(itemValues.itemMinPrices, itemValues.itemMaxPrices, itemCounts);

        /* Offline Time
            - Offline Tracker:
            The background script stores the last login time in localStorage whenever the tab is closed.
            This time from the background script is as accurate as it gets, but the "Offline progress"
            tab might also appear due to reconnects or character switches. The background time is
            therefore only used when the time difference is not too large. Otherwise the less accurate
            time from the "Offline progress" tab itself is used.
            Offline time is also limited to a maximum of 12 hours.
            - Dael's Tracker:
            Just use the scrapped time.
        */
        const offlineTimeScrappedString = offlineProgressBox.previousElementSibling.innerText;
        const [offlineTimeScrapped, offlineTimeScrappedScale] = parseTimeString(offlineTimeScrappedString, true);
        let offlineTime;
        if (!isDaelsTracker) {
            const offlineTimeBackground = Date.now() - lastLogin;
            offlineTime = this.calculateOfflineTime(offlineTimeBackground, offlineTimeScrapped, offlineTimeScrappedScale);
        } else {
            offlineTime = offlineTimeScrapped;
        }
        saveInsertAdjacentHTML(offlineProgressBox, 'afterend', this.offlineInfoTemplate(totalMinValue, 
                                                                                        totalMaxValue, 
                                                                                        offlineTime));
    }

    calculateOfflineTime(background, scrapped, scale) {
        if (background < scrapped) {
            return Math.min(12 * 60 * 60 * 1000, scrapped);
        }
        // background and scale differ by more than one time unit (second/minute/hour/day)
        if (((background / scale) - (scrapped / scale)) > 1) {
            return Math.min(12 * 60 * 60 * 1000, scrapped);
        }
        return Math.min(12 * 60 * 60 * 1000, background);
    }

    offlineInfoTemplate(totalMinValue, totalMaxValue, offlineTime) {
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
}
