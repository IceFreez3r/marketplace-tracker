window.addEventListener('beforeunload', function () {
    storageRequest({
        type: 'close'
    });
});

let tick = setInterval(() => {
    offlineTracker();
    let selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab');
    if (selectedSkill.length > 0) {
        switch (selectedSkill[0].innerText) {
            case 'Crafting':
                getCraftingRecipe();
                break;
            case 'Enchanting':
                enchantingTracker();
                break;
            case 'Farming':
                farmingTracker();
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
