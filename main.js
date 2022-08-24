window.addEventListener('beforeunload', function () {
    storageRequest({
        type: 'close'
    });
});

let tracker = new Tracker();
tracker.addModule(MarketplaceTracker);
tracker.addModule(FavoriteTracker);
tracker.addModule(OfflineTracker);
tracker.addModule(EnchantingTracker);
tracker.addModule(SmithingTracker);
tracker.addModule(CraftingTracker);
tracker.addModule(FarmingTracker);
