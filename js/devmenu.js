/* ===========================================================
   devmenu.js  — TEMPORARY development tool
   A hamburger menu to jump straight to any screen while building,
   so you don't have to play through the whole game to test one bit.

   Self-contained: injects its own styles + DOM. To remove for
   production, delete this file and its <script> tag in index.html.
   =========================================================== */

(function (global) {
    "use strict";

    // Each entry: label + the action that shows/sets up that screen.
    // (Reuses the same entry points the deep-links / flow use.)
    const SCREENS = [
        { label: "1 · Choose bot (P1)", go: function () { nav("screen-1"); } },
        { label: "2 · Charge puzzle", go: function () { nav("screen-2"); call(global.Screen2Intro, "play"); } },
        { label: "3 · Charged bot", go: function () { nav("screen-3"); } },
        { label: "4 · Concept (parts → whole)", go: function () { nav("screen-4"); call(global.ConceptScreen, "play"); } },
        { label: "— Part 2 —", go: null },
        { label: "5 · Overcharged intro", go: function () { nav("screen-5"); call(global.Part2, "startIntro"); } },
        { label: "6 · Split puzzle", go: function () { nav("screen-6"); call(global.Part2, "startSplit"); } },
        { label: "7 · Fixed bot", go: function () { nav("screen-7"); } },
        { label: "8 · Concept (whole → parts)", go: function () { nav("screen-8"); call(global.Part2, "playConcept2"); } },
    ];

    function nav(id) {
        if (global.GameNav) global.GameNav.show(id);
    }
    function call(obj, method) {
        try {
            if (obj && typeof obj[method] === "function") obj[method]();
        } catch (e) {
            console.warn("[devmenu]", e);
        }
    }

    const CSS = [
        ".devmenu__toggle{position:fixed;top:10px;right:10px;z-index:99999;width:42px;height:42px;",
        "border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,20,24,.82);",
        "color:#fff;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;",
        "justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.4);}",
        ".devmenu__toggle:hover{background:rgba(40,40,48,.92);}",
        ".devmenu__panel{position:fixed;top:60px;right:10px;z-index:99999;width:230px;",
        "background:rgba(20,20,24,.94);border:1px solid rgba(255,255,255,.18);border-radius:10px;",
        "padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.5);display:none;font-family:system-ui,Arial,sans-serif;}",
        ".devmenu__panel.is-open{display:block;}",
        ".devmenu__title{color:#9aa;font-size:11px;letter-spacing:.5px;text-transform:uppercase;",
        "padding:4px 8px 8px;}",
        ".devmenu__panel button{display:block;width:100%;text-align:left;background:transparent;",
        "border:none;color:#eee;font-size:13px;padding:8px 10px;border-radius:7px;cursor:pointer;}",
        ".devmenu__panel button:hover{background:rgba(255,255,255,.10);}",
        ".devmenu__sep{color:#667;font-size:11px;padding:8px 10px 2px;pointer-events:none;}",
        ".devmenu__hint{color:#778;font-size:10px;padding:8px 10px 2px;border-top:1px solid rgba(255,255,255,.1);margin-top:6px;}",
    ].join("");

    function build() {
        const style = document.createElement("style");
        style.textContent = CSS;
        document.head.appendChild(style);

        const toggle = document.createElement("button");
        toggle.className = "devmenu__toggle";
        toggle.type = "button";
        toggle.title = "Dev: jump to screen";
        toggle.textContent = "☰"; // ☰

        const panel = document.createElement("div");
        panel.className = "devmenu__panel";

        const title = document.createElement("div");
        title.className = "devmenu__title";
        title.textContent = "Dev · go to screen";
        panel.appendChild(title);

        SCREENS.forEach(function (s) {
            if (!s.go) {
                const sep = document.createElement("div");
                sep.className = "devmenu__sep";
                sep.textContent = s.label;
                panel.appendChild(sep);
                return;
            }
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = s.label;
            b.addEventListener("click", function () {
                s.go();
                panel.classList.remove("is-open");
            });
            panel.appendChild(b);
        });

        const hint = document.createElement("div");
        hint.className = "devmenu__hint";
        hint.textContent = "Reload (F5) for a clean state.";
        panel.appendChild(hint);

        toggle.addEventListener("click", function () {
            panel.classList.toggle("is-open");
        });

        document.body.appendChild(toggle);
        document.body.appendChild(panel);
    }

    document.addEventListener("DOMContentLoaded", build);
})(window);
