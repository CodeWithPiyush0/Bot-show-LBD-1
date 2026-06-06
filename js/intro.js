/* ===========================================================
   intro.js
   Screen 1 intro: after the question template unrolls open,
   the question text is typed out one character at a time.
   (The template-open + mascot-pop animations are CSS-driven.)
   =========================================================== */

(function () {
    "use strict";

    const TYPE_SPEED = 45; // ms per character

    function typewriter(el, text, speed) {
        el.textContent = "";
        let i = 0;
        (function tick() {
            if (i >= text.length) return;
            el.textContent += text.charAt(i);
            i += 1;
            window.setTimeout(tick, speed);
        })();
    }

    function runIntro() {
        const template = document.querySelector(".question__template");
        const textEl = document.querySelector(".question__text");
        if (!textEl) return;

        const full = textEl.getAttribute("data-text") || "";
        textEl.textContent = "";

        let started = false;
        const startTyping = function () {
            if (started) return;
            started = true;
            typewriter(textEl, full, TYPE_SPEED);
        };

        // Start typing once the template has finished unrolling.
        if (template) {
            template.addEventListener("animationend", startTyping, { once: true });
            // Fallback in case animationend doesn't fire.
            window.setTimeout(startTyping, 1200);
        } else {
            startTyping();
        }
    }

    document.addEventListener("DOMContentLoaded", runIntro);
})();
