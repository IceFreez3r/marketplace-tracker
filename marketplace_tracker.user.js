// ==UserScript==
// @name         Idlescape Marketplace Tracker
// @namespace    https://github.com/IceFreez3r
// @version      1.0.2
// @description  Automatically tracks prices of items on the Idlescape Marketplace
// @author       IceFreez3r
// @match        *://*.idlescape.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=idlescape.com
// @updateURL    https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/marketplace_tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/marketplace_tracker.user.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/crafting_tracker.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/enchanting_tracker.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/farming_tracker.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/favorite_tracker.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/marketplace_tracker.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/offline_tracker.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/smithing_tracker.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/storage.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/utility.js
// @require      https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/external/DOMpurify.min.js
// @resource     CRAFTING_INFO https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/css/crafting_info.css
// @resource     ENCHANTING_INFO https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/css/enchanting_info.css
// @resource     FARMING_INFO https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/css/farming_info.css
// @resource     FAVORITE_INFO https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/css/favorite_info.css
// @resource     MARKETPLACE_INFO https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/css/marketplace_info.css
// @resource     OFFLINE_INFO https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/css/offline_info.css
// @resource     SMITHING_INFO https://raw.githubusercontent.com/IceFreez3r/marketplace-tracker/main/css/smithing_info.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

// Comment out the modules that you don't want to use. Both the css and the corresponding class in the extension array below.

    let my_css = "";
    my_css += GM_getResourceText("CRAFTING_INFO");
    my_css += GM_getResourceText("ENCHANTING_INFO");
    my_css += GM_getResourceText("FARMING_INFO");
    my_css += GM_getResourceText("FAVORITE_INFO");
    my_css += GM_getResourceText("MARKETPLACE_INFO");
    my_css += GM_getResourceText("OFFLINE_INFO");
    my_css += GM_getResourceText("SMITHING_INFO");
    GM_addStyle(my_css);

    window.addEventListener('beforeunload', function () {
        storageRequest({
            type: 'close'
        });
    });


    function onGameReady(callback) {
        const gameContainer = document.getElementsByClassName("play-area-container")[0];
        if (!gameContainer) {
            setTimeout(function () {
                onGameReady(callback);
            }, 250);
        } else {
            callback();
        }
    }

    let extensions = [];
    onGameReady(() => {
        extensions.push(new CraftingTracker());
        extensions.push(new EnchantingTracker());
        extensions.push(new FarmingTracker());
        extensions.push(new FavoriteTracker());
        extensions.push(new MarketplaceTracker());
        extensions.push(new OfflineTracker());
        extensions.push(new SmithingTracker());
    });

})();
