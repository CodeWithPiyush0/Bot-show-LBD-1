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
                bat.src = "assets/images/" + g.color + "_battery.png";
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

    function moveGroupToBig(group) {
        freeSlotOf(group);
        group.dataset.location = "big";
        group.style.left = pctX(BIG_CX);
        group.style.top = pctY(BIG_ROW[group.dataset.color] || 268);
        setTransform(group, PLACED_SCALE);
    }

    function startCharge() {
        charged = true;
        const groups = [slotOccupant["small-left"], slotOccupant["small-right"]];

        // 1) current starts flowing up the traces
        if (chargeFx) chargeFx.classList.add("is-active");

        // 2) batteries travel up into the top slot
        global.setTimeout(function () {
            groups.forEach(function (g) {
                if (g) moveGroupToBig(g);
            });
        }, 500);

        // 3) top slot glows green, current settles to green
        global.setTimeout(function () {
            if (bigGlow) bigGlow.classList.add("is-charged");
            if (chargeFx) chargeFx.classList.add("is-green");
        }, 1400);
    }

    /* ---- ghost hint: demonstrate the drag a few times ---- */
    function buildGhost(color, count, cx, cy) {
        const g = document.createElement("div");
        g.className = "battery-group battery-group--" + color + " is-ghost";
        for (let i = 0; i < count; i++) {
            const bat = document.createElement("img");
            bat.className = "battery battery--" + color;
            bat.src = "assets/images/" + color + "_battery.png";
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
        if (!contentEl || charged) {
            enabled = true;
            return;
        }
        enabled = false;
        const fromX = GROUPS[0].cx; // blue tray centre
        const fromY = GROUPS[0].cy;
        const slot = SLOTS["small-left"];
        const toX = slot.x + slot.w / 2;
        const toY = slot.y + slot.h / 2;

        const ghost = buildGhost("blue", GROUPS[0].count, fromX, fromY);
        contentEl.appendChild(ghost);

        const MOVE = 1000;
        const HOLD = 250;
        const FADE = 300;
        const GAP = 250;
        const CYCLE = MOVE + HOLD + FADE + GAP;
        let n = 0;

        function cycle() {
            if (n >= 3) {
                ghost.remove();
                enabled = true;
                return;
            }
            n += 1;

            // reset to the tray (no transition)
            ghost.style.transition = "none";
            ghost.style.left = pctX(fromX);
            ghost.style.top = pctY(fromY);
            setTransform(ghost, 1);
            ghost.style.opacity = "0";
            void ghost.offsetWidth; // force reflow so the reset applies

            // fade in and glide to the slot
            ghost.style.transition =
                "left " + MOVE + "ms ease, top " + MOVE + "ms ease, transform " +
                MOVE + "ms ease, opacity 250ms ease";
            window.requestAnimationFrame(function () {
                ghost.style.opacity = "0.75";
                ghost.style.left = pctX(toX);
                ghost.style.top = pctY(toY);
                setTransform(ghost, PLACED_SCALE);
            });

            // fade out at the slot
            window.setTimeout(function () {
                ghost.style.transition = "opacity " + FADE + "ms ease";
                ghost.style.opacity = "0";
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

        createGroups(screen);
    }

    global.Batteries = {
        init: init,
        setEnabled: function (v) {
            enabled = !!v;
        },
        playHint: playHint,
    };
    document.addEventListener("DOMContentLoaded", init);
})(window);
