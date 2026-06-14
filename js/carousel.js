/* ===========================================================
   carousel.js
   The bot chooser — played as 4 levels within each PART of the game:
     • Part 1 (CHARGE): the low bots are shown; tap one, charge it,
       it dances (fixed). Four levels = all four low bots charged.
     • Part 2 (SPLIT):  the overcharged bots are shown; tap one, split
       it, it dances (fixed). Four levels = all four bots fixed.
   The active part is window.gamePart (1 = charge, 2 = split); each
   level fixes ONE bot and advances window.gameStage (1-4). Battery
   counts per level come from window.STAGES (main.js). After level 4
   of a part, main.js moves on to the next part (or the game ends).
   The bots are staged like Screen 1 (centre focal + side peeks +
   shadows) via the coverflow layout below.
   =========================================================== */

(function (global) {
    "use strict";

    let wired = false;
    let phase = "charge"; // "charge" (low bots) | "split" (overcharged bots)
    let lastFixed = null; // the bot just fixed — centred so it's seen dancing
    let hintShown = false; // one-time scroll hint at the first level of a part

    const CHARGED = {
        // low set
        orange: "assets/images/orange_bot_charged.webp",
        blue: "assets/images/blue_bot_charged.webp",
        purple: "assets/images/purple_bot_charged.webp",
        pink: "assets/images/pink_bot_charged.webp",
        // overcharged set (distinct colours)
        red: "assets/images/red_bot_charged.webp",
        green: "assets/images/green_bot_charged.webp",
        teal: "assets/images/teal_bot_charged.webp",
        yellow: "assets/images/yellow_bot_charged.webp",
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

    // Scroll one bot left (-1) / right (+1) — driven by the prev/next arrow
    // buttons, so desktop players (or kids who don't know to scroll) can browse.
    // Centres the neighbour of whichever bot is currently nearest the centre.
    function nudge(dir) {
        const t = track();
        if (!t) return;
        const vb = bots().filter(function (b) {
            return b.getBoundingClientRect().width > 0; // only this phase's bots
        });
        if (!vb.length) return;
        const tr = t.getBoundingClientRect();
        const cx = tr.left + tr.width / 2;
        let nearest = 0, best = Infinity;
        vb.forEach(function (b, i) {
            const r = b.getBoundingClientRect();
            const d = Math.abs(r.left + r.width / 2 - cx);
            if (d < best) { best = d; nearest = i; }
        });
        const target = vb[Math.max(0, Math.min(vb.length - 1, nearest + dir))];
        const to = target.offsetLeft - (t.clientWidth - target.offsetWidth) / 2;
        const car = document.getElementById("bot-carousel");
        if (car) car.classList.add("no-snap"); // let the tween run, snap can't fight it
        tweenScroll(t, to, 380, function () {
            if (car) car.classList.remove("no-snap");
            layout();
        });
    }

    function init() {
        const t = track();
        if (!t || wired) return;
        wired = true;
        bots().forEach(function (btn) {
            const img = btn.querySelector("img");
            if (img) img.dataset.orig = img.getAttribute("src"); // for reset()
            // Overheated steam rising off each overcharged bot's head.
            if (btn.dataset.state === "overcharged" && !btn.querySelector(".heat-steam")) {
                const steam = document.createElement("span");
                steam.className = "heat-steam";
                steam.setAttribute("aria-hidden", "true");
                steam.innerHTML = "<i></i><i></i><i></i><i></i><i></i>";
                btn.appendChild(steam);
            }
            btn.addEventListener("click", function () {
                select(btn);
            });
        });
        const prevBtn = document.getElementById("carousel-prev");
        const nextBtn = document.getElementById("carousel-next");
        if (prevBtn) prevBtn.addEventListener("click", function () { nudge(-1); });
        if (nextBtn) nextBtn.addEventListener("click", function () { nudge(1); });
        t.addEventListener("scroll", onScroll, { passive: true });
        global.addEventListener("resize", onScroll);
    }

    // Reset the chooser to a clean slate (called at the start of each part's
    // levels, and by the dev menu to jump in). Phase is set from gamePart in
    // enterChooser; here we just clear fixed/selected state and restore images.
    function reset() {
        lastFixed = null;
        hintShown = false; // replay the scroll hint at the new part's level 1
        bots().forEach(function (b) {
            b.classList.remove("is-fixed", "is-selected", "is-locked");
            const img = b.querySelector("img");
            if (img && img.dataset.orig) img.src = img.dataset.orig;
        });
    }

    // Smoothly tween a scroll container's scrollLeft. Progress is counted in
    // animation FRAMES (not performance.now) so it advances reliably; combined
    // with scroll-snap temporarily off, the pan runs smoothly.
    function tweenScroll(el, to, dur, done) {
        const from = el.scrollLeft;
        const steps = Math.max(1, Math.round(dur / 16));
        let i = 0;
        function step() {
            i += 1;
            const p = Math.min(1, i / steps);
            const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOut
            el.scrollLeft = from + (to - from) * e;
            if (p < 1) global.setTimeout(step, 16);
            else if (done) done();
        }
        global.setTimeout(step, 16);
    }

    // Hint at the start of the chooser: pan the row left→right→left and settle
    // in the centre (a few bots on each side), so the kid sees it scrolls.
    let hintRunning = false;
    function scrollHint(tries) {
        const t = track();
        tries = tries || 0;
        // wait until the row is laid out and actually overflows (scrollable)
        if (!t || t.clientWidth === 0 || t.scrollWidth <= t.clientWidth + 5) {
            if (tries < 12) global.setTimeout(function () { scrollHint(tries + 1); }, 150);
            return;
        }
        if (hintRunning) return;
        hintRunning = true;
        const max = t.scrollWidth - t.clientWidth;
        const center = Math.round(max / 2);
        const car = document.getElementById("bot-carousel");
        if (car) car.classList.add("no-snap"); // don't let snap fight the tween
        const legs = [0, max, center]; // left edge → right edge → centre
        let i = 0;
        (function next() {
            if (i >= legs.length) {
                if (car) car.classList.remove("no-snap");
                hintRunning = false;
                return;
            }
            tweenScroll(t, legs[i], 700, function () { i += 1; next(); });
        })();
    }

    function setPhase(p) {
        phase = p;
        const car = document.getElementById("bot-carousel");
        if (car) car.classList.toggle("phase-split", p === "split");
    }

    // Entered whenever Screen 1 shows in chooser mode. Presents the bots for
    // the current phase; if every level is done, completes the game.
    // centerFixed: bring the just-fixed (dancing) bot to the front instead of
    // the next selectable one — so the player sees their bot celebrating.
    function enterChooser(centerFixed) {
        const screen1 = document.getElementById("screen-1");
        if (screen1) screen1.classList.remove("is-choosing", "is-lit");
        bots().forEach(function (b) {
            b.classList.remove("is-selected");
        });

        if ((global.gameStage || 1) > 4) {
            if (global.showLevelTransition) global.showLevelTransition();
            return;
        }

        // The part decides which bots are shown: Part 1 charges the low bots,
        // Part 2 splits the overcharged ones.
        setPhase((global.gamePart === 2) ? "split" : "charge");

        // First level of the part: nudge the row so the kid sees it scrolls.
        if (!hintShown && (global.gameStage || 1) === 1) {
            hintShown = true;
            global.setTimeout(scrollHint, 900);
        }

        // Banner text per part, so the player knows what to do. Use the
        // cancellable Screen 1 typer so it can't be clobbered.
        const textEl = document.querySelector("#screen-1 .question__text");
        const msg = phase === "split"
            ? "Oh no! These bots are overcharged — tap one to fix it."
            : "Scroll and tap a bot to charge it.";
        if (window.Screen1Intro && window.Screen1Intro.setText) {
            window.Screen1Intro.setText(msg);
        } else if (textEl) {
            textEl.textContent = msg;
        }

        let focus = null;
        if (centerFixed && lastFixed) {
            focus = lastFixed; // show the just-fixed bot dancing in front
        } else {
            // otherwise bring the first still-broken bot of this phase to centre
            focus = bots().filter(function (b) {
                return b.dataset.state === wantState() && !b.classList.contains("is-fixed") && !b.classList.contains("is-locked");
            })[0];
        }
        if (focus) focus.scrollIntoView({ inline: "center", block: "nearest" });
        global.requestAnimationFrame(layout);
        global.setTimeout(layout, 60);
    }

    function select(btn) {
        // only the current phase's un-fixed, un-locked bots are tappable
        if (btn.dataset.state !== wantState() || btn.classList.contains("is-fixed") || btn.classList.contains("is-locked")) return;
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
    // bot fixed (charged image, dancing) and advance to the next level. Each
    // level fixes ONE bot, so every solve completes a level.
    function onFixed(scheme) {
        const btn = document.querySelector(
            '.carousel-bot[data-scheme="' + scheme + '"][data-state="' + wantState() + '"]'
        );
        if (btn) {
            btn.classList.add("is-fixed");
            btn.classList.remove("is-selected");
            const img = btn.querySelector("img");
            if (img && CHARGED[scheme]) img.src = CHARGED[scheme];
            lastFixed = btn; // centred next time the chooser shows
        }
        global.gameStage = (global.gameStage || 1) + 1;
        return { levelComplete: true };
    }

    global.BotChooser = {
        init: init,
        enterChooser: enterChooser,
        onFixed: onFixed,
        markFixed: onFixed, // back-compat alias
        reset: reset,
    };
    document.addEventListener("DOMContentLoaded", init);
})(window);
