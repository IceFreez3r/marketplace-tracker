class FarmingTracker {
    static id = "farming_tracker"
    static displayName = "Farming Tracker";
    static icon = "<img src='/images/farming/farming_icon.png' alt='Farming Tracker Icon'>";
    static category = "visual";
    css = `
body .farming-container {
    width: fit-content;
}

body .farming-info-content {
    min-width: 128px;
}

body .farming-seed-settings {
    position: unset;
}

body .farming-seeds {
    display: block;
    max-width: unset;
    width: auto;
}

body .farming-seeds .all-items {
    grid-template-areas: "seed-header-mysterious seed-header-mysterious seed-header-mysterious seed-header-mysterious"
                        "seed-header-mysterious-border seed-header-mysterious-border seed-header-mysterious-border seed-header-mysterious-border"
                        "mysterious-seed-1x1 mysterious-seed-2x1 mysterious-seed-3x1 mysterious-seed-4x1"
                        "mysterious-seed-1x2 mysterious-seed-2x2 mysterious-seed-3x2 mysterious-seed-4x2"
                        "mysterious-seed-1x3 mysterious-seed-2x3 mysterious-seed-3x3 mysterious-seed-4x3"
                        "mysterious-seed-1x4 mysterious-seed-2x4 mysterious-seed-3x4 mysterious-seed-4x4"
                        "seed-header-single seed-header-single seed-header-single seed-header-single"
                        "seed-header-single-border seed-header-single-border seed-header-single-border seed-header-single-border"
                        "carrot-seed potato-seed wheat-seed tomato-seed"
                        "mushroom-spore sugarcane-seed chili-pepper-seed rice-seed"
                        "pumpkin-seed peppercorn-seed . ."
                        "seed-header-multi seed-header-multi seed-header-multi seed-header-multi"
                        "seed-header-multi-border seed-header-multi-border seed-header-multi-border seed-header-multi-border"
                        "wildberry-bush-seed sageberry-bush-seed tree-seed oak-tree-seed"
                        "willow-tree-seed banana-tree-seed apple-tree-seed maple-tree-seed"
                        "yew-tree-seed elder-tree-seed . ."
                        "seed-header-traps seed-header-traps seed-header-traps seed-header-traps"
                        "seed-header-traps-border seed-header-traps-border seed-header-traps-border seed-header-traps-border"
                        "box-trap pitfall-trap bird-trap net-trap"
                        "bear-trap . . ."
                        "seed-header-totems seed-header-totems seed-header-totems seed-header-totems"
                        "seed-header-totems-border seed-header-totems-border seed-header-totems-border seed-header-totems-border"
                        "water-totem nature-totem earth-totem coalescing-totem";
    grid-template-columns: repeat(4, 60px);
    max-height: unset;
    height: 100%;
    width: fit-content;
    overflow-x: hidden;
}

.high-level-seed {
    background-image: linear-gradient(180deg, rgba(13, 64, 12, 0.6), rgba(13, 64, 12, .6)), url(/images/ui/frame_box.png);
}

.high-level-seed > img {
    opacity: 0.6;
}

.fake-item {
    height: 60px;
    width: 60px;
    border: 1px solid gray;
    border-radius: 8px;
}

.fake-item > img {
    height: 100%;
    width: 85%;
    object-fit: contain;
    margin-left: 3px;
    margin-right: 5px;
    opacity: 0.3;
}
    `;

    seeds = {
        "mysterious-seed-1x1": {img: "/images/farming/mysterious_seed.png",          minLevel: 1 },
        "mysterious-seed-2x1": {img: "/images/farming/mysterious_seed.png",          minLevel: 1 },
        "mysterious-seed-3x1": {img: "/images/farming/mysterious_seed.png",          minLevel: 20},
        "mysterious-seed-4x1": {img: "/images/farming/mysterious_seed.png",          minLevel: 40},
        "mysterious-seed-1x2": {img: "/images/farming/mysterious_seed.png",          minLevel: 10},
        "mysterious-seed-2x2": {img: "/images/farming/mysterious_seed.png",          minLevel: 10},
        "mysterious-seed-3x2": {img: "/images/farming/mysterious_seed.png",          minLevel: 20},
        "mysterious-seed-4x2": {img: "/images/farming/mysterious_seed.png",          minLevel: 40},
        "mysterious-seed-1x3": {img: "/images/farming/mysterious_seed.png",          minLevel: 30},
        "mysterious-seed-2x3": {img: "/images/farming/mysterious_seed.png",          minLevel: 30},
        "mysterious-seed-3x3": {img: "/images/farming/mysterious_seed.png",          minLevel: 30},
        "mysterious-seed-4x3": {img: "/images/farming/mysterious_seed.png",          minLevel: 40},
        "mysterious-seed-1x4": {img: "/images/farming/mysterious_seed.png",          minLevel: 50},
        "mysterious-seed-2x4": {img: "/images/farming/mysterious_seed.png",          minLevel: 50},
        "mysterious-seed-3x4": {img: "/images/farming/mysterious_seed.png",          minLevel: 50},
        "mysterious-seed-4x4": {img: "/images/farming/mysterious_seed.png",          minLevel: 50},
        "carrot-seed":         {img: "/images/farming/carrot_seed.png",              minLevel: 1 },
        "potato-seed":         {img: "/images/farming/potato_seed.png",              minLevel: 3 },
        "wheat-seed":          {img: "/images/farming/wheat_seed.png",               minLevel: 8 },
        "tomato-seed":         {img: "/images/farming/tomato_seed.png",              minLevel: 12},
        "mushroom-spore":      {img: "/images/farming/mushroom_spore.png",           minLevel: 15},
        "sugarcane-seed":      {img: "/images/farming/sugarcane_seed.png",           minLevel: 20},
        "chili-pepper-seed":   {img: "/images/farming/chili_pepper_seed.png",        minLevel: 20},
        "rice-seed":           {img: "/images/farming/rice_seed.png",                minLevel: 25},
        "pumpkin-seed":        {img: "/images/farming/pumpkin_seed.png",             minLevel: 25},
        "peppercorn-seed":     {img: "/images/farming/peppercorn_seed.png",          minLevel: 30},
        "wildberry-bush-seed": {img: "/images/farming/wildberry_bush_seed.png",      minLevel: 5 },
        "sageberry-bush-seed": {img: "/images/farming/sageberry_seed.png",           minLevel: 25},
        "tree-seed":           {img: "/images/farming/tree_seed.png",                minLevel: 10},
        "oak-tree-seed":       {img: "/images/farming/oak_tree_seed.png",            minLevel: 17},
        "willow-tree-seed":    {img: "/images/farming/willow_tree_seed.png",         minLevel: 20},
        "banana-tree-seed":    {img: "/images/farming/banana_tree_seed.png",         minLevel: 20},
        "apple-tree-seed":     {img: "/images/farming/apple_tree_seed.png",          minLevel: 20},
        "maple-tree-seed":     {img: "/images/farming/maple_tree_seed.png",          minLevel: 25},
        "yew-tree-seed":       {img: "/images/farming/yew_tree_seed.png",            minLevel: 35},
        "elder-tree-seed":     {img: "/images/farming/elder_tree_seed.png",          minLevel: 50},
        "box-trap":            {img: "/images/farming/hunting/box_trap.png",         minLevel: 1 },
        "pitfall-trap":        {img: "/images/farming/hunting/pitfall.png",          minLevel: 10},
        "bird-trap":           {img: "/images/farming/hunting/bird_trap.png",        minLevel: 20},
        "net-trap":            {img: "/images/farming/hunting/net_trap.png",         minLevel: 25},
        "bear-trap":           {img: "/images/farming/hunting/metal_trap.png",       minLevel: 35},
        "water-totem":         {img: "/images/farming/totem/water_totem_mj_v2.png",  minLevel: 40},
        "nature-totem":        {img: "/images/farming/totem/nature_orb.png",         minLevel: 40},
        "earth-totem":         {img: "/images/farming/totem/earth_orb.png",          minLevel: 40},
        "coalescing-totem":    {img: "/images/farming/totem/condensed_orb.png",      minLevel: 40},
    }
    numGridElements = 45 + 5 + 5; // seeds (45) + headers (5) + borders (5)

    constructor(tracker, settings, storage) {
        this.tracker = tracker;
        this.settings = settings;
        this.cssNode = injectCSS(this.css);

        this.playAreaObserver = new MutationObserver(mutations => {
            if (getSelectedSkill() === "Farming") {
                if (detectInfiniteLoop(mutations)) {
                    return;
                }
                this.farmingTracker();
            }
        });
    }
    
    onGameReady() {
        const playAreaContainer = document.getElementsByClassName("play-area-container")[0];
        this.playAreaObserver.observe(playAreaContainer, {
            childList: true,
            subtree: true
        });
    }

    deactivate() {
        this.cssNode.remove();
        this.playAreaObserver.disconnect();
    }

    settingsMenuContent() {
        return "";
    }

    onAPIUpdate() {
        return;
    }

    farmingTracker() {
        // TODO: Hide info container if width < 128px?
        let seedContainer = document.getElementsByClassName("all-items")[0];
        if (seedContainer.childElementCount === this.numGridElements) {
            return;
        }
        this.clearMetaElements(seedContainer);

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
            seed.style.gridArea = seedName;
            if (this.seeds[seedName]?.minLevel > farmingLevel) {
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
                <h5 class="farming-seeds-title" style="grid-area:seed-header-mysterious;">Mysterious seeds</h5>
                <div class="farming-seeds-title-border" style="grid-area:seed-header-mysterious-border;"></div>
                <h5 class="farming-seeds-title" style="grid-area:seed-header-single;">Single slot seeds</h5>
                <div class="farming-seeds-title-border" style="grid-area:seed-header-single-border;"></div>
                <h5 class="farming-seeds-title" style="grid-area:seed-header-multi;">Multi slot seeds</h5>
                <div class="farming-seeds-title-border" style="grid-area:seed-header-multi-border;"></div>
                <h5 class="farming-seeds-title" style="grid-area:seed-header-traps;">Traps</h5>
                <div class="farming-seeds-title-border" style="grid-area:seed-header-traps-border;"></div>
                <h5 class="farming-seeds-title" style="grid-area:seed-header-totems;">Totems</h5>
                <div class="farming-seeds-title-border" style="grid-area:seed-header-totems-border;"></div>`);
    }

    clearMetaElements(seedContainer) {
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
    }

    getFarmingLevel() {
        // Dael's script attaches the farming level to window 
        if (window.ISState) {
            return window.ISstate.skills.farming.level;
        }
        // If the user activated levels in the sidebar, the farming level is always accessible from there
        const sidebarFarming = document.getElementById('farmingHeaderundefined');
        if (sidebarFarming) {
            if (sidebarFarming.parentNode.getElementsByClassName("mastery-bar")[0]) {
                return 99;
            }
            return parseInt(sidebarFarming.previousElementSibling.innerText);
        }
        // Last option is the header, which might not be shown if the window is in half screen mode
        const header = document.getElementById('farmingHeader');
        if (header) {
            if (header.previousSibling.firstChild.classList.contains('standard-levels-maxed')) {
                return 99;
            }
            return parseInt(header.previousSibling.firstChild.lastChild.innerText);
        }
        // Fallback
        return 99;
    }

    getEffectiveFarmingLevel() {
        if (window.ISState) {
            return window.ISstate.skills.farming.masteryLevel;
        }
        const sidebarFarming = document.getElementById('farmingHeaderundefined');
        if (sidebarFarming) {
            return parseInt(sidebarFarming.getElementsByTagName("span")[1].innerHTML.replace(/[^0-9]/g, ""));
        }
        const header = document.getElementById('farmingHeader');
        if (header) {
            return document.getElementById('farmingHeader').childNodes[3].lastChild.textContent;
        }
        // Fallback
        return this.getFarmingLevel();
    }
}
