class PopupTracker {
    static id = "offline_tracker"; // old id to maintain settings
    static displayName = "Popup Tracker";
    static icon = "<img src='/images/clock.png' alt='Popup Tracker Icon'>";
    static category = "economy";
    css = `
.popup-info-box {
    padding: 10px;
    text-align: center;
    font-size: 25px;
    display: grid;
    grid-template-columns: 1fr 20px 1fr;
    justify-content: center;
}

.chat-chest-info-box.popup-info-box,
.resource-info-box.popup-info-box{
    font-size: 14px;
}

.popup-gold-icon {
    height: 28px;
    width: 28px;
    vertical-align: text-top;
}

.chat-chest-info-box .popup-gold-icon,
.resource-info-box .popup-gold-icon {
    height: 15px;
    width: 15px;
}
    `;
    chestAmounts = [];

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;
        if (this.settings.offline_popup === undefined) {
            this.settings.offline_popup = 1;
        }
        if (this.settings.chest_popup === undefined) {
            this.settings.chest_popup = 1;
        }
        if (this.settings.chat_chest_popup === undefined) {
            this.settings.chat_chest_popup = 0;
        }
        if (this.settings.resource_popup === undefined) {
            this.settings.resource_popup = 0;
        }
        if (this.settings.include_gold === undefined) {
            this.settings.include_gold = 1;
        }
        if (this.settings.lastLogin === undefined || typeof this.settings.lastLogin !== "number") {
            this.settings.lastLogin = Date.now();
        }
        this.cssNode = injectCSS(this.css);

        window.addEventListener("beforeunload", () => {
            this.settings.lastLogin = Date.now();
            this.tracker.storeSettings();
        });

        this.bodyObserver = new MutationObserver((mutations) => {
            if (detectInfiniteLoop(mutations)) {
                return;
            }
            this.offlineTracker();
            this.chestTracker();
            this.chatChestTracker();
            this.resourcePopupTracker();
            this.popoverObserver.disconnect();
            document.querySelectorAll(".react-tiny-popover-container").forEach((node) => {
                this.popoverObserver.observe(node, {
                    attributes: true,
                    attributeFilter: ["style"],
                });
            });
        });
        this.chestObserver = new MutationObserver((mutations) => {
            if (detectInfiniteLoop(mutations)) {
                return;
            }
            this.chestTracker();
        });
        this.popoverObserver = new MutationObserver((mutations) => {
            if (detectInfiniteLoop(mutations)) {
                return;
            }
            this.chatChestTracker();
            this.resourcePopupTracker();
        });
    }

    onGameReady() {
        this.bodyObserver.observe(document.body, {
            childList: true,
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
                    Offline popup
                </div>
                ${Templates.checkboxTemplate(PopupTracker.id + "-offline_popup", this.settings.offline_popup)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Chest/Dungeon completion popup
                </div>
                ${Templates.checkboxTemplate(PopupTracker.id + "-chest_popup", this.settings.chest_popup)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Chat Chest link
                </div>
                ${Templates.checkboxTemplate(PopupTracker.id + "-chat_chest_popup", this.settings.chat_chest_popup)}
            </div>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Resource popup
                    <div class="tracker-module-setting-description">
                        <div>Doesn't handle resources that can drop in bulk.</div>
                        <div>And I wouldn't trust it for foraging or fishing at all :)</div>
                    </div>
                </div>
                ${Templates.checkboxTemplate(PopupTracker.id + "-resource_popup", this.settings.resource_popup)}
            </div>
            </br>
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Include Gold
                </div>
                ${Templates.checkboxTemplate(PopupTracker.id + "-include_gold", this.settings.include_gold)}
            </div>`;
    }

    settingChanged(settingId, value) {
        return;
    }

    onAPIUpdate() {
        this.offlineTracker(true);
        this.chestTracker(true);
        this.chatChestTracker(true);
        this.resourcePopupTracker(true);
    }

    offlineTracker(forceUpdate = false) {
        if (!this.settings.offline_popup) {
            return;
        }
        let offlineProgressBox = document.getElementsByClassName("offline-progress-box all-items")[0];
        if (!offlineProgressBox) {
            return;
        }
        // Offline Info already exists
        const existingInfoBox = document.getElementsByClassName("offline-info-box")[0];
        if (existingInfoBox) {
            if (forceUpdate) {
                existingInfoBox.remove();
            } else {
                return;
            }
        }

        const title = document.getElementsByClassName("MuiTypography-root MuiTypography-h6")[0].innerText;
        const isDaelsTracker = title === "Resources Tracker";
        const [totalMinValue, totalMaxValue] = this.totalValue(
            offlineProgressBox,
            isDaelsTracker ? (itemNode) => JSON.parse(atob(itemNode.dataset.item)).stackSize : undefined,
            isDaelsTracker ? (itemNode) => JSON.parse(atob(itemNode.dataset.item)).itemID : undefined
        );

        /* Offline Time
            - Offline Tracker:
            The storage script stores the last login time in localStorage whenever the tab is closed.
            This time from the storage script is as accurate as it gets, but the "Offline progress"
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
                offlineTime = this.calculateOfflineTime(
                    offlineTimeBackground,
                    offlineTimeScrapped,
                    offlineTimeScrappedScale
                );
            }
        } else {
            offlineTime = offlineTimeScrapped;
        }
        saveInsertAdjacentHTML(
            offlineProgressBox,
            "afterend",
            this.popupInfoTemplate(totalMinValue, totalMaxValue, "offline-progress-box offline-info-box", offlineTime)
        );
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

    chestTracker(forceUpdate = false) {
        const chestPopups = document.getElementsByClassName("chest-open-box all-items");
        if (chestPopups.length === 0) {
            this.chestObserver.disconnect();
            return;
        }
        const titles = document.getElementsByClassName("MuiTypography-root MuiTypography-h6");
        const chestAmounts = Array.from(titles).map((title) => {
            const titleText = title.innerText;
            const match = titleText.match(/\d+/);
            if (match) {
                return parseInt(match[0]);
            } else {
                return 1;
            }
        });
        if (
            chestAmounts.length !== this.chestAmounts.length ||
            chestAmounts.some((value, index) => value !== this.chestAmounts[index])
        ) {
            const existingInfoBoxes = document.getElementsByClassName("chest-info-box");
            for (let i = existingInfoBoxes.length - 1; i >= 0; i--) {
                existingInfoBoxes[i].remove();
            }
        }
        this.chestAmounts = chestAmounts;
        for (let i = 0; i < chestPopups.length; i++) {
            const chestPopup = chestPopups[i];
            if (chestPopup.nextElementSibling && chestPopup.nextElementSibling.classList.contains("chest-info-box")) {
                if (forceUpdate) {
                    chestPopup.nextElementSibling.remove();
                } else {
                    continue;
                }
            }
            const [totalMinValue, totalMaxValue] = this.totalValue(chestPopup);
            saveInsertAdjacentHTML(
                chestPopup,
                "afterend",
                this.popupInfoTemplate(totalMinValue, totalMaxValue, "offline-progress-box chest-info-box")
            );
        }
        this.chestObserver.observe(chestPopups[0].parentElement, {
            childList: true,
        });
    }

    chatChestTracker(forceUpdate = false) {
        if (!this.settings.chat_chest_popup) {
            return;
        }
        const chatChestPopup = document.getElementsByClassName("chest-tooltip-loot-container")[0];
        if (!chatChestPopup) {
            return;
        }
        const existingInfoBox = document.getElementsByClassName("chat-chest-info-box")[0];
        if (existingInfoBox) {
            if (forceUpdate) {
                existingInfoBox.remove();
            } else {
                return;
            }
        }
        const [totalMinValue, totalMaxValue] = this.totalValue(chatChestPopup);
        saveInsertAdjacentHTML(
            chatChestPopup,
            "afterend",
            this.popupInfoTemplate(totalMinValue, totalMaxValue, "chat-chest-info-box")
        );
    }

    resourcePopupTracker(forceUpdate = false) {
        if (!this.settings.resource_popup) {
            return;
        }
        const resourcePopup = document.getElementsByClassName("resource-container-resource-list")[0];
        if (!resourcePopup) {
            return;
        }
        const existingInfoBox = document.getElementsByClassName("resource-info-box")[0];
        if (existingInfoBox) {
            if (forceUpdate) {
                existingInfoBox.remove();
            } else {
                return;
            }
        }
        const [totalMinValue, totalMaxValue] = this.totalValue(resourcePopup, (itemNode) => {
            const percentString = itemNode.getElementsByClassName("centered")[0].innerText;
            if (percentString === "???" || percentString.endsWith("Rarity")) return 0;
            return parseFloat(percentString) / 100;
        });
        const actions = document.getElementsByClassName("resource-container-resource-aph")[0].lastChild.textContent;
        const timePerAction = (1 / actions) * 60 * 60 * 1000;
        saveInsertAdjacentHTML(
            resourcePopup,
            "afterend",
            this.popupInfoTemplate(totalMinValue, totalMaxValue, "resource-info-box", timePerAction)
        );
    }

    popupInfoTemplate(totalMinValue, totalMaxValue, classes, timeInMs = undefined) {
        let template = `
            <div class="${classes} popup-info-box">
                <span>
                    ${formatNumber(totalMinValue)}
                    <img src="/images/money_icon.png" class="popup-gold-icon">
                </span>
                <span> ~ </span>
                <span>
                    ${formatNumber(totalMaxValue)}
                    <img src="/images/money_icon.png" class="popup-gold-icon">
                </span>
                    `;
        if (timeInMs) {
            const minPerHour = (totalMinValue * 1000 * 60 * 60) / timeInMs;
            const maxPerHour = (totalMaxValue * 1000 * 60 * 60) / timeInMs;
            template += `
                <span>
                    ${formatNumber(minPerHour)}/h
                </span>
                <span> ~ </span>
                <span>
                    ${formatNumber(maxPerHour)}/h
                </span>
                </div>`;
        }
        template += `
            </div>`;
        return template;
    }

    totalValue(itemBox, parseCount = undefined, parseApiId = undefined) {
        const items = {};
        for (let itemNode of itemBox.childNodes) {
            const apiId = parseApiId !== undefined ? parseApiId(itemNode) : convertApiId(itemNode);
            if (!apiId) continue;
            // Specifically allow type conversion to string here
            if (!this.settings.include_gold && apiId == 1) {
                continue;
            }
            const itemCount =
                parseCount !== undefined
                    ? parseCount(itemNode)
                    : parseCompactNumberString(itemNode.getElementsByClassName("centered")[0]?.innerText ?? "1");
            // adds to existing count if itemId already occured
            items[apiId] ??= 0;
            items[apiId] += itemCount;
        }
        // filter out items with 0 count
        for (let apiId in items) {
            if (items[apiId] === 0) {
                delete items[apiId];
            }
        }

        const { minPrices, maxPrices, vendorPrices } = this.storage.analyzeItems(Object.keys(items));
        const itemCounts = Object.values(items);

        const sanitizedMinPrices = minPrices.map((price) => (isNaN(price) ? 0 : price));
        const sanitizedMaxPrices = maxPrices.map((price) => (isNaN(price) ? 0 : price));
        const sanitizedVendorPrices = vendorPrices.map((price) => (isNaN(price) ? 0 : price));
        let totalMinValue = 0;
        let totalMaxValue = 0;
        for (let i = 0; i < itemCounts.length; i++) {
            if (itemCounts[i] > 0) {
                totalMinValue += Math.max(sanitizedMinPrices[i], sanitizedVendorPrices[i]) * itemCounts[i];
                totalMaxValue += Math.max(sanitizedMaxPrices[i], sanitizedVendorPrices[i]) * itemCounts[i];
            } else {
                totalMinValue += sanitizedMaxPrices[i] * itemCounts[i];
                totalMaxValue += sanitizedMinPrices[i] * itemCounts[i];
            }
        }
        return [totalMinValue, totalMaxValue];
    }
}
