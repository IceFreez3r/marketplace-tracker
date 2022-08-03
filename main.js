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
