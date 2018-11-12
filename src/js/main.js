"use strict";
class Qiupalong {
    // In order to show the latest data, pass "current" as a yearEnd value
    constructor(yearStart = 2000, yearEnd = "current") {
        const now = (new Date()).getFullYear();
        const favourites = JSON.parse(localStorage.getItem("f1_favourites"));

        this.config = {
            endpoint: "http://ergast.com/api/f1/",
            format: ".json?limit=999",
            yearStart: yearStart,
            yearEnd: yearEnd
        };

        this.seasonsData = {};
        this.seasonsCount = 0;
        this.processedSeasonsCount = 0;
        this.favourites = favourites || {};

        // Integer values for years, in case we use a current year pointer
        this.yearStartInt = yearStart === "current" ? now : yearStart;
        this.yearEndInt = yearEnd === "current" ? now : yearEnd;
    };

    init(){
        const rangeDifference = this.yearEndInt - this.yearStartInt;
        // Application will be nice to you if you swap the years accidentally
        if(rangeDifference < 0) {
            // End year was before start year, hence a switcheroo is necessary
            [this.config.yearStart, this.config.yearEnd] = [this.config.yearEnd, this.config.yearStart];
            [this.yearStartInt, this.yearEndInt] = [this.yearEndInt, this.yearStartInt];
        }

        this.seasonsCount = (this.yearEndInt - this.yearStartInt) + 1;

        // Get general information about seasons and respective champions
        for (let i = 0; i < this.seasonsCount; i++) {
            const year = this.yearStartInt + i;
            const URL = `${this.config.endpoint + year}/driverStandings${this.config.format}`;

            fetch(URL)
                .then(resp => resp.json())
                .then(data => this.handleSeasonRequest(data))
                .catch(error => console.log(error));
        }
    };

    handleSeasonRequest(data) {
        this.processedSeasonsCount++;
        this.handleSeasonData(data);

        // Start rendering only when all requests have been processed
        if(this.processedSeasonsCount === this.seasonsCount) {
            this.renderSeasons();
        }
    };

    handleSeasonData(data) {
        const season = data.MRData.StandingsTable.season;
        const champion = data.MRData.StandingsTable.StandingsLists[0].DriverStandings[0].Driver;
        this.seasonsData[season] = champion;
    };

    renderSeasons() {
        const loader = document.getElementById("loader-main");
        const wrapper = document.getElementById("content");
        const list = document.getElementById("season-list");
        if (!loader || !wrapper || !list) return;

        list.innerHTML = "";
        for(let i = 0; i< this.seasonsCount; i++) {
            const year = this.yearStartInt + i;
            const driver = this.seasonsData[year];
            const name = driver.givenName + " " + driver.familyName;

            const el = document.createElement("div");
            el.className = "season-item";

            var template = `<h3 class="season-title">${year} — ${name}</h3>
                <table class="season-details hidden">
                    <thead>
                        <tr>
                            <th class="season-details-header">Round</th>
                            <th class="season-details-header">Winner</th>
                        </tr>
                    </thead>
                    <tbody class="season-details-content"></tbody>
                </table>`;

            el.innerHTML = template;
            list.appendChild(el);
            el.querySelector(".season-title").onclick = () => this.fetchSeasonDetails(year, el);

        }

        loader.classList.add("hidden");
        wrapper.classList.remove("hidden");
    };

    fetchSeasonDetails(year, element) {
        // Get detailed information about races for one season
        // Make sure to only fetch the winners for every round with "/1", losers don't matter haha
        const URL = `${this.config.endpoint + year}/results/1${this.config.format}`;
        fetch(URL)
            .then(resp => resp.json())
            .then(data => this.handleDetailsRequest(data, element))
            .catch(error => console.log(error));
    };

    handleDetailsRequest(data, element) {
        const wrapper = element.querySelector(".season-details");

        if(!wrapper.classList.contains("hidden")) {
            // Details have been already open, so we toggle them off
            wrapper.classList.add("hidden");
            return false;
        }

        // Render season races details
        const races = data.MRData.RaceTable.Races;
        const container = wrapper.querySelector(".season-details-content");
        let template = "";

        races.forEach((race) => {
            const winner = race.Results[0].Driver;
            const isChampion = this.seasonsData[race.season].driverId === winner.driverId;
            template += `<tr>
                    <td class="season-details-cell round ${isChampion ? "highlight" : ""}">${race.round}. ${race.raceName}</td>
                    <td class="season-details-cell winner ${isChampion ? "highlight" : ""}" data-id="${winner.driverId}">
                        <span>${winner.givenName} ${winner.familyName}</span>
                        <span class="heart normal">&#x2661;</span>
                        <span class="heart favourite">&#x2665;</span>
                    </td>
                </tr>`;
        });

        container.innerHTML = template;
        this.hideAllDetails();
        this.updateFavourites();
        wrapper.classList.remove("hidden");
        wrapper.closest(".season-item").scrollIntoView({ behavior: "smooth", block: "nearest" });

        container.querySelectorAll(".heart").forEach((heart) => {
            heart.onclick = () => this.toggleFavourite(heart);
        });
    };

    hideAllDetails () {
        // If any other season details were already open, that should dismiss them
        document.querySelectorAll(".season-details:not(.hidden)").forEach((item) => {
            item.classList.add("hidden");
        });
    };

    toggleFavourite(element) {
        const id = element.closest(".winner").dataset.id;

        // Toggle the value, set to true if unset
        this.favourites[id] = !this.favourites[id];

        // Save to local storage
        localStorage.setItem("f1_favourites", JSON.stringify(this.favourites));

        this.updateFavourites();
    };

    updateFavourites() {
        // Make sure all heart icons reflect the data
        document.querySelectorAll(".winner").forEach((winner) => {
            const heartNormal = winner.querySelector(".heart.normal");
            const heartFavourite = winner.querySelector(".heart.favourite");

            if(this.favourites[winner.dataset.id] === true) {
                heartNormal.classList.add("hidden");
                heartFavourite.classList.remove("hidden");
            }
            else {
                heartNormal.classList.remove("hidden");
                heartFavourite.classList.add("hidden");
            }
        });
    };
};

document.addEventListener("DOMContentLoaded", () => {
    const qiupalong = new Qiupalong(2005, 2015);
    qiupalong.init();
});
