/* ===========================================================
   batteries.js
   Screen 2 mechanic:
   - Drag a whole battery GROUP (all blue / all yellow) into one
     of the two BOTTOM slots.
   - Batteries are a uniform size in every slot (PLACED_SCALE).
   - When BOTH bottom slots are filled, a current animation flows
     up to the top slot, both groups travel up into it, and the
     top slot glows green.

   Geometry is in the 1920 x 1080 design space, mapped to % of the
   stage (which renders at real pixel size, so 1 viewport px ==
   1 stage px while dragging).
   =========================================================== */

(function (global) {
    "use strict";

    const DESIGN_W = 1920;
    const DESIGN_H = 1080;

    const BAT_W = 62;
    const BAT_H = 100;
    const GROUP_GAP = 12;

    // Uniform battery scale once a group sits in any slot.
    // Chosen so the largest group (6 yellow) fits the smallest slot.
    const PLACED_SCALE = 0.82;

    // Groups: count + the centre of their tray (absolute design px).
    const GROUPS = [
        { color: "blue", count: 4, cx: 506.5, cy: 948.5 },
        { color: "yellow", count: 6, cx: 1413.5, cy: 948.5 },
    ];

    // Slot inner recesses (absolute design px).
    const SLOTS = {
        big: { x: 715, y: 143, w: 501, h: 250 },
        "small-left": { x: 423, y: 568, w: 407, h: 139 },
        "small-right": { x: 1103, y: 567, w: 407, h: 139 },
    };

    // Only the two bottom slots accept player drops.
    const DROPPABLE = ["small-left", "small-right"];

    // Final resting rows inside the big (top) slot after charging.
    const BIG_CX = 965.5;
    const BIG_ROW = { blue: 217, yellow: 319 };

    const pctX = (px) => (px / DESIGN_W) * 100 + "%";
    const pctY = (px) => (px / DESIGN_H) * 100 + "%";

    let stage = null;
    let chargeFx = null;
    let bigGlow = null;
    let charged = false;
    let enabled = true; // dragging is gated off during the Screen 2 intro
    let contentEl = null;
    const slotEls = {};
    const slotOccupant = {};

    function groupWidth(count) {
        return count * BAT_W + (count - 1) * GROUP_GAP;
    }

    function setTransform(group, scale) {
        group.dataset.scale = scale;
        group.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
    }

    function createGroups(screen) {
        GROUPS.forEach((g) => {
            // Create a permanent 20% opacity ghost in the tray
            const ghostGroup = document.createElement("div");
            ghostGroup.className = "battery-group battery-group--" + g.color + " tray-ghost";
            ghostGroup.style.opacity = "0.2";
            ghostGroup.style.pointerEvents = "none";
            ghostGroup.style.zIndex = "5";
            for (let i = 0; i < g.count; i++) {
                const bat = document.createElement("img");
                bat.className = "battery battery--" + g.color;
                bat.src = "assets/images/" + g.color + "_battery.svg";
                bat.alt = "";
                bat.draggable = false;
                ghostGroup.appendChild(bat);
            }
            ghostGroup.style.left = pctX(g.cx);
            ghostGroup.style.top = pctY(g.cy);
            setTransform(ghostGroup, 1);
            (contentEl || screen).appendChild(ghostGroup);

            const group = document.createElement("div");
            group.className = "battery-group battery-group--" + g.color;
            group.dataset.color = g.color;
            group.dataset.nativeW = groupWidth(g.count);
            group.dataset.homeX = g.cx;
            group.dataset.homeY = g.cy;
            group.dataset.location = "tray";

            for (let i = 0; i < g.count; i++) {
                const bat = document.createElement("img");
                bat.className = "battery battery--" + g.color;
                bat.src = "assets/images/" + g.color + "_battery.svg";
                bat.alt = g.color + " battery";
                bat.draggable = false;
                group.appendChild(bat);
            }

            group.style.left = pctX(g.cx);
            group.style.top = pctY(g.cy);
            setTransform(group, 1);

            (contentEl || screen).appendChild(group);
            attachDrag(group);
        });
    }

    function freeSlotOf(group) {
        const prev = group.dataset.location;
        if (prev && prev !== "tray" && slotOccupant[prev] === group) {
            slotOccupant[prev] = null;
        }
    }

    function sendHome(group) {
        freeSlotOf(group);
        group.dataset.location = "tray";
        group.style.left = pctX(parseFloat(group.dataset.homeX));
        group.style.top = pctY(parseFloat(group.dataset.homeY));
        setTransform(group, 1);
    }

    function placeInSlot(group, id) {
        freeSlotOf(group);
        if (slotOccupant[id] && slotOccupant[id] !== group) {
            sendHome(slotOccupant[id]);
        }
        slotOccupant[id] = group;
        group.dataset.location = id;
        const r = SLOTS[id];
        group.style.left = pctX(r.x + r.w / 2);
        group.style.top = pctY(r.y + r.h / 2);
        setTransform(group, PLACED_SCALE);
    }

    /* ---- the charge sequence ---- */
    function bothBottomFilled() {
        return slotOccupant["small-left"] && slotOccupant["small-right"];
    }

    function moveGroupToBig(group, delay) {
        const prevSlot = group.dataset.location;
        let startRects = [];
        for (let i = 0; i < group.children.length; i++) {
            startRects.push(group.children[i].getBoundingClientRect());
        }

        if (prevSlot && prevSlot !== "tray" && SLOTS[prevSlot]) {
            const slotData = SLOTS[prevSlot];
            const ghost = document.createElement("div");
            ghost.className = "battery-group battery-group--" + group.dataset.color;
            ghost.style.opacity = "0.2";
            ghost.style.pointerEvents = "none";
            ghost.style.zIndex = "5";
            for (let i = 0; i < group.children.length; i++) {
                const bat = document.createElement("img");
                bat.className = "battery battery--" + group.dataset.color;
                bat.src = "assets/images/" + group.dataset.color + "_battery.svg";
                bat.alt = "";
                bat.draggable = false;
                ghost.appendChild(bat);
            }
            ghost.style.left = pctX(slotData.x + slotData.w / 2);
            ghost.style.top = pctY(slotData.y + slotData.h / 2);
            setTransform(ghost, PLACED_SCALE);
            contentEl.appendChild(ghost);
        }

        freeSlotOf(group);
        group.dataset.location = "big";
        group.style.transition = "none";
        group.style.left = pctX(BIG_CX);
        group.style.top = pctY(BIG_ROW[group.dataset.color] || 268);
        setTransform(group, PLACED_SCALE);

        for (let i = 0; i < group.children.length; i++) {
            group.children[i].style.opacity = "0";
            group.children[i].style.transition = "opacity 0.2s ease";
        }

        global.requestAnimationFrame(() => {
            let endRects = [];
            for (let i = 0; i < group.children.length; i++) {
                endRects.push(group.children[i].getBoundingClientRect());
            }

            for (let i = 0; i < group.children.length; i++) {
                const bat = document.createElement("img");
                bat.className = "battery battery--" + group.dataset.color;
                bat.src = "assets/images/" + group.dataset.color + "_battery.svg";
                bat.style.position = "fixed";
                bat.style.left = startRects[i].left + "px";
                bat.style.top = startRects[i].top + "px";
                bat.style.width = startRects[i].width + "px";
                bat.style.height = startRects[i].height + "px";
                bat.style.zIndex = "100";
                bat.style.transition = "left 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)";
                document.body.appendChild(bat);

                global.setTimeout(() => {
                    bat.style.left = endRects[i].left + "px";
                    bat.style.top = endRects[i].top + "px";
                    
                    global.setTimeout(() => {
                        bat.remove();
                        group.children[i].style.opacity = "1";
                    }, 600);
                }, delay + i * 150);
            }
        });
    }

    function startCharge() {
        charged = true;
        abortHint();
        const groups = [slotOccupant["small-left"], slotOccupant["small-right"]];

        if (bigGlow) bigGlow.classList.remove("is-charged");
        if (chargeFx) {
            chargeFx.style.display = "block";
            void chargeFx.offsetWidth;
            chargeFx.classList.add("is-flowing");
            chargeFx.classList.add("is-active");
        }

        // 1) move batteries up
        global.setTimeout(function () {
            let delay = 0;
            for (let id of ["small-left", "small-right"]) {
                const group = slotOccupant[id];
                if (group) {
                    moveGroupToBig(group, delay);
                    delay += group.children.length * 150;
                }
            }
        }, 200);

        // 3) top slot glows green, current settles to green, only big slot portion turns green
        global.setTimeout(function () {
            if (bigGlow) bigGlow.classList.add("is-charged");
            if (chargeFx) chargeFx.classList.add("is-green");
            const panelBig = document.querySelector(".panel--big");
            if (panelBig) panelBig.classList.add("is-green");
        }, 2000);

        // 4) finale: trays slide away, the board moves down to fill the
        //    gap, and the banner announces the bot is fully charged.
        global.setTimeout(fullyCharged, 3600);
    }

    /* ---- finale: bot fully charged ---- */
    function fullyCharged() {
        // Fade out the trays and their placeholder ghosts.
        const fadeOut = document.querySelectorAll(
            "#s2-content .tray, #s2-content .tray-ghost"
        );
        fadeOut.forEach(function (el) {
            el.style.transition = "opacity 0.5s ease";
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
        });
        // Once faded, fully hide them so nothing lingers.
        global.setTimeout(function () {
            fadeOut.forEach(function (el) {
                el.style.display = "none";
            });
        }, 550);

        // Slide the whole board down to fill the bottom gap.
        global.setTimeout(function () {
            if (contentEl) contentEl.classList.add("is-charged-final");
        }, 250);

        // Once it has settled, open the banner with the message.
        global.setTimeout(function () {
            if (window.Screen2Intro && window.Screen2Intro.showMessage) {
                window.Screen2Intro.showMessage("The bot is fully charged.");
            }
        }, 900);

        // Shortly after the message, continue.
        global.setTimeout(function () {
            if (window.currentLevel === 2) {
                // L2: the player already learned the concept — skip the concept
                // screen, just reveal the celebrating bot then go to Part 2.
                if (window.GameFx && window.GameFx.exitBot) {
                    window.GameFx.exitBot();
                } else if (window.GameNav) {
                    window.GameNav.show("screen-3");
                }
                global.setTimeout(function () {
                    if (window.GameNav) window.GameNav.show("screen-5");
                    if (window.Part2) window.Part2.startIntro();
                }, 4300); // reveal settle (~1300) + dance (~3000)
            } else {
                // L1 (tutorial): stay inside the bot and teach the concept
                // (Screen 4); concept.js then zooms out to reveal the dance.
                if (window.GameNav) window.GameNav.show("screen-4");
                if (window.ConceptScreen) window.ConceptScreen.play();
            }
        }, 3200);
    }

    /* ---- ghost hint: demonstrate the drag a few times ---- */
    let hintActive = false;
    let hintGhost = null;

    function abortHint() {
        hintActive = false;
        if (hintGhost) {
            hintGhost.remove();
            hintGhost = null;
        }
    }

    function buildGhost(color, count, cx, cy) {
        const g = document.createElement("div");
        g.className = "battery-group battery-group--" + color + " is-ghost";
        for (let i = 0; i < count; i++) {
            const bat = document.createElement("img");
            bat.className = "battery battery--" + color;
            bat.src = "assets/images/" + color + "_battery.svg";
            bat.alt = "";
            bat.draggable = false;
            g.appendChild(bat);
        }
        g.style.left = pctX(cx);
        g.style.top = pctY(cy);
        setTransform(g, 1);
        return g;
    }

    function playHint() {
        // L2: no demo — the player drags on their own. Just enable dragging.
        if (!contentEl || charged || window.currentLevel === 2) {
            enabled = true;
            return;
        }
        enabled = true; // allow dragging during hint
        hintActive = true;
        const fromX = GROUPS[0].cx; // blue tray centre
        const fromY = GROUPS[0].cy;
        const slot = SLOTS["small-left"];
        const toX = slot.x + slot.w / 2;
        const toY = slot.y + slot.h / 2;

        hintGhost = buildGhost("blue", GROUPS[0].count, fromX, fromY);
        contentEl.appendChild(hintGhost);

        const MOVE = 1000;
        const HOLD = 250;
        const FADE = 300;
        const GAP = 250;
        const CYCLE = MOVE + HOLD + FADE + GAP;
        let n = 0;

        function cycle() {
            if (!hintActive) return;
            if (n >= 3) {
                abortHint();
                return;
            }
            n += 1;

            // reset to the tray (no transition)
            hintGhost.style.transition = "none";
            hintGhost.style.left = pctX(fromX);
            hintGhost.style.top = pctY(fromY);
            setTransform(hintGhost, 1);
            hintGhost.style.opacity = "0";
            void hintGhost.offsetWidth; // force reflow so the reset applies

            // fade in and glide to the slot
            hintGhost.style.transition =
                "left " + MOVE + "ms ease, top " + MOVE + "ms ease, transform " +
                MOVE + "ms ease, opacity 250ms ease";
            window.requestAnimationFrame(function () {
                if (!hintActive) return;
                hintGhost.style.opacity = "0.3";
                hintGhost.style.left = pctX(toX);
                hintGhost.style.top = pctY(toY);
                setTransform(hintGhost, PLACED_SCALE);
            });

            // fade out at the slot
            window.setTimeout(function () {
                if (!hintActive) return;
                hintGhost.style.transition = "opacity " + FADE + "ms ease";
                hintGhost.style.opacity = "0";
            }, MOVE + HOLD);

            window.setTimeout(cycle, CYCLE);
        }
        cycle();
    }

    function slotAtPoint(clientX, clientY) {
        for (let i = 0; i < DROPPABLE.length; i++) {
            const id = DROPPABLE[i];
            const el = slotEls[id];
            if (!el) continue;
            const r = el.getBoundingClientRect();
            if (
                clientX >= r.left &&
                clientX <= r.right &&
                clientY >= r.top &&
                clientY <= r.bottom
            ) {
                return id;
            }
        }
        return null;
    }

    function clearHover() {
        DROPPABLE.forEach(function (id) {
            if (slotEls[id]) slotEls[id].classList.remove("is-hover");
        });
    }

    function attachDrag(group) {
        let startX = 0;
        let startY = 0;
        let baseLeftPct = 0;
        let baseTopPct = 0;
        let stageRect = null;
        let dragging = false;

        group.addEventListener("pointerdown", (e) => {
            if (hintActive) abortHint();
            if (charged || !enabled) return; // locked after charging / during intro
            e.preventDefault();
            dragging = true;
            stageRect = stage.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            baseLeftPct = parseFloat(group.style.left);
            baseTopPct = parseFloat(group.style.top);
            group.classList.add("is-dragging");
            setTransform(group, 1); // full size while dragging
            group.setPointerCapture(e.pointerId);
        });

        group.addEventListener("pointermove", (e) => {
            if (!dragging) return;
            const dxPct = ((e.clientX - startX) / stageRect.width) * 100;
            const dyPct = ((e.clientY - startY) / stageRect.height) * 100;
            group.style.left = baseLeftPct + dxPct + "%";
            group.style.top = baseTopPct + dyPct + "%";

            clearHover();
            const id = slotAtPoint(e.clientX, e.clientY);
            if (id) slotEls[id].classList.add("is-hover");
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            group.classList.remove("is-dragging");
            clearHover();
            const id = slotAtPoint(e.clientX, e.clientY);
            if (id) {
                placeInSlot(group, id);
                if (bothBottomFilled() && !charged) startCharge();
            } else {
                sendHome(group);
            }
        }

        group.addEventListener("pointerup", endDrag);
        group.addEventListener("pointercancel", endDrag);
    }

    function setupBatteries() {
        if (!contentEl) return;

        // Clear existing groups and ghosts
        const oldGroups = contentEl.querySelectorAll(".battery-group, .tray-ghost");
        oldGroups.forEach(el => el.remove());

        // Set counts based on level
        GROUPS[0].count = (window.currentLevel === 2) ? 6 : 4;
        GROUPS[1].count = 6; // Always 6 yellow

        // Reset slot occupancies
        DROPPABLE.forEach((id) => {
            slotOccupant[id] = null;
        });
        slotOccupant["big"] = null;

        // Recreate the groups and ghosts
        createGroups(contentEl);

        // Reset state variables
        charged = false;
        enabled = false;

        // Reset elements class lists
        contentEl.classList.remove("is-charged-final");
        const panel = document.querySelector(".panel");
        if (panel) panel.classList.remove("is-green");
        const panelBig = document.querySelector(".panel--big");
        if (panelBig) panelBig.classList.remove("is-green");
        if (bigGlow) bigGlow.classList.remove("is-charged");
        if (chargeFx) {
            chargeFx.classList.remove("is-flowing", "is-active", "is-green");
            chargeFx.style.display = "none";
        }

        // Reset tray and ghost styles
        const trays = contentEl.querySelectorAll(".tray");
        trays.forEach(tray => {
            tray.style.opacity = "";
            tray.style.display = "";
            tray.style.pointerEvents = "";
            tray.style.transition = "";
        });
    }

    function init() {
        stage = document.getElementById("stage");
        const screen = document.getElementById("screen-2");
        if (!stage || !screen) return;

        chargeFx = document.getElementById("charge-fx");
        contentEl = document.getElementById("s2-content");
        bigGlow = document.querySelector(".slot-glow--big");

        document.querySelectorAll("#screen-2 .slot").forEach((el) => {
            const id = el.dataset.slot;
            slotEls[id] = el;
            slotOccupant[id] = null;
        });

        setupBatteries();
    }

    global.Batteries = {
        init: init,
        setup: setupBatteries,
        setEnabled: function (v) {
            enabled = !!v;
        },
        playHint: playHint,
    };
    document.addEventListener("DOMContentLoaded", init);
})(window);
