/* ===========================================================
   main.js
   Entry point for the Bot Show activity game.
   Wires up screen interactions.
   =========================================================== */

(function () {
    "use strict";

    window.currentLevel = 1;

    // ---- Per-stage battery counts ----------------------------------------
    // 5 stages: Tutorial, then Levels 1-4. Each puzzle's "whole" splits into
    // two parts — a = blue group, b = yellow group. Part 1 = charge (combine
    // the parts into the whole), Part 2 = split (whole back into parts).
    window.STAGES = [
        { key: "tutorial", part1: { blue: 4, yellow: 2 }, part2: { blue: 3, yellow: 2 } },
        { key: "level1", part1: { blue: 3, yellow: 5 }, part2: { blue: 4, yellow: 3 } },
        { key: "level2", part1: { blue: 6, yellow: 3 }, part2: { blue: 7, yellow: 3 } },
        { key: "level3", part1: { blue: 6, yellow: 4 }, part2: { blue: 5, yellow: 4 } },
        { key: "level4", part1: { blue: 6, yellow: 6 }, part2: { blue: 6, yellow: 5 } },
    ];
    window.gameStage = 0; // index into STAGES (0 = Tutorial)
    window.getCounts = function (part) {
        const s = window.STAGES[window.gameStage] || window.STAGES[0];
        return part === 2 ? s.part2 : s.part1;
    };

    // Each bot has its own interior-panel colour scheme (per the Figma):
    // orange / purple (Part 1 L1/L2) and white / blue (Part 2 L1/L2). The
    // filled colour boards are pre-rendered images (panel_<scheme>.webp), so we
    // just swap the src of every panel layer in the given screens.
    function setPanelScheme(screenIds, scheme) {
        const src = "assets/images/panel_" + scheme + ".webp";
        screenIds.forEach(function (id) {
            const root = document.getElementById(id);
            if (!root) return;
            root.querySelectorAll("img.panel").forEach(function (img) {
                img.src = src;
                img.removeAttribute("data-src");
            });
        });
    }
    window.setPanelScheme = setPanelScheme;

    function setupLevel(level) {
        window.currentLevel = level;
        // Bridge to the stage table: L1 = Tutorial, L2 = first chooser stage.
        // (Stages 2-4 activate as the chooser progression is built out.)
        window.gameStage = level === 2 ? 1 : 0;
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
            if (purpleBot) purpleBot.src = "assets/images/purple_bot_low.webp";
            if (screen3Bot) screen3Bot.src = "assets/images/orange_bot_charged.webp";
        }

        // Panel colour scheme per bot/level.
        setPanelScheme(["screen-2", "screen-4"], level === 2 ? "purple" : "orange");
        setPanelScheme(["screen-6", "screen-8"], level === 2 ? "blue" : "white");
    }
    window.setupLevel = setupLevel;

    // Theatre-curtain transition: close the curtains over the message, run
    // `onSwap` behind them, then part to reveal the next screen.
    function playCurtain(title, sub, onSwap) {
        const curtains = document.getElementById("curtains");
        const titleEl = document.getElementById("curtain-title");
        const subEl = document.getElementById("curtain-sub");
        if (titleEl) titleEl.textContent = title;
        if (subEl) subEl.textContent = sub;

        if (!curtains) {
            onSwap();
            return;
        }
        curtains.classList.add("is-active");
        window.requestAnimationFrame(function () {
            curtains.classList.add("is-closed");
        });
        window.setTimeout(onSwap, 950); // swap behind the closed curtains
        window.setTimeout(function () {
            curtains.classList.remove("is-closed");
        }, 2600); // hold the message, then open
        window.setTimeout(function () {
            curtains.classList.remove("is-active");
        }, 3600);
    }
    window.playCurtain = playCurtain;

    // Tutorial finished -> curtain -> Level 1 (the bot chooser).
    function showLevelTransition() {
        playCurtain("Tutorial Complete!", "Get ready for Level 1…", function () {
            setupLevel(2); // enters chooser mode (gameStage 1)
            window.GameNav.show("screen-1");
            if (window.Screen1Intro) window.Screen1Intro.play();
        });
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

        // Zoom Screen 1 into the (centred) bot, then hand off to `targetId`
        // which emerges from inside the chest.
        function enterBotTo(targetId, onSettled) {
            if (!screen1 || screen1.classList.contains("is-zooming")) return;
            screen1.classList.add("is-zooming");
            const target = document.getElementById(targetId);

            // Hand off when Screen 1 has zoomed to ~2x, which is exactly the
            // target's starting scale, so the crossfade is seamless.
            window.setTimeout(function () {
                window.GameNav.show(targetId);
                if (target) target.classList.add("is-entering");
            }, 380);

            // Clean up once the target has fully settled, then run its intro.
            window.setTimeout(function () {
                if (target) target.classList.remove("is-entering");
                screen1.classList.remove("is-zooming");
                if (onSettled) onSettled();
            }, 1200);
        }

        function enterBot() {
            enterBotTo("screen-2", function () {
                if (window.Screen2Intro) window.Screen2Intro.play();
            });
        }

        // L2+ chooser: enter the chosen bot to fix it — Part 1 (charge) for the
        // low bots, Part 2 (split) for the overcharged one — using that bot's
        // panel colour scheme.
        function chooseBotEnter(scheme, part) {
            window.currentScheme = scheme;
            if (part === "2") {
                if (window.setPanelScheme) window.setPanelScheme(["screen-6", "screen-8"], scheme);
                enterBotTo("screen-6", function () {
                    if (window.Part2) window.Part2.startSplit();
                });
            } else {
                if (window.setPanelScheme) window.setPanelScheme(["screen-2", "screen-4"], scheme);
                enterBot();
            }
        }
        window.chooseBotEnter = chooseBotEnter;

        // Return to the L2+ chooser after a bot is fixed. onFixed() marks the
        // bot done (charged + dancing) and advances the phase/level, returning
        // whether the LEVEL just completed (i.e. the split bot was fixed).
        function returnToChooser() {
            const res = window.BotChooser
                ? window.BotChooser.onFixed(window.currentScheme)
                : { levelComplete: false };

            if (res && res.levelComplete) {
                // Both bots of the level are fixed → curtain "Level X Complete"
                // then on to the next level's chooser (or game complete).
                const completed = (window.gameStage || 2) - 1; // level just finished
                if ((window.gameStage || 1) > 4) {
                    playCurtain("All Bots Fixed!", "Fantastic work — you fixed every bot!", function () {
                        setupLevel(1);
                        window.GameNav.show("screen-pre");
                    });
                } else {
                    playCurtain("Level " + completed + " Complete!", "Get ready for Level " + window.gameStage + "…", function () {
                        window.GameNav.show("screen-1");
                        if (window.BotChooser) window.BotChooser.enterChooser(false);
                    });
                }
            } else {
                // First bot (charge) done → show it dancing in front, then the
                // player picks an overcharged bot for the split phase.
                window.GameNav.show("screen-1");
                if (window.BotChooser) window.BotChooser.enterChooser(true);
            }
        }
        window.returnToChooser = returnToChooser;

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

