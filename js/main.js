/* ===========================================================
   main.js
   Entry point for the Bot Show activity game.
   Wires up screen interactions.
   =========================================================== */

(function () {
    "use strict";

    function init() {
        const stage = document.getElementById("stage");
        if (!stage) {
            console.warn("Game stage element not found.");
            return;
        }

        // Screen 1: tapping the orange bot zooms into it, then Screen 2
        // emerges from inside the bot.
        const orangeBot = document.querySelector(".bot--orange");
        const screen1 = document.getElementById("screen-1");
        const screen2 = document.getElementById("screen-2");

        function enterBot() {
            if (!screen1 || screen1.classList.contains("is-zooming")) return;
            screen1.classList.add("is-zooming");

            // Hand off when Screen 1 has zoomed to ~2x, which is exactly
            // Screen 2's starting scale, so the crossfade is seamless.
            window.setTimeout(function () {
                window.GameNav.show("screen-2");
                if (screen2) screen2.classList.add("is-entering");
            }, 380);

            // Clean up once Screen 2 has fully settled, then play its intro.
            window.setTimeout(function () {
                if (screen2) screen2.classList.remove("is-entering");
                screen1.classList.remove("is-zooming");
                if (window.Screen2Intro) window.Screen2Intro.play();
            }, 1200);
        }

        if (orangeBot) {
            orangeBot.addEventListener("click", enterBot);
        }

        // Screen 2 -> 3: the reverse of enterBot. We pull back OUT of the
        // bot's chest to reveal the whole (charged) bot on Screen 3.
        const screen3 = document.getElementById("screen-3");

        function exitBot() {
            if (!screen2 || screen2.classList.contains("is-zooming-out")) return;
            screen2.classList.add("is-zooming-out");

            window.setTimeout(function () {
                window.GameNav.show("screen-3");
                if (screen3) screen3.classList.add("is-revealing");
            }, 150);

            window.setTimeout(function () {
                if (screen3) screen3.classList.remove("is-revealing");
                screen2.classList.remove("is-zooming-out");
            }, 1300);
        }

        window.GameFx = { exitBot: exitBot };

        // Dev convenience: press Escape to return to Screen 1.
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                window.GameNav.show("screen-1");
            }
        });

        // Deep-link: "#2" / "#screen-2" opens Screen 2 directly.
        const hash = window.location.hash.replace("#", "");
        if (hash === "2" || hash === "screen-2") {
            window.GameNav.show("screen-2");
            if (window.Screen2Intro) window.Screen2Intro.play();
        }
        if (hash === "4" || hash === "screen-4") {
            window.GameNav.show("screen-4");
            if (window.ConceptScreen) window.ConceptScreen.play();
        }
        if (hash === "5") {
            window.GameNav.show("screen-5");
            if (window.Part2) window.Part2.startIntro();
        }
        if (hash === "6") {
            window.GameNav.show("screen-6");
            if (window.Part2) window.Part2.startSplit();
        }
        if (hash === "7") {
            window.GameNav.show("screen-7");
        }
        if (hash === "8") {
            window.GameNav.show("screen-8");
            if (window.Part2) window.Part2.playConcept2();
        }

        console.log("Bot Show: ready.");
    }

    document.addEventListener("DOMContentLoaded", init);
})();
