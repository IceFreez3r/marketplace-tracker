function farmingTracker() {
    let seedContainer = document.getElementsByClassName("all-items")[0];
    if (seedContainer.classList.contains("processed")) {
        return;
    }
    let seedList = seedContainer.getElementsByClassName("item");
    let existingSeeds = [[false, false, false, false], [false, false, false, false], [false, false, false, false], [false, false, false, false]];
    // Add classes to seeds
    for (let i = 0; i < seedList.length; i++) {
        let seed = seedList[i];
        const seedName = seed.getAttribute("data-for").replace(/farming\-seeds[0-9]+/, "");
        // check in which list the seed name is
        if (seedName === mysteriousSeedName) {
            const mysteriousSeedSize = seed.getElementsByClassName("item-augment")[0].innerText;
            let [size_1, size_2] = mysteriousSeedSize.split("x");
            existingSeeds[size_1 - 1][size_2 - 1] = true;
            seed.parentNode.style.gridArea = "mysterious-seed-" + mysteriousSeedSize;
        } else if (singleSlotSeedNames.indexOf(seedName) !== -1) {
            seed.parentNode.classList.add("single-slot-seed");
        } else if (multiSlotSeedNames.indexOf(seedName) !== -1) {
            seed.parentNode.classList.add("multi-slot-seed");
        } else {
            console.log("Unknown seed name: " + seedName);
        }
    }
    // Add pseudo mysterious seed divs if the user doesn't have that type
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (!existingSeeds[i][j]) {
                console.log(i, j)
                seedContainer.insertAdjacentHTML("beforeend", `<div style="grid-area: mysterious-seed-${i+1}x${j+1};" class="fake-item"></div>`);
            }
        }
    }
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

const mysteriousSeedName = "Mysterious Seed";
const singleSlotSeedNames = [
    "Carrot Seed",
    "Potato Seed",
    "Wheat Seed",
    "Tomato Seed",
    "Mushroom Spore",
    "Chili Pepper Seed",
    "Sugarcane Seed",
    "Pumpkin Seed",
    "Rice Seed",
    "Peppercorn Seed",
];
const multiSlotSeedNames = [
    "Wildberry Bush Seed",
    "Tree Seed",
    "Oak Tree Seed",
    "Apple Tree Seed",
    "Banana Tree Seed",
    "Sageberry Bush Seed",
    "Maple Tree Seed",
    "Willow Tree Seed",
    "Yew Tree Seed",
    "Elder Tree Seed",
];
