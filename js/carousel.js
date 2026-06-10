/* ===========================================================
   carousel.js
   L2+ bot chooser, played as 4 levels (after the Tutorial). Each
   level fixes TWO different bots in two phases:
     1. CHARGE phase — the low bots are shown; tap one, charge it
        (Part 1), it dances (fixed).
     2. SPLIT phase  — the overcharged bots appear highlighted; tap
        one, split it (Part 2), it dances (fixed). Level complete.
   Battery counts per level come from window.STAGES (main.js); the
   level index is window.gameStage (1-4). After level 4 -> complete.
   The bots are staged like Screen 1 (centre focal + side peeks +
   shadows) via the coverflow layout below.
   =========================================================== */

(function (global) {
    "use strict";

    let wired = false;
    let phase = "charge"; // "charge" (low bots) | "split" (overcharged bots)

    const CHARGED = {
        orange: "assets/images/orange_bot_charged.webp",
        blue: "assets/images/blue_bot_charged.webp",
        purple: "assets/images/purple_bot_charged.webp",
        pink: "assets/images/pink_bot_charged.webp",
    };

    function track() {
        return document.getElementById("bot-carousel-track");
    }
    function bots() {
        const t = track();
        return t ? Array.prototype.slice.call(t.querySelectorAll(".carousel-bot")) : [];
    }
    function wantState() {
        return phase === "charge" ? "low" : "overcharged";
    }

    /* ---------- coverflow depth (centre big & front, sides small & back) ---------- */
    let rafPending = false;
    function layout() {
        const t = track();
        if (!t || t.clientWidth === 0) return;
        const tr = t.getBoundingClientRect();
        const cx = tr.left + tr.width / 2;
        bots().forEach(function (b) {
            const r = b.getBoundingClientRect();
            if (r.width === 0) return; // hidden this phase
            const bc = r.left + r.width / 2;
            const norm = Math.min(1, Math.abs(bc - cx) / (tr.width * 0.42));
            const scale = 1 - norm * 0.4;
            const lift = -norm * 11;
            b.style.transform = "scale(" + scale.toFixed(3) + ") translateY(" + lift.toFixed(1) + "%)";
            b.style.zIndex = String(100 - Math.round(norm * 100));
            b.classList.toggle("is-centered", norm < 0.18);
        });
    }
    function onScroll() {
        if (rafPending) return;
        rafPending = true;
        global.requestAnimationFrame(function () {
            rafPending = false;
            layout();
        });
    }

    function init() {
        const t = track();
        if (!t || wired) return;
        wired = true;
        bots().forEach(function (btn) {
            btn.addEventListener("click", function () {
                select(btn);
            });
        });
        t.addEventListener("scroll", onScroll, { passive: true });
        global.addEventListener("resize", onScroll);
    }

    function setPhase(p) {
        phase = p;
        const car = document.getElementById("bot-carousel");
        if (car) car.classList.toggle("phase-split", p === "split");
    }

    // Entered whenever Screen 1 shows in chooser mode. Presents the bots for
    // the current phase; if every level is done, completes the game.
    function enterChooser() {
        const screen1 = document.getElementById("screen-1");
        if (screen1) screen1.classList.remove("is-choosing", "is-lit");
        bots().forEach(function (b) {
            b.classList.remove("is-selected");
        });

        if ((global.gameStage || 1) > 4) {
            if (global.showLevelTransition) global.showLevelTransition();
            return;
        }

        setPhase(phase);
        // bring the first still-broken bot of this phase to centre
        const avail = bots().filter(function (b) {
            return b.dataset.state === wantState() && !b.classList.contains("is-fixed");
        });
        if (avail[0]) avail[0].scrollIntoView({ inline: "center", block: "nearest" });
        global.requestAnimationFrame(layout);
        global.setTimeout(layout, 60);
    }

    function select(btn) {
        // only the current phase's un-fixed bots are tappable
        if (btn.dataset.state !== wantState() || btn.classList.contains("is-fixed")) return;
        const screen1 = document.getElementById("screen-1");
        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        bots().forEach(function (b) {
            b.classList.toggle("is-selected", b === btn);
        });
        // the spotlight falls on it
        global.setTimeout(function () {
            if (screen1) screen1.classList.add("is-choosing", "is-lit");
        }, 350);
        // then enter the matching puzzle (charge = Part 1, split = Part 2)
        global.setTimeout(function () {
            if (global.chooseBotEnter) {
                global.chooseBotEnter(btn.dataset.scheme, phase === "charge" ? "1" : "2");
            }
        }, 1300);
    }

    // Called (via main.js returnToChooser) once a puzzle is solved: mark that
    // bot fixed (charged image, dancing) and advance the phase / level.
    function onFixed(scheme) {
        const btn = document.querySelector(
            '.carousel-bot[data-scheme="' + scheme + '"][data-state="' + wantState() + '"]'
        );
        if (btn) {
            btn.classList.add("is-fixed");
            btn.classList.remove("is-selected");
            const img = btn.querySelector("img");
            if (img && CHARGED[scheme]) img.src = CHARGED[scheme];
        }
        if (phase === "charge") {
            phase = "split"; // same level, now fix an overcharged bot
            return { levelComplete: false };
        }
        // split bot fixed → both bots of the level done → next level
        phase = "charge";
        global.gameStage = (global.gameStage || 1) + 1;
        return { levelComplete: true };
    }

    global.BotChooser = {
        init: init,
        enterChooser: enterChooser,
        onFixed: onFixed,
        markFixed: onFixed, // back-compat alias
    };
    document.addEventListener("DOMContentLoaded", init);
})(window);
