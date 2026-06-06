/* ===========================================================
   navigation.js
   Simple screen switcher. Screens are <section class="screen">
   inside the stage; only the one with `.is-active` is shown.
   =========================================================== */

(function (global) {
    "use strict";

    const GameNav = {
        /**
         * Show a screen by its element id (e.g. "screen-2").
         * Adds `.is-active` to the target and removes it from the rest.
         */
        show(screenId) {
            const screens = document.querySelectorAll(".screen");
            screens.forEach((screen) => {
                screen.classList.toggle("is-active", screen.id === screenId);
            });
        },
    };

    global.GameNav = GameNav;
})(window);
