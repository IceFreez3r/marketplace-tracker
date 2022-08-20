window.addEventListener('beforeunload', function () {
    storageRequest({
        type: 'close'
    });
});

let tracker = new Tracker();
tracker.addExtension(MarketplaceTracker);
tracker.addExtension(FavoriteTracker);
tracker.addExtension(OfflineTracker);
tracker.addExtension(EnchantingTracker);
tracker.addExtension(SmithingTracker);
tracker.addExtension(CraftingTracker);
tracker.addExtension(FarmingTracker);
