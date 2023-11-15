class AlertTracker {
    static id = "alert_tracker";
    static displayName = "Alert Tracker";
    static icon = "<img src='/images/combat/equipment/fire_orb.png' alt='Alert Tracker Icon'/>";
    static category = "economy";
    css = `
.marketplace-alert-button {
    order: 2;
    color: #fff;
    height: 45px;
    width: 45px;
    background: linear-gradient(180deg,rgba(72,85,99,.8431372549019608),rgba(41,50,60,.6039215686274509));
}

.marketplace-buy-item-top .chakra-input__group {
    order: 3;
}

.alert-sound {
    fill: none;
}

.svg-inactive .alert-sound {
    stroke: none;
}

.alert-popup {
    text-align: center;
    width: 100%;
    position: absolute;
    left: 50%;
    top: 5%;
    transform: translate(-50%, 5%);
    border: 2px solid silver;
    z-index: 9;
    max-width: 600px;
    padding: 50px;
    background-color: rgba(0,0,0,.19);
    align-items: center;
    border-image-source: url(/images/ui/stone-9slice.png);
    border-image-slice: 100 fill;
    border-image-width: 100px;
    border-image-outset: 0;
    border-image-repeat: repeat;
    overflow-x: hidden;
}

.alert-popup-title {
    margin-top: 0;
    font-size: 2rem;
    line-height: 1.2;
}

.alert-popup input[type="number"] {
    color: #fff;
    text-align: center;
}

.alert-popup input[type="number"]:not(.browser-default):focus:not([readonly]) {
    border-bottom: 1px solid var(--tracker-red) !important;
    box-shadow: 0 1px 0 0 var(--tracker-red);
}

.alert-popup input[type="number"]:not(.browser-default):focus:not([readonly]) + label {
    color: var(--tracker-red);
}

.alert-input-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 20px;
    grid-template-areas: "input-below input-above"
                         "label-below label-above";
}

.alert-popup-tip {
    color: gray;
    font-style: oblique;
}

.alert-popup-button-container {
    display: flex;
    justify-content: space-between;
    padding: 10px;
}

.alert-popup-button-container > :not(:first-child) {
    margin-left: 8px;
}

.alert-popup-button {
    height: 40px;
    width: 100%;
    padding: 6px 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-size: 100% 100%;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    cursor: pointer;
}

.alert-popup-button:hover {
    filter: brightness(1.5);
}

.alert-popup-button.clear,
.alert-popup-button.cancel {
    flex: 1 0 0;
}

.alert-popup-button.save {
    flex: 2 0 0;
}
    `;

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.storage = storage;
        if (this.settings.cooldown === undefined) {
            this.settings.cooldownEnd = 0;
            this.settings.cooldown = "00:30";
        }
        if (this.settings.doNotDisturb === undefined) {
            this.settings.doNotDisturb = {
                start: "23:00",
                end: "07:00",
            };
        }
        if (this.settings.manualMuteEnd === undefined) {
            this.settings.manualMuteEnd = 0;
            this.settings.manualMute = "";
        }
        this.storageKey = "TrackerAlerts";
        if (this.settings.allAlerts === undefined) {
            this.settings.allAlerts = {};
        }
        this.allAlerts = this.settings.allAlerts;

        this.cssNode = injectCSS(this.css);

        this.playAreaObserver = new MutationObserver((mutations) => {
            if (getSelectedSkill() === "Marketplace") {
                if (detectInfiniteLoop(mutations)) {
                    return;
                }
                // Buy page
                let buyHeader = document.getElementsByClassName("marketplace-buy-item-top")[0];
                if (buyHeader) {
                    this.createAlertButton(buyHeader.parentNode);
                    return;
                }
            }
        });
    }

    onGameReady() {
        if (Notification.permission === "default") {
            Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                    const notification = new Notification("Notifications allowed", {
                        body: "Thanks for using our extension!",
                        icon: "https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/images/logo.svg",
                    });
                } else {
                    console.log("Notifications not allowed");
                    Templates.notificationTemplate(
                        "warning",
                        "Notifications not allowed",
                        "You can change this in your browser settings. Meanwhile we will stick to these ingame notifications."
                    );
                }
            });
        }

        const playAreaContainer = getPlayAreaContainer();
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true,
        });
    }

    deactivate() {
        this.playAreaObserver.disconnect();
        this.cssNode.remove();
    }

    settingsMenuContent() {
        const note = `
            <div class="tracker-module-setting-description">
                Works best if you also have Market Highlights enabled.
            </div>`;

        const cooldown = document.createElement("div");
        cooldown.classList.add("tracker-module-setting");
        cooldown.insertAdjacentHTML(
            "beforeend",
            `
            <div class="tracker-module-setting-name">
                Cooldown between notifications
            </div>`
        );
        cooldown.append(Templates.timeDurationTemplate(AlertTracker.id + "-cooldown", this.settings.cooldown));

        const doNotDisturb = `
            <div class="tracker-module-setting">
                <div class="tracker-module-setting-name">
                    Do not disturb between
                </div>
                ${Templates.timeRangeTemplate(
                    AlertTracker.id + "-doNotDisturb",
                    this.settings.doNotDisturb.start,
                    this.settings.doNotDisturb.end
                )}
            </div>`;

        const manualMute = document.createElement("div");
        manualMute.classList.add("tracker-module-setting");
        manualMute.insertAdjacentHTML(
            "beforeend",
            `
            <div class="tracker-module-setting-name">
                Manually mute notifications for
            </div>`
        );
        const remainingMute = this.settings.manualMuteEnd - Date.now();
        this.settings.manualMute = remainingMute > 0 ? millisecondsToDuration(remainingMute) : "";
        manualMute.append(Templates.timeDurationTemplate(AlertTracker.id + "-manualMute", this.settings.manualMute));
        return [note, cooldown, doNotDisturb, manualMute];
    }

    settingChanged(settingId, value) {
        if (settingId === "manualMute") {
            this.settings.manualMuteEnd = Date.now() + durationToMilliseconds(value);
            this.tracker.storeSettings();
        }
    }

    onAPIUpdate() {
        if (this.collectNotificationData()) {
            this.createNotification();
        }
        this.tracker.notifyModule(MarketHighlights.id, "alerts", this.notificationInformation);
    }

    collectNotificationData() {
        const prices = this.storage.latestPrices();
        this.notificationInformation = {};
        let notificationNeeded = false;
        for (let apiId in this.allAlerts) {
            if (this.allAlerts[apiId].below && prices[apiId] <= this.allAlerts[apiId].below) {
                this.notificationInformation[apiId] = "below";
                notificationNeeded = true;
            } else if (this.allAlerts[apiId].above && prices[apiId] >= this.allAlerts[apiId].above) {
                this.notificationInformation[apiId] = "above";
                notificationNeeded = true;
            }
        }
        return notificationNeeded;
    }

    createNotification(permission = Notification.permission) {
        if (!this.muted()) {
            const items = Object.keys(this.notificationInformation)
                .map((itemId) => {
                    return this.storage.getItemName(itemId);
                })
                .join(", ");
            if (permission === "granted" && !document.hasFocus()) {
                // notifications allowed and tab is not visible
                new Notification(`Idlescape Marketplace (${getCharacterName()})`, {
                    body: "Interesting items for you: " + items,
                    icon: "https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/images/logo.svg",
                });
            } else {
                Templates.notificationTemplate("warning", "Interesting items for you", items);
            }
            // set cooldown, reduce by 30 seconds to account for possible delay
            this.settings.cooldownEnd = Date.now() + durationToMilliseconds(this.settings.cooldown) - 30 * 1000;
        }
    }

    muted() {
        const now = new Date();
        if (this.settings.manualMuteEnd > now) {
            return true;
        }
        if (this.settings.cooldownEnd > now) {
            return true;
        }
        if (this.settings.doNotDisturb.end === this.settings.doNotDisturb.start) {
            return false;
        }
        if (this.settings.doNotDisturb.start === "" || this.settings.doNotDisturb.end === "") {
            return false;
        }
        const nowTimeString = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        if (this.settings.doNotDisturb.start <= this.settings.doNotDisturb.end) {
            if (nowTimeString > this.settings.doNotDisturb.start && nowTimeString < this.settings.doNotDisturb.end) {
                return true;
            }
        } else {
            if (this.settings.doNotDisturb.start <= nowTimeString || nowTimeString < this.settings.doNotDisturb.end) {
                return true;
            }
        }
        return false;
    }

    createAlertButton(buyContainer) {
        if (document.getElementById("marketplace-alert-button")) {
            return;
        }
        const marketplaceTableHeader = document.getElementsByClassName("anchor-market-tables-header")[0];
        if (!marketplaceTableHeader) {
            return;
        }
        const apiId = convertApiId(marketplaceTableHeader.childNodes[1]);
        const refreshButton = document.getElementsByClassName("marketplace-refresh-button")[0];
        saveInsertAdjacentHTML(
            refreshButton,
            "afterend",
            `
            <button id="marketplace-alert-button" class="marketplace-alert-button ${
                this.hasActiveAlert(apiId) ? "" : "svg-inactive"
            }" style="stroke: #ccffff; fill: #ccffff;" >
                ${Templates.alertTemplate()}
            </button>`
        );
        const alertButton = document.getElementById("marketplace-alert-button");
        alertButton.addEventListener("click", () => {
            this.openPopUp(apiId);
        });
    }

    openPopUp(apiId) {
        saveInsertAdjacentHTML(
            document.body,
            "beforeend",
            Templates.popupTemplate(`
            <div class="alert-popup">
                <div class="alert-popup-title">Notification thresholds</div>
                <div class="alert-input-container">
                    <input id="price-below" style="grid-area: input-below; width: 100%;" placeholder="Leave empty for no notification" name="price-below">
                    <label for="price-below" style="grid-area: label-below;">
                        <strong>Lower threshold</strong>
                    </label>
                    <input id="price-above" style="grid-area: input-above; width: 100%;" placeholder="Leave empty for no notification" name="price-above">
                    <label for="price-above" style="grid-area: label-above;">
                        <strong>Upper threshold</strong>
                    </label>
                </div>
                <div class="alert-popup-tip">
                    Inputs support k, m, b. Examples: 1k, 1.5m, 2.3b
                </div>
                <div class="alert-popup-button-container">
                    <div class="alert-popup-button cancel idlescape-button-gray">Close</div>
                    <div class="alert-popup-button clear idlescape-button-red">Clear</div>
                    <div class="alert-popup-button save idlescape-button-green">Save</div>
                </div>
            </div>`)
        );
        const alertPopup = document.getElementsByClassName("alert-popup")[0];
        const priceBelowInput = document.getElementById("price-below");
        const priceAboveInput = document.getElementById("price-above");
        if (!this.hasActiveAlert(apiId)) {
            priceBelowInput.value = "";
            priceAboveInput.value = "";
        } else {
            priceBelowInput.value = this.allAlerts[apiId].below || "";
            priceAboveInput.value = this.allAlerts[apiId].above || "";
        }

        document.getElementsByClassName("save")[0].addEventListener("click", () => {
            this.save(apiId, priceStringToNumber(priceBelowInput.value), priceStringToNumber(priceAboveInput.value));
        });
        document.getElementsByClassName("clear")[0].addEventListener("click", () => {
            this.save(apiId, 0, 0);
        });
        document.getElementsByClassName("cancel")[0].addEventListener("click", () => {
            this.tracker.closePopup();
        });
        document.getElementsByClassName("tracker-popup-background")[0].addEventListener("click", (event) => {
            if (event.target === event.currentTarget) {
                this.tracker.closePopup();
            }
        });
        alertPopup.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                this.save(
                    apiId,
                    priceStringToNumber(priceBelowInput.value),
                    priceStringToNumber(priceAboveInput.value)
                );
            }
        });
    }

    save(apiId, priceBelow, priceAbove) {
        if (priceBelow === 0 && priceAbove === 0) {
            delete this.allAlerts[apiId];
        } else {
            this.allAlerts[apiId] = {};
            if (priceBelow !== 0 && priceBelow !== "") {
                this.allAlerts[apiId].below = parseInt(priceBelow);
            }
            if (priceAbove !== 0 && priceAbove !== "") {
                this.allAlerts[apiId].above = parseInt(priceAbove);
            }
        }
        const alertButton = document.getElementById("marketplace-alert-button");
        alertButton.classList.toggle("svg-inactive", !this.hasActiveAlert(apiId));
        this.tracker.storeSettings();
        this.tracker.closePopup();
    }

    hasActiveAlert(apiId) {
        return apiId in this.allAlerts;
    }
}
