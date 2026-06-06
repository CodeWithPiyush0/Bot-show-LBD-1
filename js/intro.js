/* ===========================================================
   intro.js
   Screen 1 intro: after the question template unrolls open,
   the question text is typed out one character at a time.
   (The template-open + mascot-pop animations are CSS-driven.)
   =========================================================== */

(function () {
    "use strict";

    const TYPE_SPEED = 45; // ms per character

    function typewriter(el, text, speed, onDone) {
        el.textContent = "";
        let i = 0;
        (function tick() {
            if (i >= text.length) {
                if (onDone) onDone();
                return;
            }
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

    /* ---- Screen 2 intro ----
       Opens the banner, types the prompt, holds (placeholder for the
       VO), then closes back to just the mascot face. The gameplay
       content is kept compact while the banner is open. */
    const HOLD_AFTER_TEXT = 3500; // ms to wait after typing (VO placeholder)

    function playScreen2Intro() {
        const content = document.getElementById("s2-content");
        const q = document.getElementById("question-2");
        if (!q) return;
        const textEl = q.querySelector(".question__text");
        const full = textEl.getAttribute("data-text") || "";

        // Lock dragging and start compact + closed.
        if (window.Batteries) window.Batteries.setEnabled(false);
        if (content) content.classList.add("is-compact");
        q.classList.remove("is-open");
        textEl.textContent = "";

        // Open the banner, then type once it has unrolled.
        window.setTimeout(function () {
            q.classList.add("is-open");
            window.setTimeout(function () {
                typewriter(textEl, full, TYPE_SPEED, function () {
                    window.setTimeout(closeScreen2Intro, HOLD_AFTER_TEXT);
                });
            }, 650); // after the unroll transition
        }, 150);

        function closeScreen2Intro() {
            q.classList.remove("is-open"); // collapse to the mascot face
            textEl.textContent = "";
            if (content) content.classList.remove("is-compact"); // grow to normal
            // After it has grown back, demonstrate the drag with a ghost
            // (3 times), then enable dragging.
            window.setTimeout(function () {
                if (window.Batteries && window.Batteries.playHint) {
                    window.Batteries.playHint();
                } else if (window.Batteries) {
                    window.Batteries.setEnabled(true);
                }
            }, 600);
        }
    }

    /* Open the Screen 2 banner and type an arbitrary message, leaving
       it open (used for the "fully charged" finale). */
    function showScreen2Message(text) {
        const q = document.getElementById("question-2");
        if (!q) return;
        const textEl = q.querySelector(".question__text");
        textEl.textContent = "";
        q.classList.add("is-open");
        window.setTimeout(function () {
            typewriter(textEl, text, TYPE_SPEED);
        }, 650); // after the unroll transition
    }

    window.Screen2Intro = {
        play: playScreen2Intro,
        showMessage: showScreen2Message,
    };
})();
