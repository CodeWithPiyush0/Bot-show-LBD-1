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

        // Screen 1: tapping the orange bot opens its interior (Screen 2).
        const orangeBot = document.querySelector(".bot--orange");
        if (orangeBot) {
            orangeBot.addEventListener("click", function () {
                window.GameNav.show("screen-2");
            });
        }

        // Dev convenience: press Escape to return to Screen 1.
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                window.GameNav.show("screen-1");
            }
        });

        console.log("Bot Show: ready.");
    }

    document.addEventListener("DOMContentLoaded", init);
})();
