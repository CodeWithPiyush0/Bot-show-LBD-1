/* ===========================================================
   main.js
   Entry point for the Bot Show activity game.
   Wires up screen interactions.
   =========================================================== */

(function () {
    "use strict";

    window.currentLevel = 1;

    function setupLevel(level) {
        window.currentLevel = level;
        const game = document.getElementById("game");
        const orangeBot = document.querySelector(".bot--orange");
        const purpleBot = document.querySelector(".bot--purple");
        const screen3Bot = document.querySelector("#screen-3 .charged-bot img");

        if (level === 2) {
            if (game) game.classList.add("level-2");
            if (orangeBot) orangeBot.src = "assets/images/orange_bot_charged.webp";
            if (purpleBot) purpleBot.src = "assets/images/purple_bot_low.webp";
            if (screen3Bot) screen3Bot.src = "assets/images/purple_bot_charged.webp";
        } else {
            if (game) game.classList.remove("level-2");
            if (orangeBot) orangeBot.src = "assets/images/orange_bot.webp";
            if (purpleBot) purpleBot.src = "assets/images/Sahdow_Purple_Bot.webp";
            if (screen3Bot) screen3Bot.src = "assets/images/orange_bot_charged.webp";
        }
    }
    window.setupLevel = setupLevel;

    // Theatre-curtain level transition: close the curtains over the
    // finished level, swap to the next behind them, then part to reveal it.
    function showLevelTransition() {
        const finishing = window.currentLevel === 2; // L2 done -> whole game complete
        const curtains = document.getElementById("curtains");
        const titleEl = document.getElementById("curtain-title");
        const subEl = document.getElementById("curtain-sub");

        if (titleEl) titleEl.textContent = finishing ? "All Bots Fixed!" : "Level 1 Complete!";
        if (subEl) {
            subEl.textContent = finishing
                ? "Fantastic work — you fixed every bot!"
                : "Get ready for Level 2…";
        }

        // Behind the closed curtains, set up the next level.
        function swap() {
            if (finishing) {
                setupLevel(1);
                window.GameNav.show("screen-pre");
            } else {
                setupLevel(2);
                window.GameNav.show("screen-1");
                if (window.Screen1Intro) window.Screen1Intro.play();
            }
        }

        if (!curtains) {
            swap();
            return;
        }

        curtains.classList.add("is-active");
        // close (next frame so the transition runs)
        window.requestAnimationFrame(function () {
            curtains.classList.add("is-closed");
        });
        // once closed, swap the level behind them
        window.setTimeout(swap, 950);
        // hold the message, then open the curtains
        window.setTimeout(function () {
            curtains.classList.remove("is-closed");
        }, 2600);
        // fully open -> stand down
        window.setTimeout(function () {
            curtains.classList.remove("is-active");
        }, 3600);
    }
    window.showLevelTransition = showLevelTransition;

    function init() {
        const stage = document.getElementById("stage");
        if (!stage) {
            console.warn("Game stage element not found.");
            return;
        }

        // Play button on Start Screen begins Level 1 (Tutorial)
        const playBtn = document.getElementById("play-btn");
        if (playBtn) {
            playBtn.addEventListener("click", function () {
                setupLevel(1);
                window.GameNav.show("screen-1");
                if (window.Screen1Intro) window.Screen1Intro.play();
            });
        }

        // Next level / Restart button on transition screen
        const nextLevelBtn = document.getElementById("next-level-btn");
        if (nextLevelBtn) {
            nextLevelBtn.addEventListener("click", function () {
                if (window.currentLevel === 1) {
                    setupLevel(2);
                    window.GameNav.show("screen-1");
                    if (window.Screen1Intro) window.Screen1Intro.play();
                } else {
                    setupLevel(1);
                    window.GameNav.show("screen-pre");
                }
            });
        }

        // Screen 1: tapping the active center bot zooms into it, then Screen 2
        // emerges from inside the bot.
        const orangeBot = document.querySelector(".bot--orange");
        const purpleBot = document.querySelector(".bot--purple");
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
            orangeBot.addEventListener("click", function () {
                if (window.currentLevel === 1) enterBot();
            });
        }
        if (purpleBot) {
            purpleBot.addEventListener("click", function () {
                if (window.currentLevel === 2) enterBot();
            });
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

    // Load the deferred (non-Screen-1) images right after the first paint,
    // so Screen 1 shows fast while the rest streams in the background.
    function loadDeferred() {
        document.querySelectorAll("img[data-src]").forEach(function (img) {
            img.src = img.getAttribute("data-src");
            img.removeAttribute("data-src");
        });
    }
    if (document.readyState === "complete") {
        loadDeferred();
    } else {
        window.addEventListener("load", function () {
            window.setTimeout(loadDeferred, 150);
        });
    }
})();

