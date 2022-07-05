window.addEventListener('beforeunload', function () {
    storageRequest({
        type: 'close'
    });
});

let tick = setInterval(() => {
    let selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab');
    if (selectedSkill.length > 0) {
        switch (selectedSkill[0].innerText) {
            case 'Crafting':
                getCraftingRecipe();
                break;
            case 'Enchanting':
                enchantingTracker();
                break;
            case 'Marketplace':
                scanMarketplaceLists();
                scanOfferList();
                break;
            case 'Smithing':
                smithingTracker();
                break;
        }
    }
}, 1000);

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
    extensions.push(new OfflineTracker());
    extensions.push(new FarmingTracker());
});
