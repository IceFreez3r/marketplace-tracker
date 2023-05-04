class OfflineTracker {
    static id = 'offline_tracker';
    static displayName = 'Offline Tracker';
    static icon = "<img src='/images/clock.png' alt='Offline Tracker Icon'>";
    static category = "economy";
    css = `
.offline-info-box {
    padding: 10px;
    text-align: center;
    font-size: 25px;
}

.offline-gold-icon {
    height: 28px;
    width: 28px;
    vertical-align: text-top;
}

.offline-info-value {
    display: flex;
    justify-content: center;
}

.offline-info-value .left-info {
    flex: 1;
    text-align: right;
}

.offline-info-value .center-info {
    flex: 0;
    padding: 0 5px;
}

.offline-info-value .right-info {
    flex: 1;
    text-align: left;
}
    `;

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;
        if (this.settings.include_gold === undefined) {
            this.settings.include_gold = 1;
        }
        if (this.settings.lastLogin === undefined || typeof(this.settings.lastLogin) !== 'number') {
            this.settings.lastLogin = Date.now();
        }
        this.cssNode = injectCSS(this.css);

        window.addEventListener('beforeunload', () => {
            this.settings.lastLogin = Date.now();
            this.tracker.storeSettings();
        });

        this.bodyObserver = new MutationObserver(mutations => {
            if (detectInfiniteLoop(mutations)) {
                return;
            }
            this.offlineTracker();
        });
    };

    onGameReady() {
        this.bodyObserver.observe(document.body, {
            childList: true
        });
        this.offlineTracker();
    }

    deactivate() {
        this.cssNode.remove();
        this.bodyObserver.disconnect();
    }

    settingsMenuContent() {
        return `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Include Gold
                </div>
                ${Templates.checkboxTemplate(OfflineTracker.id + '-include_gold', this.settings.include_gold)}
            </div>`;
    }

    settingChanged(settingId, value) {
        return;
    }

    onAPIUpdate() {
        return;
    }

    offlineTracker(){
        let offlineProgressBox = document.getElementsByClassName('offline-progress-box all-items')[0];
        if (!offlineProgressBox) {
            return;
        }
        // Offline Info already exists
        if (document.getElementsByClassName('offline-info-box').length !== 0) {
            return;
        }
        const title = document.getElementsByClassName('MuiTypography-root MuiTypography-h6')[0].innerText;
        const isDaelsTracker = title === 'Resources Tracker';
        const items = {};
        for (let itemNode of offlineProgressBox.childNodes) {
            const itemId = convertItemId(itemNode.firstChild.src);
            if (!this.settings.include_gold && itemId === 'money_icon') {
                continue;
            }
            const itemCount = parseCompactNumberString(itemNode.childNodes[1].innerText);
            // adds to existing count if itemId already occured
            items[itemId] ??= 0;
            items[itemId] += itemCount;
        }
        const itemValues = this.storage.analyzeItems(Object.keys(items));
        const [totalMinValue, totalMaxValue] = totalValue(itemValues.minPrices, itemValues.maxPrices, Object.values(items));

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
            if (!this.settings.lastLogin) {
                offlineTime = offlineTimeScrapped;
            } else {
                const offlineTimeBackground = Date.now() - this.settings.lastLogin;
                offlineTime = this.calculateOfflineTime(offlineTimeBackground, offlineTimeScrapped, offlineTimeScrappedScale);
            }
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
        if (background - scrapped > scale) {
            return Math.min(12 * 60 * 60 * 1000, scrapped);
        }
        return Math.min(12 * 60 * 60 * 1000, background);
    }

    offlineInfoTemplate(totalMinValue, totalMaxValue, offlineTime) {
        const minPerHour = totalMinValue * 1000 * 60 * 60 / offlineTime;
        const maxPerHour = totalMaxValue * 1000 * 60 * 60 / offlineTime;
        return `
            <div class="offline-progress-box offline-info-box">
                <div class="offline-info-title">
                    Total value
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
                        <span> ~ </span>
                        <br>
                        <span> ~ </span>
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
            </div>`;
    }
}
