/* ===========================================================
   concept.js
   Screen 4 — "These 2 parts make this whole."
   Fills the two small slots (the parts) and the big slot (the
   whole) with batteries, then runs a two-phase teaching animation
   synced to the prompt:
     Phase A ("These 2 parts"): the whole dims; the parts light up
       one battery at a time.
     Phase B ("make this whole."): the parts dim; the whole lights
       up at full opacity and the big slot glows green.
   Timings are placeholders for the eventual voice-over.
   =========================================================== */

(function (global) {
    "use strict";

    const DESIGN_W = 1920;
    const DESIGN_H = 1080;
    const SCALE = 0.82; // matches the placed-battery size used elsewhere

    const pctX = (px) => (px / DESIGN_W) * 100 + "%";
    const pctY = (px) => (px / DESIGN_H) * 100 + "%";

    // Battery groups (design px centres). Small slots = the parts;
    // big slot = the whole (blue row on top, yellow row below).
    const LAYOUT = [
        { color: "blue", count: 4, cx: 626.5, cy: 637.5, where: "small" }, // small-left
        { color: "yellow", count: 6, cx: 1306.5, cy: 636.5, where: "small" }, // small-right
        { color: "blue", count: 4, cx: 965.5, cy: 217, where: "big" }, // big top row
        { color: "yellow", count: 6, cx: 965.5, cy: 319, where: "big" }, // big bottom row
    ];

    const TYPE_SPEED = 45;
    const GLOW_STAGGER = 220; // ms between each part battery lighting up
    const PHASE_GAP = 900; // pause after the parts before the whole

    let built = false;
    let contentEl = null;
    let bigGlow = null;
    const smallBats = [];
    const bigBats = [];
    const timers = [];

    function clearTimers() {
        timers.forEach(global.clearTimeout);
        timers.length = 0;
    }
    function later(fn, ms) {
        timers.push(global.setTimeout(fn, ms));
    }

    function typewriter(el, text, speed) {
        el.textContent = "";
        let i = 0;
        (function tick() {
            if (i >= text.length) return;
            el.textContent += text.charAt(i);
            i += 1;
            later(tick, speed);
        })();
    }

    function makeGroup(g) {
        const el = document.createElement("div");
        el.className = "battery-group battery-group--" + g.color;
        el.style.left = pctX(g.cx);
        el.style.top = pctY(g.cy);
        el.style.transform = "translate(-50%, -50%) scale(" + SCALE + ")";
        el.style.pointerEvents = "none";
        const bats = [];
        for (let i = 0; i < g.count; i++) {
            const b = document.createElement("img");
            b.className = "battery battery--" + g.color;
            b.src = "assets/images/" + g.color + "_battery.png";
            b.alt = "";
            b.draggable = false;
            el.appendChild(b);
            bats.push(b);
        }
        return { el: el, bats: bats };
    }

    function build() {
        contentEl = document.getElementById("s4-content");
        if (!contentEl) return;
        bigGlow = document.querySelector("#screen-4 .slot-glow--big");
        LAYOUT.forEach(function (g) {
            const made = makeGroup(g);
            contentEl.appendChild(made.el);
            (g.where === "big" ? bigBats : smallBats).push.apply(
                g.where === "big" ? bigBats : smallBats,
                made.bats
            );
        });
        built = true;
    }

    function resetState() {
        smallBats.forEach(function (b) {
            b.classList.remove("is-dim", "is-glow");
        });
        bigBats.forEach(function (b) {
            b.classList.remove("is-glow");
            b.classList.add("is-dim");
        });
        if (bigGlow) bigGlow.classList.remove("is-charged");
    }

    function phaseParts() {
        // whole dims, parts light up one at a time
        bigBats.forEach(function (b) {
            b.classList.add("is-dim");
            b.classList.remove("is-glow");
        });
        smallBats.forEach(function (b, i) {
            b.classList.remove("is-dim");
            later(function () {
                b.classList.add("is-glow");
            }, i * GLOW_STAGGER);
        });
    }

    function phaseWhole() {
        smallBats.forEach(function (b) {
            b.classList.add("is-dim");
            b.classList.remove("is-glow");
        });
        bigBats.forEach(function (b) {
            b.classList.remove("is-dim");
            b.classList.add("is-glow");
        });
        if (bigGlow) bigGlow.classList.add("is-charged");
    }

    function play() {
        if (!built) build();
        if (!contentEl) return;
        clearTimers();

        const q = document.getElementById("question-4");
        const textEl = q ? q.querySelector(".question__text") : null;
        const full = textEl ? textEl.getAttribute("data-text") || "" : "";

        resetState();
        if (q) q.classList.remove("is-open");
        if (textEl) textEl.textContent = "";

        // Open the banner and type the prompt.
        later(function () {
            if (q) q.classList.add("is-open");
            later(function () {
                if (textEl) typewriter(textEl, full, TYPE_SPEED);
            }, 650);
        }, 150);

        // Phase A — "These 2 parts": parts glow one by one.
        later(phaseParts, 250);

        // Phase B — "make this whole.": the whole lights up.
        const phaseBAt = 250 + smallBats.length * GLOW_STAGGER + PHASE_GAP;
        later(phaseWhole, phaseBAt);
    }

    global.ConceptScreen = { play: play };
})(window);
