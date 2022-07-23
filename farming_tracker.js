class FarmingTracker {

    seeds = {
        "mysterious-seed-1x1": {img: "/images/farming/mysterious_seed.png",     minLevel: 1 },
        "mysterious-seed-2x1": {img: "/images/farming/mysterious_seed.png",     minLevel: 1 },
        "mysterious-seed-3x1": {img: "/images/farming/mysterious_seed.png",     minLevel: 20},
        "mysterious-seed-4x1": {img: "/images/farming/mysterious_seed.png",     minLevel: 40},
        "mysterious-seed-1x2": {img: "/images/farming/mysterious_seed.png",     minLevel: 10},
        "mysterious-seed-2x2": {img: "/images/farming/mysterious_seed.png",     minLevel: 10},
        "mysterious-seed-3x2": {img: "/images/farming/mysterious_seed.png",     minLevel: 20},
        "mysterious-seed-4x2": {img: "/images/farming/mysterious_seed.png",     minLevel: 40},
        "mysterious-seed-1x3": {img: "/images/farming/mysterious_seed.png",     minLevel: 30},
        "mysterious-seed-2x3": {img: "/images/farming/mysterious_seed.png",     minLevel: 30},
        "mysterious-seed-3x3": {img: "/images/farming/mysterious_seed.png",     minLevel: 30},
        "mysterious-seed-4x3": {img: "/images/farming/mysterious_seed.png",     minLevel: 40},
        "mysterious-seed-1x4": {img: "/images/farming/mysterious_seed.png",     minLevel: 50},
        "mysterious-seed-2x4": {img: "/images/farming/mysterious_seed.png",     minLevel: 50},
        "mysterious-seed-3x4": {img: "/images/farming/mysterious_seed.png",     minLevel: 50},
        "mysterious-seed-4x4": {img: "/images/farming/mysterious_seed.png",     minLevel: 50},
        "carrot-seed":         {img: "/images/farming/carrot_seed.png",         minLevel: 1 },
        "potato-seed":         {img: "/images/farming/potato_seed.png",         minLevel: 3 },
        "wheat-seed":          {img: "/images/farming/wheat_seed.png",          minLevel: 8 },
        "tomato-seed":         {img: "/images/farming/tomato_seed.png",         minLevel: 12},
        "mushroom-spore":      {img: "/images/farming/mushroom_spore.png",      minLevel: 15},
        "sugarcane-seed":      {img: "/images/farming/sugarcane_seed.png",      minLevel: 20},
        "chili-pepper-seed":   {img: "/images/farming/chili_pepper_seed.png",   minLevel: 20},
        "rice-seed":           {img: "/images/farming/rice_seed.png",           minLevel: 25},
        "pumpkin-seed":        {img: "/images/farming/pumpkin_seed.png",        minLevel: 25},
        "peppercorn-seed":     {img: "/images/farming/peppercorn_seed.png",     minLevel: 30},
        "wildberry-bush-seed": {img: "/images/farming/wildberry_bush_seed.png", minLevel: 5 },
        "sageberry-bush-seed": {img: "/images/farming/sageberry_seed.png",      minLevel: 25},
        "tree-seed":           {img: "/images/farming/tree_seed.png",           minLevel: 10},
        "oak-tree-seed":       {img: "/images/farming/oak_tree_seed.png",       minLevel: 17},
        "willow-tree-seed":    {img: "/images/farming/willow_tree_seed.png",    minLevel: 20},
        "banana-tree-seed":    {img: "/images/farming/banana_tree_seed.png",    minLevel: 20},
        "apple-tree-seed":     {img: "/images/farming/apple_tree_seed.png",     minLevel: 20},
        "maple-tree-seed":     {img: "/images/farming/maple_tree_seed.png",     minLevel: 25},
        "yew-tree-seed":       {img: "/images/farming/yew_tree_seed.png",       minLevel: 35},
        "elder-tree-seed":     {img: "/images/farming/elder_tree_seed.png",     minLevel: 50},
    }
    numGridElements = 42; // seeds (36) + headers (3) + borders (3)

    constructor() {
        // setup mutation observer
        this.observer = new MutationObserver(mutations => {
            const selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab')[0];
            if (!selectedSkill) {
                return;
            }
            if (selectedSkill.innerText !== 'Farming') {
                return;
            }
            this.farmingTracker();
        });
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.observer.observe(playAreaContainer, {
            childList: true,
            subtree: true
        });
    }

    farmingTracker() {
        let seedContainer = document.getElementsByClassName("all-items")[0];
        if (seedContainer.childElementCount === this.numGridElements) {
            return;
        }
        // remove old headers, borders, fake-items
        let titles = seedContainer.parentNode.getElementsByClassName("farming-seeds-title");
        for (let i = titles.length; i > 0; i--) {
            titles[i - 1].remove();
        }
        let borders = seedContainer.parentNode.getElementsByClassName("farming-seeds-title-border");
        for (let i = borders.length; i > 0; i--) {
            borders[i - 1].remove();
        }
        let fakeItems = seedContainer.getElementsByClassName("fake-item");
        for (let i = fakeItems.length; i > 0; i--) {
            fakeItems[i - 1].remove();
        }

        const farmingLevel = this.getFarmingLevel();
        let existingSeeds = {};
        for (let seedName in this.seeds) {
            existingSeeds[seedName] = false;
        }
        // process existing seeds
        let seedList = seedContainer.getElementsByClassName("item");
        for (let i = 0; i < seedList.length; i++) {
            let seed = seedList[i];
            let seedName = seed.getAttribute("data-for")
                .replace("farming-seeds", "")
                .replace(/[0-9]/g, "")
                .replaceAll(" ", "-")
                .toLowerCase();
            if (seedName === "mysterious-seed") {
                // Add mysterious seed size to name
                seedName += "-" + seed.getElementsByClassName("item-augment")[0].innerText;
            }
            existingSeeds[seedName] = true;
            seed.parentNode.style.gridArea = seedName;
            if (this.seeds[seedName].minLevel > farmingLevel) {
                seed.classList.add("high-level-seed");
            }
        }
        // Add boxes with faded image for missing seeds
        for (let seedName in this.seeds) {
            if (!existingSeeds[seedName]) {
                let seed = `
                    <div class="fake-item" style="grid-area: ${seedName}">
                        <img src="${this.seeds[seedName].img}" alt="${seedName}">
                    </div>
                    `;
                seedContainer.insertAdjacentHTML("beforeend", seed); // no need for saveInsert here, since no user input is involved
            }
        }
        // Add new headers for the seed types
        seedContainer.insertAdjacentHTML("beforeend", `
            <h5 class="farming-seeds-title seed-header-mysterious">Mysterious seeds</h5>
            <div class="farming-seeds-title-border seed-header-mysterious-border"></div>
            <h5 class="farming-seeds-title seed-header-single">Single slot seeds</h5>
            <div class="farming-seeds-title-border seed-header-single-border"></div>
            <h5 class="farming-seeds-title seed-header-multi">Multi slot seeds</h5>
            <div class="farming-seeds-title-border seed-header-multi-border"></div>
            `);
    }

    getFarmingLevel() {
        const sidebarFarming = document.getElementById('farmingHeaderundefined');
        if (sidebarFarming.parentNode.getElementsByClassName("mastery-bar")[0]) {
            return 99;
        }
        return parseInt(sidebarFarming.previousElementSibling.innerText);
    }

    getEffectiveFarmingLevel() {
        const sidebarFarming = document.getElementById('farmingHeaderundefined').getElementsByTagName("span")[1].innerHTML;
        return parseInt(sidebarFarming.replace(/[^0-9]/g, ""));
    }
}
