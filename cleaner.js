class Cleaner {
    css = `
.tracker-cleaner {
    position: absolute;
    bottom: 20px;
    left: 20px;
    right: 20px;
    height: 70px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: auto;
}

.cleaner-tracker-logo {
    width: 50px;
    height: 30px;
    margin-left: -10px;
    margin-right: 10px;
}
    `;

    constructor() {
        this.leagueList = undefined;
        this.observer = new MutationObserver((mutations) => {
            const endedCharacters = document.getElementsByClassName("character-inactive");
            for (let character of endedCharacters) {
                this.insertCleanButton(character.parentNode);
            }
            this.leagueList ??= getIdlescapeWindowObject()?.leagues;
        });

        injectCSS(this.css);
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    insertCleanButton(characterNode) {
        if (characterNode.querySelector(".tracker-cleaner")) {
            return;
        }
        // Divide between ended seasons and just inactive characters
        const endedBox = characterNode.querySelector(".idlescape-container");
        if (!endedBox?.textContent.startsWith("Season ended")) {
            return;
        }
        const characterName = characterNode.querySelector(".character-username").textContent;
        const leagueIcon = characterNode.querySelector(".character-image-league");
        const leagueId = getLeagueId(leagueIcon, this.leagueList);
        if (!leagueId || !this.hasData(characterName, leagueId)) {
            return;
        }
        saveInsertAdjacentHTML(
            characterNode,
            "beforeend",
            `
            <div class='tracker-cleaner idlescape-container'>
                ${Templates.trackerLogoTemplate("cleaner-tracker-logo")}
                <span>
                    Clear market data for this season and settings for this character from local storage?
                </span>
                <div id="tracker-cleaner-button-${characterName}" class="tracker-settings-button idlescape-button-green">Clear</div>
            </div>`
        );
        document.getElementById(`tracker-cleaner-button-${characterName}`).addEventListener("click", () => {
            this.cleanLocalStorage(characterName, leagueId);
            characterNode.querySelector(".tracker-cleaner").remove();
        });
    }

    hasData(characterName, leagueId) {
        return (
            localStorage.getItem(`TrackerLastAPIFetch${leagueId}`) !== null ||
            localStorage.getItem(`TrackerMarketHistoryEncoded${leagueId}`) !== null ||
            localStorage.getItem(`TrackerSettings${characterName}`) !== null
        );
    }

    cleanLocalStorage(characterName, leagueId) {
        localStorage.removeItem(`TrackerLastAPIFetch${leagueId}`);
        localStorage.removeItem(`TrackerMarketHistoryEncoded${leagueId}`);
        localStorage.removeItem(`TrackerSettings${characterName}`);
    }
}
