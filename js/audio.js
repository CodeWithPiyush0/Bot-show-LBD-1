/* ===========================================================
   audio.js
   Tiny SFX manager for the game. Plays short sound effects on
   game events. Each logical event name maps to a file in
   assets/audios/. Missing files simply no-op (nothing crashes),
   so you can drop in the "WANTED" sounds below at any time and
   they'll start playing automatically.

   Usage:
     SFX.play("uiTap")                 // one-shot
     SFX.play("place", {volume: 0.6})  // quieter one-shot
     SFX.play("electricity",{loop:true}) ... SFX.stop("electricity")
     SFX.toggleMute()                  // also bound to the "M" key

   NOTE on autoplay: browsers block sound until the first user
   gesture. The first sound is the Play-button tap (inside a click
   handler), which unlocks audio for the rest of the session.
   =========================================================== */

(function (global) {
    "use strict";

    var BASE = "assets/audios/";

    // logical event name -> filename in assets/audios/
    // ---- ALREADY IN THE FOLDER (wired now) ----
    var FILES = {
        uiTap:       "tap.mp3",                                           // button / arrow / bot taps
        bannerOpen:  "pop.mp3",                                           // a speech banner unrolls open
        pickup:      "Pick_Up_Battery.mp3",                              // grab a battery group
        place:       "pop.mp3",                                           // battery group snaps into a slot
        spotlight:   "spotlight.mp3",                                     // stage spotlight falls on a bot
        electricity: "electricity.mp3",                                  // charge current crackles (loops)
        energy:      "Energy Travelling.mp3",                            // batteries travel up into the slot
        powerUp:     "pwlpl-power-up-game-sound-effect-359227.mp3",      // slot turns green / charged
        ready:       "soundshelfstudio-ui-hyperdrive-ready-ping-537581.mp3", // concept slot-glow ping
        success:     "universfield-happy-message-ping-351298.mp3",       // a bot is fixed
        levelDone:   "level.mp3",                                         // a level's curtain transition

        // ---- WANTED: drop a file with these names into assets/audios/ ----
        // (filenames are just suggestions — if you name them differently,
        //  tell me and I'll update this map.)
        zoom:        "zoom.mp3",       // whoosh when diving INTO / OUT of a bot
        curtain:     "curtain.mp3",    // theatre-curtain swish on scene changes
        reject:      "reject.mp3",     // "wrong!" buzz when a battery hits the big slot (Part 1)
        celebrate:   "celebrate.mp3",  // cheer / applause when a bot is fixed and dances
        win:         "win.mp3",        // bigger fanfare on Part Complete / All Bots Fixed
        type:        "type.mp3"        // (optional) soft typewriter tick while text types
    };

    var MASTER = 0.85;                 // overall volume
    var PER = { type: 0.25, ready: 0.6, place: 0.7, energy: 0.7, electricity: 0.55 }; // per-sound trims

    var bases = {};                    // name -> template Audio (cloned per play)
    var loops = {};                    // name -> currently-looping Audio
    var muted = false;
    var unavailable = {};              // names whose file failed to load (avoid retry spam)

    function template(name) {
        if (!FILES[name] || unavailable[name]) return null;
        if (!bases[name]) {
            var a = new Audio(BASE + FILES[name]);
            a.preload = "auto";
            a.addEventListener("error", function () { unavailable[name] = true; });
            bases[name] = a;
        }
        return bases[name];
    }

    function vol(name, override) {
        var base = (override == null) ? (PER[name] == null ? 1 : PER[name]) : override;
        return Math.max(0, Math.min(1, MASTER * base));
    }

    function play(name, opts) {
        opts = opts || {};
        if (muted) return null;
        var t = template(name);
        if (!t) return null;
        var a = t.cloneNode(true);     // clone so rapid repeats overlap
        a.volume = vol(name, opts.volume);
        if (opts.loop) {
            a.loop = true;
            stop(name);                // only one loop per name
            loops[name] = a;
        }
        var p = a.play();
        if (p && p.catch) p.catch(function () {}); // ignore autoplay/abort errors
        return a;
    }

    function stop(name) {
        var a = loops[name];
        if (a) {
            try { a.pause(); a.currentTime = 0; } catch (e) {}
            delete loops[name];
        }
    }

    function stopAll() {
        Object.keys(loops).forEach(stop);
    }

    function setMuted(m) {
        muted = !!m;
        if (muted) stopAll();
    }
    function toggleMute() { setMuted(!muted); return muted; }

    // "M" toggles mute during play (handy for testing / demos).
    global.addEventListener("keydown", function (e) {
        if (e.key === "m" || e.key === "M") toggleMute();
    });

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
