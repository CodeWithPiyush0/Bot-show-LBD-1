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
        { label: "0 · Start (Pre-LBD)", go: function () { nav("screen-pre"); } },
        { label: "— Tutorial —", go: null },
        { label: "Choose bot (3 bots)", go: function () { setLvl(1); nav("screen-1"); call(global.Screen1Intro, "play"); } },
        { label: "Charge puzzle", go: function () { setLvl(1); nav("screen-2"); call(global.Screen2Intro, "play"); } },
        { label: "Charged bot (dance)", go: function () { setLvl(1); nav("screen-3"); } },
        { label: "Concept · 2 parts → whole", go: function () { setLvl(1); nav("screen-4"); call(global.ConceptScreen, "play"); } },
        { label: "Overcharged intro", go: function () { setLvl(1); nav("screen-5"); call(global.Part2, "startIntro"); } },
        { label: "Split puzzle", go: function () { setLvl(1); nav("screen-6"); call(global.Part2, "startSplit"); } },
        { label: "Fixed bot (dance)", go: function () { setLvl(1); nav("screen-7"); } },
        { label: "Concept · whole → 2 parts", go: function () { setLvl(1); nav("screen-8"); call(global.Part2, "playConcept2"); } },
        { label: "— Levels 1-4 (chooser) —", go: null },
        { label: "Chooser · charge phase", go: function () { chooser(1, false); } },
        { label: "Chooser · split phase", go: function () { chooser(1, true); } },
        { label: "Charge puzzle (L1 counts)", go: function () { chooserPuzzle(1, 1, "blue"); } },
        { label: "Split puzzle (L1 counts)", go: function () { chooserPuzzle(1, 2, "orange"); } },
        { label: "Level-complete curtain", go: function () { if (global.playCurtain) global.playCurtain("Level 1 Complete!", "Get ready for Level 2…", function () { chooser(2, false); }); } },
        { label: "— Test a level's counts —", go: null },
        { label: "Level 1 counts", go: function () { chooser(1, false); } },
        { label: "Level 2 counts", go: function () { chooser(2, false); } },
        { label: "Level 3 counts", go: function () { chooser(3, false); } },
        { label: "Level 4 counts", go: function () { chooser(4, false); } },
    ];

    // Jump into the chooser at a given level (1-4); splitPhase shows the
    // overcharged bots (simulates having just charged one).
    function chooser(stage, splitPhase) {
        setLvl(2);
        global.gameStage = stage;
        if (global.BotChooser && global.BotChooser.reset) global.BotChooser.reset();
        nav("screen-1");
        call(global.Screen1Intro, "play");
        if (splitPhase) {
            global.setTimeout(function () {
                global.currentScheme = "orange";
                if (global.BotChooser) {
                    global.BotChooser.onFixed("orange"); // charge a low bot → split phase
                    global.BotChooser.enterChooser(false);
                }
            }, 450);
        }
    }

    // Jump straight into a chooser-level puzzle (part 1 = charge, 2 = split).
    function chooserPuzzle(stage, part, scheme) {
        setLvl(2);
        global.gameStage = stage;
        global.currentScheme = scheme;
        if (part === 2) {
            if (global.setPanelScheme) global.setPanelScheme(["screen-6", "screen-8"], scheme);
            nav("screen-6");
            call(global.Part2, "startSplit");
        } else {
            if (global.setPanelScheme) global.setPanelScheme(["screen-2", "screen-4"], scheme);
            nav("screen-2");
            call(global.Screen2Intro, "play");
        }
    }

    function setLvl(lvl) {
        if (global.setupLevel) global.setupLevel(lvl);
    }

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
        ".devmenu__toggle{position:fixed;top:10px;left:10px;z-index:99999;width:42px;height:42px;",
        "border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,20,24,.82);",
        "color:#fff;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;",
        "justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.4);}",
        ".devmenu__toggle:hover{background:rgba(40,40,48,.92);}",
        ".devmenu__panel{position:fixed;top:60px;left:10px;z-index:99999;width:230px;",
        "background:rgba(20,20,24,.94);border:1px solid rgba(255,255,255,.18);border-radius:10px;",
        "padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.5);display:none;font-family:system-ui,Arial,sans-serif;",
        "max-height:calc(100vh - 72px);overflow-y:auto;overscroll-behavior:contain;}",
        ".devmenu__panel{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.3) transparent;}",
        ".devmenu__panel::-webkit-scrollbar{width:8px;}",
        ".devmenu__panel::-webkit-scrollbar-thumb{background:rgba(255,255,255,.25);border-radius:4px;}",
        ".devmenu__panel.is-open{display:block;}",
        ".devmenu__title{color:#9aa;font-size:11px;letter-spacing:.5px;text-transform:uppercase;",
        "padding:4px 8px 8px;}",
        ".devmenu__panel button{display:block;width:100%;text-align:left;background:transparent;",
        "border:none;color:#eee;font-size:13px;padding:8px 10px;border-radius:7px;cursor:pointer;}",
        ".devmenu__panel button:hover{background:rgba(255,255,255,.10);}",
        ".devmenu__sep{color:#667;font-size:11px;padding:8px 10px 2px;pointer-events:none;}",
        ".devmenu__hint{color:#778;font-size:10px;padding:8px 10px 2px;border-top:1px solid rgba(255,255,255,.1);margin-top:6px;}",
        ".devmenu__tip{position:fixed;top:18px;left:62px;z-index:99999;background:rgba(20,20,24,.92);",
        "color:#eee;font-family:system-ui,Arial,sans-serif;font-size:12px;padding:6px 10px;border-radius:7px;",
        "white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .18s ease;box-shadow:0 2px 8px rgba(0,0,0,.4);}",
        ".devmenu__tip::after{content:'';position:absolute;top:11px;left:-5px;width:10px;height:10px;",
        "background:rgba(20,20,24,.92);transform:rotate(45deg);}",
        ".devmenu__toggle:hover + .devmenu__tip,.devmenu__tip.is-show{opacity:1;}",
    ].join("");

    function build() {
        const style = document.createElement("style");
        style.textContent = CSS;
        document.head.appendChild(style);

        const toggle = document.createElement("button");
        toggle.className = "devmenu__toggle";
        toggle.type = "button";
        toggle.title = "Use this to jump to any screen";
        toggle.textContent = "☰"; // ☰

        const tip = document.createElement("div");
        tip.className = "devmenu__tip";
        tip.textContent = "Use this to jump to any screen";

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
        document.body.appendChild(tip);
        document.body.appendChild(panel);

        // Briefly reveal the tooltip on load so it's discoverable.
        tip.classList.add("is-show");
        window.setTimeout(function () {
            tip.classList.remove("is-show");
        }, 3000);
    }

    document.addEventListener("DOMContentLoaded", build);
})(window);
