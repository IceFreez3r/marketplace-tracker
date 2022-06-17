function farmingTracker() {
    let seedContainer = document.getElementsByClassName("all-items")[0];
    if (seedContainer.classList.contains("processed")) {
        return;
    }
    let existingSeeds = {};
    for (let i = 0; i < seeds.length; i++) {
        console.log(seeds[i]);
        existingSeeds[seeds[i]] = false;
    }
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
        console.log(seedName);
        if (!exists) {
            seedContainer.insertAdjacentHTML("beforeend", `<div style="grid-area: ${seedName};" class="fake-item"></div>`);
        }
    });    
    // Remove old header
    seedContainer.parentNode.getElementsByClassName("farming-seeds-title")[0].remove();
    seedContainer.parentNode.getElementsByClassName("farming-seeds-title-border")[0].remove();
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
    seedContainer.classList.add("processed");
}

const seeds = ["mysterious-seed-1x1",
               "mysterious-seed-1x2",
               "mysterious-seed-1x3",
               "mysterious-seed-1x4",
               "mysterious-seed-2x1",
               "mysterious-seed-2x2",
               "mysterious-seed-2x3",
               "mysterious-seed-2x4",
               "mysterious-seed-3x1",
               "mysterious-seed-3x2",
               "mysterious-seed-3x3",
               "mysterious-seed-3x4",
               "mysterious-seed-4x1",
               "mysterious-seed-4x2",
               "mysterious-seed-4x3",
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
