# Bot Show — Project Context

> Single source of truth for the project state. Read this first; you should
> rarely need to open every file. Update this file whenever behaviour,
> structure, coordinates, or assets change.

---

## 1. What this is

A browser **activity game for kids** ("Bot Show"). The player charges a robot's
batteries: pick the low-battery bot, go inside it, and drag battery groups into
slots until current flows and it powers up.

- **Stack:** vanilla **HTML + CSS + JS** only. No framework, no build step, no
  bundler, no npm deps. Just open `index.html`.
- **Must stay responsive** for **mobile, tablet, desktop**.
- Built to match a **Figma** design 1:1.

### Figma source
- File key: `q3XTxsSPlAaNxQJoqde0Gr` (file name "Bot-show"), page "LBD 1" (`30:91`).
- Design frame size: **1920 × 1080** (16:9). All coordinates below are in this space.
- Current screen node ids: **Screen 1 = `160:3467`**, **Screen 2 = `163:3`**
  (the doc has older duplicates `30:*`/`31:*` — ignore those; the `16x:*` set is current).
- Figma is reachable via the Figma MCP connector (design-to-code). The avatar/bot
  art was exported from here.

---

## 2. Folder structure

```
LBD-1/
├── index.html              # single entry; both screens live here
├── context.md              # THIS FILE
├── css/
│   ├── reset.css           # minimal reset; sets Rajdhani as base font
│   ├── main.css            # stage, letterbox, screen system, zoom transition
│   ├── screen.css          # Screen 1 (bots, spotlight, floor, question banner + intro) + shared .question/.question__avatar
│   ├── screen2.css         # Screen 2 (panel, slots, trays, batteries, charge fx, glow, content scaling)
│   ├── screen3.css         # Screen 3 (charged bot celebration)
│   ├── screen4.css         # Screen 4 (concept: 2 parts make a whole)
│   ├── part2.css           # PART TWO screens 5-8 (overcharged/split)
│   └── responsive.css      # breakpoint stubs (mostly empty — see §4)
├── js/
│   ├── navigation.js       # GameNav.show(screenId) — screen switching
│   ├── intro.js            # Screen 1 intro + Screen 2 intro (typewriter, banner open/close)
│   ├── batteries.js        # Screen 2 drag-drop, charge sequence, ghost hint, fully-charged finale
│   ├── concept.js          # Screen 4 (part/whole teaching animation) + auto-start Part 2
│   ├── part2.js            # PART TWO: intro, split puzzle, celebrate, concept (Screens 5-8)
│   └── main.js             # entry: orange-bot click → zoom in; exitBot (zoom out); Esc/#hash helpers
└── assets/
    ├── images/             # see §9
    └── videos/
        └── bite_talking.mp4  # talking mascot (720×480, 10s) — used as the live avatar
```

**Script load order (in `index.html`, all `defer`):** `navigation.js`, `intro.js`,
`batteries.js`, `main.js`. They communicate via globals: `window.GameNav`,
`window.Batteries`, `window.Screen2Intro`.

---

## 3. The stage & responsive system (`main.css`)

- `.game` fills the viewport, background = letterbox fill `#5a3624` (sampled from
  the BG.webp left/right edges, so bars blend with the art).
- `.game__screen` (id `stage`) is a **fixed 16:9 box** sized to the largest that
  fits: `width: min(100vw, 100dvh * 1920/1080)`. It is **not** CSS-scaled — it
  renders at real pixels, so **1 viewport px == 1 stage px** (important for drag math).
- The stage is a **container** (`container-type: size; container-name: stage`),
  so children use **`cqw`** units (1cqw = 1% of stage width = 19.2px at design size)
  for things that must scale — fonts, borders, glows.
- Element positions are **percentages of the 1920×1080 frame** (e.g. left = pxX/1920·100).

**Responsiveness comes for free:** the whole stage scales as one unit; everything
inside is in % / cqw, so mobile/tablet/desktop all work. `responsive.css` has
empty breakpoint stubs for future per-device tweaks (none needed so far).

---

## 4. Screen system & navigation

- Two screens: `<section class="screen screen--1 is-active" id="screen-1">` and
  `<section class="screen screen--2" id="screen-2">`, both inside the stage.
- Only `.is-active` is visible. **Inactive screens stay painted** (`opacity:0`,
  `pointer-events:none`, NOT `visibility:hidden`) so they're already rasterized —
  this was deliberate to avoid a paint stall during the zoom transition.
- `js/navigation.js`: `GameNav.show("screen-1" | "screen-2")` toggles `.is-active`.
- **Deep links:** `index.html#2` (or `#screen-2`) opens Screen 2 directly and plays
  its intro — handy for testing/sharing.
- **Esc** returns to Screen 1 (dev convenience, in `main.js`).

---

## 5. Screen 1 — choose the bot (`screen.css`)

Background = `BG.webp`. Contents:
- **Spotlight** `spotlight.svg` — full-height beam centered on the orange bot, z1.
- **Floor shadows + warm glow** — CSS radial-gradient `div`s (`.floor*`), recreated
  from Figma ellipses (those were blurred PNGs, not exported). z2/3.
- **Three bots** (`.bot`, sized by `width` %, positioned by Figma coords):
  - `.bot--purple` `Sahdow_Purple_Bot.webp` (note misspelled filename "Sahdow") — left, tallest, back.
  - `.bot--orange` `orange_bot.webp` — center, focal, z6, **clickable** → Screen 2.
  - `.bot--white-blue` `White_blue_bot.webp` — right, smallest, back.
  - Subtle `:hover` scale. `decoding="async"` was REMOVED from bots (it caused a
    headless paint race / intermittent missing bot).
- **Question banner** `.question` (see §7) with text **"Tap the bot to fix its batteries."**

---

## 6. Zoom-into-bot transition (`main.css` + `main.js`)

Clicking the orange bot (`enterBot()` in `main.js`) plays a smooth dive into the
bot's **chest battery icon** then Screen 2 emerges. Key facts (tuned for smoothness):
- `transform-origin: 49.6% 73%` on `.screen--1.is-zooming` = the chest battery icon.
- Screen 1 zooms `scale(1)→scale(4.2)` + fades, easing `cubic-bezier(0.42,0,1,1)`,
  0.75s. **Scale capped at 4.2** (higher, e.g. 11×, blew the GPU texture limit and
  caused a re-raster hitch — do not raise much).
- Screen 2 (`.is-entering`) enters `scale(2)→scale(1)` + fades, same transform-origin,
  0.72s, decelerate easing.
- **Handoff at ~380ms** (`main.js` setTimeout): Screen 1 reaches ~2× exactly when
  Screen 2 starts at 2× → seamless, scale-matched crossfade (no jump).
- Only `transform`/`opacity` animate (compositor-friendly). No blur (blur re-rasters).
- At ~1200ms: cleanup + `Screen2Intro.play()` is called.

---

## 7. Question banner (shared) + the live mascot video

Used on **both** screens (any template with dialogue). Markup:
```html
<div class="question" [id="question-2" on screen 2]>
  <img class="question__template" src="assets/images/Question_template.webp">
  <video class="question__avatar" src="assets/videos/bite_talking.mp4" muted loop autoplay playsinline></video>
  <p class="question__text" data-text="...the line..."></p>
</div>
```
- `Question_template.webp` = the cream banner art with a mascot badge baked in at
  the left. The banner is positioned by Figma coords (left 1.458%, top 4.167%,
  width 97.135%).
- **`.question__avatar`** (in `screen.css`) overlays the **`bite_talking.mp4`** video
  on the badge face (muted, looping) → the mascot looks alive and talks. This
  replaces the static face. Same for all dialogue templates.
- **`.question__text`**: Rajdhani **Bold**, color `#4f2b0f`, `font-size: 2.344cqw`
  (= 45px at design), positioned over the cream bar. Text is stored in `data-text`
  and starts empty (no flash); JS types it in.

### Open/close animation
- **Screen 1** (`screen.css`, scoped to `.screen--1`): on load the banner pops in
  showing **only the mascot** (clip-path), then **unrolls open** (`templateUnroll`),
  then `intro.js` **typewrites** the text (45ms/char) — triggered on the template's
  `animationend`.
- **Screen 2**: class-driven, controlled by `intro.js` `playScreen2Intro()`:
  - `.screen--2 .question__template` is clipped closed (mascot only) by default;
    adding `.is-open` transitions clip-path to fully open (and removing it closes).
  - Sequence: open → type **"Drag the batteries in a small slots."** → **brief hold
    `HOLD_AFTER_TEXT = 600`ms** → close to just the mascot → ghost hint (non-blocking;
    dragging is already enabled). Kept short so the player can drag almost immediately.
  - **VO TODO:** replace the 600ms hold with the audio's `ended` event when VO exists.

---

## 8. Screen 2 — inside the bot (`screen2.css` + `batteries.js`)

Background = dark radial gradient. Structure:
```
#screen-2
├── .s2-content (#s2-content)        # gameplay layer; scaled during the banner intro
│   ├── img.panel (battery_slots.svg)            # full circuit-board panel: border+slots+connectors
│   ├── img.slot-glow.slot-glow--big (Bigger_Slot.svg)  # green charged-glow overlay (hidden until charged)
│   ├── .slot.slot--big / --small-left / --small-right  # invisible drop-zones
│   ├── svg.charge-fx (#charge-fx)               # current-flow overlay (see charge seq)
│   ├── .tray.tray--blue / .tray--yellow         # CSS-built trays (nested rounded rects + accent + decorator tabs)
│   └── (battery groups injected here by JS)
└── .question (#question-2)          # banner (NOT scaled) — see §7
```

### Panel & slots
- `battery_slots.svg` (true vector, ~280KB) is the **whole panel** (1834×786) at
  Figma (43,40): the metallic border, the 3 slots, the orange connectors, decorators.
- Trays are **recreated in CSS** (the tray SVGs had the batteries baked in, so they
  couldn't be emptied). Blue accent `#96f2f7`, yellow accent `#f3e21f`, grey rim `#5f5e5e`.
- **Slot inner rects (design px), used for layout + drop centers:**
  - big: `{x:715, y:143, w:501, h:250}`
  - small-left: `{x:423, y:568, w:407, h:139}`
  - small-right: `{x:1103, y:567, w:407, h:139}`

### Batteries & drag-drop (`batteries.js`)
- Two **groups** (single draggable units, NOT individual batteries):
  - blue: 4 batteries, tray center `(506.5, 948.5)`
  - yellow: 6 batteries, tray center `(1413.5, 948.5)`
  - battery art = `blue_battery.png` / `yellow_battery.png` (62×100, transparent,
    exported isolated from Figma with `contentsOnly`). Single battery = `3.229cqw` wide.
- A group is positioned by its **center** (`left/top` %, `translate(-50%,-50%)`).
- **`PLACED_SCALE = 0.82`** — uniform battery size in **every** slot (sized so the
  6-yellow group fits the smallest slot; never overflows). Tray = scale 1.
- **Only the two bottom slots** (`small-left`, `small-right`) accept drops. The big
  (top) slot is the auto-charge destination, not a manual target.
- Drag = Pointer Events (mouse + touch). While dragging, full size; drop on a slot →
  snaps to slot center at `PLACED_SCALE`; drop elsewhere → animates home. Slot under
  pointer highlights (`.slot.is-hover`).
- Dragging is **gated** by `enabled` (Battery API). It's OFF during the Screen 2
  intro and ghost hint, then turned ON.

### Charge sequence (when BOTH bottom slots filled)
`startCharge()`:
1. Current flows up through the connectors — `#charge-fx` SVG overlay, paths trace
   the **exact connector centerlines**:
   - left diagonal `M653,560 L759,406`, right `M1264,560 L1166,405`, horizontal `M838,636 L1093,636`.
   - bright pulses travel (dash animation); they're the actual orange traces energizing.
2. (+500ms) both groups travel **up into the big slot** as two rows (blue top y217,
   yellow bottom y319, center x965.5), uniform `PLACED_SCALE`.
3. (+1400ms) `#charge-fx` turns **green** (`.is-green` → `.charge-glow` paths) and the
   **big slot glows green**.
- **Big-slot green glow**: NOT a box-shadow. It's `.slot-glow--big` = a
  **`Bigger_Slot.svg`** overlay sitting exactly on the big slot, with a green
  **`drop-shadow`** so the glow **hugs the slot's real rounded shape + tabs**.
  It pulses by fading the overlay's opacity (`slotGlowPulse`) while the orange slot
  underneath stays put. (This replaced an earlier boxy box-shadow that looked bad.)
- After charging, dragging is locked (`charged = true`).

### "Fully charged" finale (`fullyCharged()` in `batteries.js`, ~3.6s after charge starts)
Once the batteries are in the big slot and it's glowing green, the finale plays
(all animated, sequenced):
1. **Battery trays + their placeholder ghosts fade out** (`.tray`, `.tray-ghost`),
   then are `display:none`'d so nothing lingers.
2. **The board slides down** to fill the now-empty bottom — `.s2-content.is-charged-final`
   = `transform: translateY(15%)` (everything moves together, stays aligned).
3. **The banner re-opens** and types **"The bot is fully charged."** via
   `Screen2Intro.showMessage(text)` (opens, types, stays open).
4. **~3.2s after the finale starts** (a brief beat after the message — tune with VO),
   it transitions to **Screen 3** via `GameFx.exitBot()`
   — the **reverse** of the enter-zoom: we pull back OUT of the chest (same 49.6%/73%
   focal point), the interior recedes, and the whole charged bot is revealed shrinking
   from a chest close-up to normal size (`zoomOutOfBot` + `revealBot` in `main.css`).
> NOTE: the codebase has user edits around the charge sequence — e.g. the panel
> turns green via `.panel.is-green { filter: hue-rotate(110deg) }`, batteries do a
> FLIP-style travel into the big slot with low-opacity ghost trails, and there are
> `.panel--small-left/right/big` clip overlays. The `.tray-ghost` class on the
> permanent 20%-opacity tray placeholders is what the finale fades out.

### Screen 2 intro flow (the full on-enter sequence)
zoom inside → `.s2-content.is-compact` (content shrinks **and shifts down** so the
banner has a clear gap above the panel: `transform: translateY(10%) scale(0.85)`) →
banner opens + types prompt → holds 3.5s → banner closes to mascot + content grows
back to normal (smooth) → **ghost hint** demonstrates the drag **3×** (a translucent
blue group glides tray→small-left slot, `.is-ghost`) → dragging enabled.

---

## 8b. Screen 3 — the bot celebrates (`screen3.css`)

The end screen, shown after the finale. Same room background as Screen 1
(`var(--bg-image)` = BG.webp) + the `spotlight`, with the **charged bot centered**:
`.charged-bot` wraps `orange_bot_charged.webp` (placeholder — **swap for a dancing
video later**). It does a gentle CSS "dance" loop (`botDance`: bob + sway, pivot at
feet) while `.screen--3.is-active`. Markup is a `<section class="screen screen--3"
id="screen-3">` inside the stage; reached via `GameNav.show("screen-3")`.

---

## 8c. Screen 4 — concept "2 parts make a whole" (`screen4.css` + `concept.js`)

Reached ~3s after Screen 3 appears (the bot dances, then `GameNav.show("screen-4")`).
Uses the **charged (green) panel** look from Screen 2's end state — same layered
panel imgs (`panel is-green` + `panel--small-left/right` orange overlays +
`panel--big is-green`) — and `.s4-content { transform: translateY(14%) }` nudges the
board down so the whole panel clears the banner and is fully visible.
Dark interior bg + batteries in all three slots:
- **small-left** = 4 blue (part 1), **small-right** = 6 yellow (part 2),
- **big** = 4 blue (top row) + 6 yellow (bottom row) = the whole.
`concept.js` builds the battery groups (display-only, `SCALE 0.82`) and plays a
two-phase animation synced to the banner prompt **"These 2 parts make this whole."**:
- **Phase A ("These 2 parts")**: starts as the prompt begins typing; the big-slot
  batteries dim to 20% (`.battery.is-dim`); the two **part SLOTS glow one by one**
  (`.slot-glow--small-left` then `--small-right`, `SLOT_GLOW_STAGGER` apart;
  Smaller_Slot.svg overlays). The batteries themselves do NOT glow.
- **Phase B ("make this whole.")**: the part-slot glows turn off + their batteries dim;
  the big-slot batteries go full opacity and the big slot glows green
  (`.slot-glow--big.is-charged`).
Phase timings are **placeholders for the VO** (`SLOT_GLOW_STAGGER`, `PHASE_GAP` in concept.js).
`.screen--4 .battery.is-dim` is scoped so Screen 2 is unaffected. Deep-link: `index.html#4`.

---

## 8d. PART TWO — fixing overcharged bots (`part2.css` + `part2.js`)

The inverse of Part One: bots are **overcharged** (the whole is too full), and the
child **splits** the whole into two parts. Starts **automatically** after Part One's
Screen 4 concept finishes (`concept.js` → `GameNav.show("screen-5")` + `Part2.startIntro()`).

Screens (continue the `screen--N` numbering; deep-links `#5`–`#8`):
- **Screen 5** (`screen--5`, intro): room bg + 3 bots in a `.s5-stage` wrapper
  (left `purple_bot.webp`, centre overcharged `White_purple_bot.webp`, right
  `orange_bot_charged.webp`). Three-phase choreography (in `Part2.startIntro`):
  **A** all bots equally lit (spotlight hidden) — "Oh no! A few bots have overcharged.";
  **B** spotlight fades in on centre + sides darken (`.screen--5.is-spotlit`) — "Let's
  start fixing this bot."; **C** side bots fade out (`.is-gone`) + the scene zooms in a
  little (`.s5-stage.is-focusing` scale 1.4, origin 50.7%/70%) — "Let us split its
  batteries." Tapping the centre bot (`enterFromFocus`) continues that zoom into Screen 6.
  The banner (sibling of `.s5-stage`) is NOT scaled by the little zoom.
  - The **spotlight sweeps** onto the centre bot like a real stage light: it pivots at
    its top (`transform-origin:50% 0`) from `rotate(-20deg)` → `0`, fading in fast so the
    movement reads.
  - The purple (left) bot's "!" overcharge mark is baked into `purple_bot.webp`
    (528×621 source). The center bot's mark is likewise part of `White_purple_bot.webp`.
- **Screen 6** (`screen--6`, split puzzle): the **big slot starts FULL** (blue row +
  yellow row, green `panel--big is-green`); small slots empty. Banner prompts "Drag the
  batteries to the small slots." then closes; the player drags each group **big → small**.
  When **both small slots are filled**, `onFixed()` shows "This bot is fixed." then
  **zooms OUT** to Screen 7. (Same drag pattern as Part 1, reversed direction.)
- **Screen 7** (`screen--7`, celebrate): `White_purple_bot_charged.webp` dances under
  the spotlight (reuses `.charged-bot`/`botDance`). After ~3s → Screen 8.
- **Screen 8** (`screen--8`, concept): "This whole is made of these 2 parts." — the
  **inverse** of Screen 4: Phase A "This whole" → big slot glows; Phase B "…2 parts" →
  the two part slots glow one by one. Reuses `.s4-content`, glows, battery layout.

All Part-2 logic is in `part2.js` (`Part2.startIntro/startSplit/playConcept2`), styles in
`part2.css` (scoped `.screen--5/6/7/8`, reusing all shared components + the zoom keyframes).
Timings are VO-placeholders. **No new assets needed** (uses existing webp).

---

## 9. Assets (`assets/images/`)

**Load performance:** initial payload was trimmed from ~2.9 MB to ~0.5 MB on first
paint:
- The avatar video `bite_talking.mp4` was re-encoded 1.3 MB → ~63 KB (it shows at ~110px).
- `battery_slots*.svg` panels → `.webp` (~280K → ~60K each).
- **Deferred loading:** heavy images that never appear on Screen 1 (Part-2 bots, panels,
  slot art) use `data-src` instead of `src`; `main.js` swaps them to `src` on
  `window.load` (after first paint). So Screen 1 shows fast and the rest streams in.
- **Unused source files** (the original `.svg`/`BG.png`, trays, etc.) were moved to a
  top-level `_source/` folder — exclude it from deploy. `assets/` is now ~1.5 MB.
  NOTE: `blue_battery.png`/`yellow_battery.png` are referenced **dynamically** in JS
  (`color + "_battery.png"`) — keep them even though static scans flag them as unused.

**Performance history (important):** the original "SVG" bot/banner files were huge
**raster images wrapped in SVG** (Screen 1 alone was ~8.7MB and loaded slowly when
deployed). They were re-encoded to **WebP** at display resolution (~95% smaller).
**Use the `.webp` versions** for raster art. The originals (`.svg`/`.png`) are kept
but unused — they bloat the deploy upload (~17MB) and can be removed if desired.

| In use | Asset | Notes |
|---|---|---|
| ✅ | `BG.webp` | Screen 1 background (was BG.png 1.8MB → 41KB) |
| ✅ | `Question_template.webp` | cream banner + mascot badge (both screens) |
| ✅ | `Sahdow_Purple_Bot.webp` / `orange_bot.webp` / `White_blue_bot.webp` | Screen 1 bots |
| ✅ | `White_purple_bot.webp` (overcharged) / `White_purple_bot_charged.webp` (fixed) | Part 2 centre bot |
| ✅ | `purple_bot.webp` / `orange_bot_charged.webp` | Part 2 Screen 5 side bots |
| ✅ | `battery_slots.webp` / `battery_slots_white.webp` | panels — converted from SVG (~280K→~60K each) for load speed |
| ✅ | `Bigger_Slot.svg` | **true vector** — big-slot green-glow overlay |
| ✅ | `spotlight.svg` | true vector (1KB) |
| ✅ | `blue_battery.png` / `yellow_battery.png` | 62×100 transparent battery art |
| ✅ | `bite_talking.mp4` | live mascot avatar video — re-encoded small (384px, ~63K) since it shows at ~110px |
| ⚠️ unused | `screen2_avatar.png` | old static avatar; replaced by the video |
| ⚠️ unused | `Blue_tray.svg` / `Yellow_tray.svg` | trays are now CSS (had batteries baked in) |
| ⚠️ unused | `slots.svg`, `Smaller_Slot.svg`, `Closed_Question_template.*`, `*_charged.*`, all original `.svg`/`BG.png` | not referenced (kept for future / source) |

To re-convert raster→WebP later: `sharp` was used in a temp `.build/` dir (now deleted).

---

## 10. JS public API (globals)

```js
GameNav.show(screenId)                 // "screen-1" | "screen-2"
Batteries.init()                        // auto-runs on DOMContentLoaded
Batteries.setEnabled(bool)              // gate drag interaction
Batteries.playHint()                    // run the 3× ghost drag demo, then enable
Screen2Intro.play()                     // open banner → type → hold → close → hint
Screen2Intro.showMessage(text)          // open banner, type `text`, leave open (finale message)
GameFx.exitBot()                        // Screen 2 -> 3 reverse (zoom-out) transition (4.2x mirror)
ConceptScreen.play()                    // Screen 4 part/whole teaching animation
```

Key tunables:
- `intro.js`: `TYPE_SPEED = 45` (ms/char), `HOLD_AFTER_TEXT = 3500` (banner open hold).
- `batteries.js`: `PLACED_SCALE = 0.82`, `GROUPS`, `SLOTS`, `BIG_ROW`, hint timings.
- `main.js`: zoom handoff `380`ms, cleanup `1200`ms.

---

## 11. Coordinate quick-reference (1920×1080 design px)

| Thing | x | y | w | h |
|---|---|---|---|---|
| Question template | 28 | 45 | 1865 | 145 |
| Orange bot | 729 | 422 | 449 | 619 |
| Purple bot | 137 | 336 | 478 | 621 |
| White-blue bot | 1327 | 417 | 356 | 542 |
| Panel (Main container) | 43 | 40 | 1834 | 786 |
| Big slot (inner) | 715 | 143 | 501 | 250 |
| Small slot L (inner) | 423 | 568 | 407 | 139 |
| Small slot R (inner) | 1103 | 567 | 407 | 139 |
| Battery trays band | 181 | 860 | 1558 | 177 |

Convert to CSS: `left% = x/1920*100`, `top% = y/1080*100`, `width% = w/1920*100`.

---

## 11b. Dev menu (TEMPORARY)

`js/devmenu.js` adds a ☰ hamburger (top-right) that opens a list to jump to any
screen (Part 1 & 2) and trigger its animation — for testing without playing through.
Self-contained (injects its own CSS/DOM). **Remove for production:** delete the file
and its `<script src="js/devmenu.js">` tag in index.html. Reload for a clean state
(jumps don't cancel a previous screen's pending timers).

---

## 12. Previewing / testing

- Just open `index.html` in a browser.
- `index.html#2` → jump straight to Screen 2 (plays its intro). Esc → back to Screen 1.
- Headless screenshots (used during dev), Windows + Edge:
  ```
  msedge --headless --disable-gpu --no-sandbox --autoplay-policy=no-user-gesture-required ^
    --user-data-dir=%TEMP%\p --window-size=1600,900 --virtual-time-budget=3000 ^
    --screenshot=out.png "file:///F:/CG Game/Bot-show/LBD-1/index.html"
  ```
  Note: with the autoplaying `<video>`, virtual-time capture desyncs animation timing
  slightly (video uses real time) — trust the code ordering over a single frame.

---

## 13. Open questions / TODO

- **VO:** swap `HOLD_AFTER_TEXT` (3500ms) for the voice-over audio's `ended` event
  when audio is provided, so banners stay open exactly as long as the VO.
- **After charging:** the "fully charged" finale now plays (trays out, board slides
  down, banner says "The bot is fully charged."). Could chain to a next screen from here.
- **Ghost hint** currently only demos blue→small-left; could also demo yellow→small-right.
- **Bottom slots** don't get the green SVG glow (only the top slot does) — by request,
  but could be extended.
- **Game rules:** drops are currently free (any group → either bottom slot). No
  color→slot validation / win check beyond "both bottom slots filled".
- **Cleanup:** unused original assets (§9) can be deleted to slim the deploy.

---

## 14. Conventions

- Clean, modular structure: one `index.html`, CSS split by screen/function, JS split
  by function. Match existing naming (BEM-ish: `.question__template`, `.bot--orange`).
- All new positioned elements: use Figma coords as % of 1920×1080; use `cqw` for
  sizes/borders/glows that must scale.
- Prefer `transform`/`opacity` for animation (smooth). Avoid animating `filter: blur`
  or scaling layers beyond ~4–5× (raster hitches).
