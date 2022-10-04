// ==UserScript==
// @name         Idlescape Marketplace Tracker
// @namespace    https://github.com/IceFreez3r
// @version      1.0.4
// @description  Automatically tracks prices of items on the Idlescape Marketplace
// @author       IceFreez3r
// @match        *://*.idlescape.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=idlescape.com
// @updateURL    https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/marketplace_tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/marketplace_tracker.user.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/modules/crafting.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/modules/enchanting.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/modules/farming.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/modules/favorite.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/modules/marketplace.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/modules/offline.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/modules/smithing.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/storage.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/utility.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/external/DOMpurify.min.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/tracker.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let tracker = new Tracker();
    tracker.addModule(MarketplaceTracker);
    tracker.addModule(FavoriteTracker);
    tracker.addModule(OfflineTracker);
    tracker.addModule(EnchantingTracker);
    tracker.addModule(SmithingTracker);
    tracker.addModule(CraftingTracker);
    tracker.addModule(FarmingTracker);

})();
