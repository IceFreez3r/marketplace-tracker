class AlertTracker {
    static id = "alert_tracker"
    static displayName = "Alert Tracker";
    static icon = "<img src='/images/combat/equipment/fire_orb.png' alt='Alert Tracker Icon'/>";
    static category = "economy";
    css = `
.alert-item-container {
    display: flex;
    flex-direction: column;
}
.marketplace-alert-button {
    order: 1;
}
.sound {
    fill: none;
}
.svg-inactive > .sound {
  stroke: none;
}

.loginPopup {
    position: relative;
    text-align: center;
    width: 100%;
}
.formPopup {
    display: none;
    position: fixed;
    left: 45%;
    top: 5%;
    transform: translate(-50%, 5%);
    border: 2px solid silver;
    z-index: 9;
    max-width: 600px;
    padding: 50px !important;
    color: #fff;
    background-color: rgba(0,0,0,.19);
    align-items: center;
    border-image-source: url(/images/ui/stone-9slice.png) !important;
    border-image-slice: 100 fill !important;
    border-image-width: 100px !important;
    border-image-outset: 0 !important;
    border-image-repeat: repeat !important;
    overflow-x: hidden;
}
.formContainer{
    width: 100%;
    padding: 15px;
    margin: 5px 0 20px 0;
    border: none;
    background: #eee;
}
.formContainer:focus {
    background-color: var(--tracker-red);
    outline: none;
}
.btn {
    padding: 12px 20px;
    border: none;
    background-color: #8ebf42;
    color: #fff;
    cursor: pointer;
    width: 100%;
    margin-bottom: 15px;
    opacity: 0.8;
}
.btn:hover {
    opacity: 1;
}
.cancel {
    background-color: #cc0000;
}
.delete {
    background-color: #ffffff;
}
.save {
    background-color: #dddddd;
}
    `;



    constructor(tracker, settings) {
        this.tracker = tracker;
        this.settings = settings;
        this.TrackerAlertPricesTrackerTracker = 'TrackerAlertPricesTrackerTracker';
        this.allAlerts = loadLocalStorage(this.TrackerAlertPricesTrackerTracker, []);
        
        //settings kaudawelsch

        this.cssNode = injectCSS(this.css);

        this.playAreaObserver = new MutationObserver(mutations => {
            if (detectInfiniteLoop(mutations)) {
                return;
            }
            if (getSelectedSkill() === "Marketplace") {
                //this.marketplaceTracker();

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
        //hier iwie sowas wie nen alert maybe
        let promise = Notification.requestPermission();
        promise.then(() => {
            let notification = new Notification("Test", {
                body: "Thanks for using our extension!",
                icon: "https://idlescape.com/images/combat/equipment/fire_orb.png"
                // https://github.com/IceFreez3r/marketplace-tracker/tree/main/images/tracker.png   // may be svg
            });
        });

        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true,
        });
        console.log("below are all the loaded (or not loaded) TrackerAlertTrackTracker values");
        console.log(this.allAlerts);
        this.onAPIUpdate();
    }

    deactivate() {
        //remove all html nodes and disconnect mutations
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
        let notificationInformation = this.collectNotificationData();
        this.createNotifications(notificationInformation);
    }

    collectNotificationData(){
        const prices = storageRequest({type: "latest-prices"});
        let notificationInformation = {};
        for (let item in this.allAlerts) {
            if((prices[item] < this.allAlerts[item].priceBelow) && (prices[item] > this.allAlerts[item].priceAbove)){
                //collect information for both for final notification
                notificationInformation[item] = {
                    type: "both",
                    price: prices[item],
                }
            }
            else if(prices[item] < this.allAlerts[item].priceBelow){
                //collect information for priceBelow for final notification
                notificationInformation[item] = {
                    type: "below",
                    price: prices[item],
                }
            }
            else if(prices[item] > this.allAlerts[item].priceAbove){
                //collect information for priceAbove for final notification
                notificationInformation[item] = {
                    type: "above",
                    price: prices[item],
                }
            }
        }
        return notificationInformation;
    }

    createNotifications(notificationInformation){
         //i don't know how to check for this stupid shit (notificationInformation.length or notificationInformation!= {} won't work)
        if (false) {
            return;
        }
        //clickable basenotification
        let baseNotification = Notification.requestPermission();
        baseNotification.then(() => {
            let notification = new Notification("Basenotification", {
                body: "Some items on the marketplace should be interesting to you!",
                icon: "https://idlescape.com/images/combat/equipment/fire_orb.png"
                // https://github.com/IceFreez3r/marketplace-tracker/tree/main/images/tracker.png   // may be svg
            });
        });
        //clickable basenotification
        let informativeNotification = Notification.requestPermission();
        informativeNotification.then(() => {
            let notification = new Notification("InformativeNotification", {
                //name of item, price <- marked green for cheap, red for expensive (cheap=below, expensiv= above, none if both)
                body: JSON.stringify(notificationInformation),
                icon: "https://idlescape.com/images/combat/equipment/fire_orb.png"
                // https://github.com/IceFreez3r/marketplace-tracker/tree/main/images/tracker.png   // may be svg
            });
        });
    }

    createAlertButton(buyContainer) {
        if (document.getElementById("marketplace-alert-button")) {
            return;
        }
        let offer = buyContainer.getElementsByTagName('tbody')[0].getElementsByTagName('tr')[0];
        if (!offer) { // not loaded yet
            return;
        }
        const itemId = convertItemId(offer.childNodes[1].firstChild.src);
        //TODO: icon like favorite button active/inactive
        //const isAlert = this.isAlert(itemId);
        const refreshButton = document.getElementById("marketplace-refresh-button");
        saveInsertAdjacentHTML(refreshButton, 'afterend', `
            <button id="marketplace-alert-button" class="marketplace-alert-button"> 
            ${Templates.alertTemplate()}
            <span>not</span>
            Alert
        </button>`);
        let AlertButton = document.getElementById("marketplace-alert-button");
        AlertButton.addEventListener('click', () => {
            this.openPopUp(itemId);
            /*this.toggleFavorite(itemId);
            toggleFavoriteButton.classList.toggle('svg-inactive');
            this.saveData();*/
        });

        this.createPopUp(itemId);
    }

    openPopUp(itemId) {
        document.getElementById("popupForm").style.display = "block";
    }

    closePopUp() {
        document.getElementById("popupForm").style.display = "none";
    }

    save(itemId, priceBelow, priceAbove) {
        //fang die kack alphabetical values ab! >:c --- die sind null wikked     
        if ((priceBelow == 0 || priceBelow == "") && 
            (priceAbove == 0 || priceAbove == "")){
            //delete item from allAlerts
            delete this.allAlerts[itemId];
        } else {
            this.allAlerts[itemId] = {
                priceBelow: priceBelow,
                priceAbove: priceAbove,
            };
        }
        localStorage.setItem(this.TrackerAlertPricesTrackerTracker, JSON.stringify(this.allAlerts));
        console.log(loadLocalStorage(this.TrackerAlertPricesTrackerTracker, []));
        this.closePopUp();
    }

    createPopUp(itemId) {
        const marketPlaceTable = document.getElementsByClassName("marketplace-table");
        saveInsertAdjacentHTML(marketPlaceTable[0], 'afterbegin', `
        <div class="loginPopup">
            <div class="formPopup" id="popupForm">
                <h2>Choose your poison! >:) </h2>
                
                <label for="price_below">
                    <strong>Price below</strong>
                </label>
                <input type="number" inputmode="numeric" id="price_below" placeholder="666" name="price_below" min="0" max="100000000000">
                <label for="price_above">
                    <strong>Price above</strong>
                </label>
                <input type="number" inputmode="numeric" id="price_above" placeholder="666" name="price_above" min="0" max="100000000000">
                
                <button type="button" class="btn save" onclick="save()">Save</button>
                <button type="button" class="btn cancel" onclick="closePopUp()">Close</button>
                <button type="button" class="btn delete" onclick="delete()">Delete</button>
            </div>
        </div>
        `);
        const saveButton = document.getElementsByClassName("save")[0];
        const cancelButton = document.getElementsByClassName("cancel")[0];
        const deleteButton = document.getElementsByClassName("delete")[0];

        saveButton.addEventListener('click', () => {
            const priceBelow = document.getElementById("price_below").value;
            const priceAbove = document.getElementById("price_above").value;

            this.save(itemId, priceBelow, priceAbove);
        });
        cancelButton.addEventListener('click', () => {
            this.closePopUp();
        });
        deleteButton.addEventListener('click', () => {
            this.save(itemId, 0, 0);
        });
    }
}