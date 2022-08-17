window.addEventListener('beforeunload', function () {
    storageRequest({
        type: 'close'
    });
});

let tracker = new Tracker();
tracker.addExtension(CraftingTracker);
tracker.addExtension(EnchantingTracker);
tracker.addExtension(FarmingTracker);
tracker.addExtension(FavoriteTracker);
tracker.addExtension(MarketplaceTracker);
tracker.addExtension(OfflineTracker);
tracker.addExtension(SmithingTracker);
