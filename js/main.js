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
            if (purpleBot) purpleBot.src = "assets/images/Sahdow_Purple_Bot.webp";
            if (screen3Bot) screen3Bot.src = "assets/images/purple_bot.webp";
        } else {
            if (game) game.classList.remove("level-2");
            if (orangeBot) orangeBot.src = "assets/images/orange_bot.webp";
            if (purpleBot) purpleBot.src = "assets/images/Sahdow_Purple_Bot.webp";
            if (screen3Bot) screen3Bot.src = "assets/images/orange_bot_charged.webp";
        }
    }
    window.setupLevel = setupLevel;

    function showLevelTransition() {
        const titleEl = document.getElementById("transition-title");
        const subtitleEl = document.getElementById("transition-subtitle");
        const btnEl = document.getElementById("next-level-btn");

        // Hide next level button, transition runs automatically
        if (btnEl) btnEl.style.display = "none";

        if (window.currentLevel === 1) {
            if (titleEl) titleEl.textContent = "Level 1 Completed!";
            if (subtitleEl) subtitleEl.textContent = "Get ready for Level 2: the real challenge!";
            
            // Automatically launch Level 2 after 4 seconds
            window.setTimeout(function () {
                setupLevel(2);
                window.GameNav.show("screen-1");
                if (window.Screen1Intro) window.Screen1Intro.play();
            }, 4000);
        } else {
            if (titleEl) titleEl.textContent = "All Bots Fixed!";
            if (subtitleEl) subtitleEl.textContent = "Fantastic work! You completed the game.";
            
            // Automatically go back to start screen after 5.5 seconds
            window.setTimeout(function () {
                setupLevel(1);
                window.GameNav.show("screen-pre");
            }, 5500);
        }

        window.GameNav.show("screen-transition");
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

