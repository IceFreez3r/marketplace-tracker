class AlertTracker {
    static id = "alert_tracker"
    static displayName = "Alert Tracker";
    static icon = "<img src='/images/combat/equipment/fire_orb.png' alt='Alert Tracker Icon'/>";
    static category = "economy";
    css = `
.marketplace-alert-button {
    order: 1; /* always at the end */
    margin-top: 8px;
    color: #fff;
    height: 45px;
    width: 45px;
    background: linear-gradient(180deg,rgba(72,85,99,.8431372549019608),rgba(41,50,60,.6039215686274509));
}

.sound {
    fill: none;
}

.svg-inactive .sound {
    stroke: none;
}

.alertPopup {
    text-align: center;
    width: 100%;
    display: none;
    position: absolute;
    left: 50%;
    top: 5%;
    transform: translate(-50%, 5%);
    border: 2px solid silver;
    z-index: 9;
    max-width: 600px;
    padding: 50px !important;
    background-color: rgba(0,0,0,.19);
    align-items: center;
    border-image-source: url(/images/ui/stone-9slice.png) !important;
    border-image-slice: 100 fill !important;
    border-image-width: 100px !important;
    border-image-outset: 0 !important;
    border-image-repeat: repeat !important;
    overflow-x: hidden;
}

.alertPopupTitle {
    margin-top: 0;
    font-size: 2rem;
    line-height: 1.2;
}

.alertPopup input[type="number"] {
    color: #fff;
    text-align: center;
}

.alertPopup input[type="number"]:not(.browser-default):focus:not([readonly]) {
    border-bottom: 1px solid var(--tracker-red);
    box-shadow: 0 1px 0 0 var(--tracker-red);
}

.alertPopup input[type="number"]:not(.browser-default):focus:not([readonly]) + label {
    color: var(--tracker-red);
}

.alertInputContainer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 20px;
    grid-template-areas: "inputBelow inputAbove"
                         "labelBelow labelAbove"
}

.alertButtonContainer {
    display: flex;
    justify-content: space-between;
    padding: 10px;
}

.alertButton {
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

.alertButton:hover {
  filter: brightness(1.5);
}
    `;



    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        this.storageKey = 'TrackerAlerts';
        this.allAlerts = loadLocalStorage(this.storageKey, {});

        this.cssNode = injectCSS(this.css);

        this.playAreaObserver = new MutationObserver(mutations => {
            if (detectInfiniteLoop(mutations)) {
                return;
            }
            if (getSelectedSkill() === "Marketplace") {
                // Buy page
                let buyHeader = document.getElementsByClassName('marketplace-buy-item-top')[0];
                if (buyHeader) {
                    this.createAlertButton(buyHeader.parentNode);
                    return;
                }

            }
        });
    }

    onGameReady() {
        if (Notification.permission !== "denied") {
            Notification.requestPermission()
                .then((permission) => {
                    if (permission === "granted") {
                        const notification = new Notification("Notifications allowed", {
                            body: "Thanks for using our extension!",
                            icon: "https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/notifications/images/logo.svg",
                            // icon: "https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/images/logo.svg",
                        });
                    }
                });
        }

        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true,
        });
        this.onAPIUpdate();
    }

    deactivate() {
        this.playAreaObserver.disconnect();
        this.cssNode.remove();
    }

    settingsMenuContent() {
        //time between notifications
        //mute notifications till time, between time
        //button -> pop-up that contains all timeframes with mute active -> clearable
        return "";
    }

    settingChanged(settingId, value) {
        return;
    }

    onAPIUpdate() {
        if (this.collectNotificationData()) {
            this.createNotification();
        }
    }

    collectNotificationData() {
        const prices = storageRequest({type: "latest-prices"});
        this.notificationInformation = {};
        let notificationNeeded = false;
        for (let itemId in this.allAlerts) {
            if (prices[itemId] < this.allAlerts[itemId].priceBelow) {
                this.notificationInformation[itemId] = "below";
                notificationNeeded = true;
            } else if (prices[itemId] > this.allAlerts[itemId].priceAbove) {
                this.notificationInformation[itemId] = "above";
                notificationNeeded = true;
            }
        }
        return notificationNeeded;
    }

    createNotification(permission = Notification.permission) {
        if (permission === "granted") {
            const notification = new Notification("Idlescape Marketplace", {
                body: "Some items should be interesting to you!",
                icon: "https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/notifications/images/logo.svg",
                // icon: "https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/images/logo.svg",
                
            });
        } else {
            console.log("Notification permission denied");
            // TODO: After rewrite add ingame notification here
            // Also by default if tab is visible
        }
    }

    createAlertButton(buyContainer) {
        if (document.getElementById("marketplace-alert-button")) {
            return;
        }
        const offer = buyContainer.getElementsByTagName('tbody')[0].getElementsByTagName('tr')[0];
        if (!offer) { // not loaded yet
            return;
        }
        const itemId = convertItemId(offer.childNodes[1].firstChild.src);
        const refreshButton = document.getElementById("marketplace-refresh-button");
        saveInsertAdjacentHTML(refreshButton, 'afterend', `
        <button id="marketplace-alert-button" class="marketplace-alert-button ${this.hasActiveAlert(itemId) ? "" : "svg-inactive"}" style="stroke: #ccffff; fill: #ccffff;" > 
            ${Templates.alertTemplate()}
        </button>`);
        const alertButton = document.getElementById("marketplace-alert-button");
        alertButton.addEventListener('click', () => {
            this.openPopUp();
        });
        this.createPopUp(itemId);
    }

    openPopUp() {
        document.getElementById("alertPopup").style.display = "block";
    }

    closePopUp() {
        document.getElementById("alertPopup").style.display = "none";
    }

    save(itemId, priceBelow, priceAbove) {   
        if ((priceBelow == 0 || priceBelow == "") && (priceAbove == 0 || priceAbove == "")) {
            delete this.allAlerts[itemId];
        } else {
            this.allAlerts[itemId] = {
                below: priceBelow,
                above: priceAbove,
            };
        }
        const alertButton = document.getElementById("marketplace-alert-button");
        alertButton.classList.toggle("svg-inactive", !this.hasActiveAlert(itemId));
        localStorage.setItem(this.storageKey, JSON.stringify(this.allAlerts));
        this.closePopUp();
    }

    createPopUp(itemId) {
        const marketPlaceTable = document.getElementsByClassName("marketplace-table")[0];
        saveInsertAdjacentHTML(marketPlaceTable, 'afterbegin', `
            <div id="alertPopup" class="alertPopup">
                <div class="alertPopupTitle">Notification thresholds</div>
                <div class="alertInputContainer">
                    <input id="price_below" style="grid-area: inputBelow;" type="number" inputmode="numeric" placeholder="Leave empty for no notification" name="price_below" min="0" max="100_000_000_000">
                    <label for="price_below" style="grid-area: labelBelow;">
                        <strong>Lower threshold</strong>
                    </label>
                    <input id="price_above" style="grid-area: inputAbove;" type="number" inputmode="numeric" placeholder="Leave empty for no notification" name="price_above" min="0" max="100_000_000_000">
                    <label for="price_above" style="grid-area: labelAbove;">
                        <strong>Upper threshold</strong>
                    </label>
                </div>
                <div class="alertButtonContainer">
                    <div class="alertButton cancel idlescape-button-gray">Close</div>
                    <div class="alertButton clear idlescape-button-red">Clear</div>
                    <div class="alertButton save idlescape-button-green">Save</div>
                </div>
            </div>`);
        const priceBelowInput = document.getElementById("price_below");
        const priceAboveInput = document.getElementById("price_above");
        this.fillPopUp(itemId, priceBelowInput, priceAboveInput);
        
        marketPlaceTable.getElementsByClassName("save")[0].addEventListener('click', () => {
            const priceBelow = priceBelowInput.value;
            const priceAbove = priceAboveInput.value;
            this.save(itemId, priceBelow, priceAbove);
        });
        marketPlaceTable.getElementsByClassName("cancel")[0].addEventListener('click', () => {
            this.closePopUp();
        });
        marketPlaceTable.getElementsByClassName("clear")[0].addEventListener('click', () => {
            this.save(itemId, "", "");
            this.fillPopUp(itemId, priceBelowInput, priceAboveInput);
        });
    }

    fillPopUp(itemId, priceBelowInput, priceAboveInput) {
        if (!this.hasActiveAlert(itemId)) {
            priceBelowInput.value = "";
            priceAboveInput.value = "";
        } else {
            priceBelowInput.value = this.allAlerts[itemId].below;
            priceAboveInput.value = this.allAlerts[itemId].above;
        }
    }

    hasActiveAlert(itemId) {
        return itemId in this.allAlerts;
    }
}
