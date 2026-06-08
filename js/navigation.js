/* ===========================================================
   navigation.js
   Simple screen switcher. Screens are <section class="screen">
   inside the stage; only the one with `.is-active` is shown.
   Also sets the letterbox fill (the area outside the 16:9 stage)
   to match each screen's background edges.
   =========================================================== */

(function (global) {
    "use strict";

    // Letterbox colour per screen, sampled from each screen's bg edges.
    const LETTERBOX = {
        "screen-pre": "#0a0130", // Pre-LBD purple theatre
        "screen-1": "#5a3624", // room (BG.webp) brown
        "screen-3": "#5a3624",
        "screen-5": "#5a3624",
        "screen-7": "#5a3624",
        "screen-2": "#0b0b0c", // dark interior
        "screen-4": "#0b0b0c",
        "screen-6": "#0b0b0c",
        "screen-8": "#0b0b0c",
        "screen-transition": "#05010a",
    };
    const DEFAULT_LETTERBOX = "#5a3624";

    function applyLetterbox(screenId) {
        const game = document.getElementById("game");
        if (game) game.style.backgroundColor = LETTERBOX[screenId] || DEFAULT_LETTERBOX;
    }

    const GameNav = {
        /**
         * Show a screen by its element id (e.g. "screen-2").
         * Adds `.is-active` to the target and removes it from the rest,
         * and matches the letterbox fill to that screen.
         */
        show(screenId) {
            const screens = document.querySelectorAll(".screen");
            screens.forEach((screen) => {
                screen.classList.toggle("is-active", screen.id === screenId);
            });
            applyLetterbox(screenId);
        },
    };

    global.GameNav = GameNav;

    // Match the letterbox to whichever screen is active on load.
    document.addEventListener("DOMContentLoaded", function () {
        const active = document.querySelector(".screen.is-active");
        applyLetterbox(active ? active.id : "screen-pre");
    });
})(window);
