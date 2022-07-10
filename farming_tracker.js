class FarmingTracker {

    seeds = ["mysterious-seed-1x1",
        "mysterious-seed-2x1",
        "mysterious-seed-3x1",
        "mysterious-seed-4x1",
        "mysterious-seed-1x2",
        "mysterious-seed-2x2",
        "mysterious-seed-3x2",
        "mysterious-seed-4x2",
        "mysterious-seed-1x3",
        "mysterious-seed-2x3",
        "mysterious-seed-3x3",
        "mysterious-seed-4x3",
        "mysterious-seed-1x4",
        "mysterious-seed-2x4",
        "mysterious-seed-3x4",
        "mysterious-seed-4x4",
        "carrot-seed",
        "potato-seed",
        "wheat-seed",
        "tomato-seed",
        "mushroom-spore",
        "sugarcane-seed",
        "chili-pepper-seed",
        "rice-seed",
        "pumpkin-seed",
        "peppercorn-seed",
        "wildberry-bush-seed",
        "sageberry-bush-seed",
        "tree-seed",
        "oak-tree-seed",
        "willow-tree-seed",
        "banana-tree-seed",
        "apple-tree-seed",
        "maple-tree-seed",
        "yew-tree-seed",
        "elder-tree-seed"]
    numGridElements = this.seeds.length + 6; // seeds + headers + borders

    constructor() {
        // setup mutation observer
        this.observer = new MutationObserver(mutations => {
            let selectedSkill = document.getElementsByClassName('nav-tab-left noselect selected-tab')[0];
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

        let existingSeeds = {};
        this.seeds.map(seed => {
            existingSeeds[seed] = false;
            return seed;
        });
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
        }
        // Add empty boxes for missing seeds
        Object.entries(existingSeeds).forEach(([seedName, exists]) => {
            if (!exists) {
                let seed = document.createElement("div");
                seed.classList.add("fake-item");
                seed.style.gridArea = seedName;
                seedContainer.appendChild(seed);
            }
        });
        // Add new headers for the seed types
        seedContainer.insertAdjacentHTML("beforeend", `
            <h5 class="farming-seeds-title seed-header-mysterious">Mysterious seeds</h5>
            <div class="farming-seeds-title-border seed-header-mysterious-border"></div>
            `);
        seedContainer.insertAdjacentHTML("beforeend", `
            <h5 class="farming-seeds-title seed-header-single">Single slot seeds</h5>
            <div class="farming-seeds-title-border seed-header-single-border"></div>
            `);
        seedContainer.insertAdjacentHTML("beforeend", `
            <h5 class="farming-seeds-title seed-header-multi">Multi slot seeds</h5>
            <div class="farming-seeds-title-border seed-header-multi-border"></div>
            `);
    }
}
