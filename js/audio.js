/* ===========================================================
   audio.js
   SFX manager. Plays short sound effects on game events.

   Reliability: each sound keeps a small POOL of pre-loaded
   <audio> elements that are reused round-robin. (The earlier
   version cloned a template per play, which re-loaded the file
   each time → dropped/delayed sounds. Pools fix that.) Pools use
   the media loader, so they work from file:// AND http with no
   fetch/CORS issues.

   Usage:
     SFX.play("uiTap")                    // one-shot
     SFX.play("place", {volume: 0.6})     // quieter one-shot
     SFX.play("electricity", {loop:true}) ... SFX.stop("electricity")
     SFX.toggleMute()                     // also bound to the "M" key

   Autoplay: browsers block sound until the first user gesture.
   The first sound is the Play-button tap (inside a click handler),
   which unlocks audio for the rest of the session.
   =========================================================== */

(function (global) {
    "use strict";

    var BASE = "assets/audios/";

    // logical event name -> filename in assets/audios/
    var FILES = {
        uiTap:       "tap.mp3",                                           // Play btn, bot tap, next-level btn, Bite wrist-tap
        bannerOpen:  "pop.mp3",                                           // a speech banner unrolls open
        pickup:      "Pick_Up_Battery.mp3",                              // grab a battery group
        place:       "pop.mp3",                                           // battery group snaps into a slot
        spotlight:   "spotlight.mp3",                                     // stage spotlight falls on a bot
        electricity: "electricity.mp3",                                  // charge current crackles (loops)
        energy:      "Energy Travelling.mp3",                            // batteries travel up into the slot
        powerUp:     "pwlpl-power-up-game-sound-effect-359227.mp3",      // slot turns green / charged
        ready:       "soundshelfstudio-ui-hyperdrive-ready-ping-537581.mp3", // concept slot-glow ping
        success:     "universfield-happy-message-ping-351298.mp3",       // a bot is fixed
        oneScroll:   "one_scroll.mp3",                                   // carousel crosses ONE bot (played per bot)
        fullScroll:  "full_scroll.mp3",                                  // bots slide in after the Bite clip
        zoom:        "zoom.mp3",                                          // whoosh diving INTO / OUT of a bot
        flying:      "flying.mp3",                                        // Bite flies in (your-turn clip), synced to playback
        reject:      "reject.mp3",                                        // "wrong!" buzz (Part 1 big slot)
        celebrate:   "celebrate.mp3",                                    // cheer when a fixed bot dances (stopped by next curtain)
        type:        "one_type.mp3",                                     // per-character typewriter tick
        curtain:     "level.mp3",                                         // theatre-curtain swish on every transition
        bgMusic:     "bg_music.mp3",                                     // (available; not auto-played)

        // ---- WANTED: drop a file with this name into assets/audios/ ----
        win:         "win.mp3"                                            // (extra) fanfare on Part/Game complete
    };

    // How many overlapping copies each sound can play at once. Rapid sounds
    // (per-character typing, snaps, scroll ticks) need more; rare ones need few.
    var POOL_DEFAULT = 4;
    var POOL = {
        type: 12, place: 6, pickup: 6, oneScroll: 8, ready: 6, uiTap: 6,
        bannerOpen: 4, spotlight: 3, zoom: 3, reject: 3, flying: 2,
        success: 2, powerUp: 2, energy: 2, fullScroll: 2, curtain: 2,
        celebrate: 2, win: 2, electricity: 1, bgMusic: 1
    };

    var MASTER = 0.85;                 // overall volume
    var PER = {                        // per-sound volume trims (× MASTER)
        type: 0.5, ready: 0.6, place: 0.7, energy: 0.7, electricity: 0.55,
        oneScroll: 0.85, fullScroll: 0.85, bgMusic: 0.35
    };

    var pools = {};                    // name -> [Audio]
    var idx = {};                      // name -> round-robin cursor
    var loopEls = {};                  // name -> the looping Audio (so it can be stopped)
    var muted = false;
    var unavailable = {};              // names whose file failed to load (avoid retry spam)

    function url(name) { return BASE + encodeURI(FILES[name]); }
    function poolSize(name) { return POOL[name] || POOL_DEFAULT; }

    function ensure(name) {
        if (!FILES[name] || unavailable[name]) return null;
        if (!pools[name]) {
            var arr = [];
            for (var i = 0; i < poolSize(name); i++) {
                var a = new Audio(url(name));
                a.preload = "auto";
                a.addEventListener("error", function () { unavailable[name] = true; });
                arr.push(a);
            }
            pools[name] = arr;
            idx[name] = -1;
        }
        return pools[name];
    }

    function vol(name, override) {
        var b = (override == null) ? (PER[name] == null ? 1 : PER[name]) : override;
        return Math.max(0, Math.min(1, MASTER * b));
    }

    function play(name, opts) {
        opts = opts || {};
        if (muted) return null;
        var arr = ensure(name);
        if (!arr) return null;

        if (opts.loop) {
            stop(name);                // one loop per name at a time
            var le = arr[0];
            le.loop = true;
            le.volume = vol(name, opts.volume);
            try { le.currentTime = 0; } catch (e) {}
            loopEls[name] = le;
            var pl = le.play();
            if (pl && pl.catch) pl.catch(function () {});
            return le;
        }

        // round-robin a free-ish element (reused elements are pre-loaded, so
        // playback is immediate — no per-play file load)
        var i = idx[name] = (idx[name] + 1) % arr.length;
        var a = arr[i];
        try { a.currentTime = 0; } catch (e) {}
        a.volume = vol(name, opts.volume);
        var p = a.play();
        if (p && p.catch) p.catch(function () {});
        return a;
    }

    function stop(name) {
        var arr = pools[name];
        if (arr) arr.forEach(function (a) {
            try { a.pause(); a.currentTime = 0; a.loop = false; } catch (e) {}
        });
        delete loopEls[name];
    }

    function stopAll() { Object.keys(pools).forEach(stop); }

    function setMuted(m) {
        muted = !!m;
        if (muted) stopAll();
    }
    function toggleMute() { setMuted(!muted); return muted; }

    // "M" toggles mute during play (handy for testing / demos).
    global.addEventListener("keydown", function (e) {
        if (e.key === "m" || e.key === "M") toggleMute();
    });

    // Pre-build every pool so the first time a sound is needed it's already
    // loaded (no first-play delay). Runs after the start screen is up.
    function preload() {
        Object.keys(FILES).forEach(function (name) { ensure(name); });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", preload);
    } else {
        preload();
    }

    global.SFX = {
        play: play,
        stop: stop,
        stopAll: stopAll,
        setMuted: setMuted,
        toggleMute: toggleMute,
        isMuted: function () { return muted; },
        FILES: FILES
    };
})(window);
