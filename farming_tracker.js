function farmingTracker() {
    let seedContainer = document.getElementsByClassName("all-items")[0];
    if (seedContainer.classList.contains("processed")) {
        return;
    }
    let seedList = seedContainer.getElementsByClassName("item");
    // Add classes to seeds
    for (let i = 0; i < seedList.length; i++) {
        let seed = seedList[i];
        const seedName = seed.getAttribute("data-for").replace(/farming\-seeds[0-9]+/, "");
        // check in which list the seed name is
        if (seedName === mysteriousSeedName) {
            const mysteriousSeedSize = seed.getElementsByClassName("item-augment")[0].innerText;
            seed.parentNode.classList.add("mysterious-seed-" + mysteriousSeedSize);
        } else if (singleSlotSeedNames.indexOf(seedName) !== -1) {
            seed.parentNode.classList.add("single-slot-seed");
        } else if (multiSlotSeedNames.indexOf(seedName) !== -1) {
            seed.parentNode.classList.add("multi-slot-seed");
        } else {
            console.log("Unknown seed name: " + seedName);
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
