/* ===========================================================
   pause.js
   Central "pause the whole game when it isn't the active window".

   Triggers on BOTH:
     • visibilitychange → document.hidden  (switching browser tabs)
     • window blur / pagehide              (minimizing, alt-tab to another
                                            app, devtools focus, etc.)
   visibilitychange alone misses some minimize / focus-loss cases, so we
   listen to blur too. Resume only when the page is BOTH visible AND focused.

   On pause it FREEZES the whole game:
     • SFX.suspend()       — all audio (sfx + music); play() goes silent
     • pauses every <video> that was playing (resumes them after)
     • adds `is-paused` on <html> → CSS freezes all animations
     • FREEZES pending setTimeout/setInterval (the game-flow timers) and
       resumes them with their remaining time — so nothing advances while away.

   Loaded early (right after audio.js) so the timer shim is installed before
   any game module schedules a timer at runtime.
   =========================================================== */

(function (global) {
    "use strict";

    /* ---------- pausable setTimeout / setInterval shim ---------- */
    var realSetTimeout   = global.setTimeout.bind(global);
    var realClearTimeout = global.clearTimeout.bind(global);
    var realSetInterval  = global.setInterval.bind(global);
    var realClearInterval= global.clearInterval.bind(global);
    var now = function () { return Date.now(); };

    var timers = {};   // our id -> record
    var seq = 1;
    var timersPaused = false;

    function scheduleReal(rec) {
        rec.start = now();
        if (rec.kind === "interval") {
            rec.real = realSetInterval(function () {
                rec.start = now(); // each tick restarts the elapsed clock
                rec.fn.apply(null, rec.args);
            }, rec.delay);
        } else {
            rec.real = realSetTimeout(function () {
                delete timers[rec.id];
                rec.fn.apply(null, rec.args);
            }, rec.delay);
        }
    }

    function makeTimer(kind, fn, delay, args) {
        var id = seq++;
        var rec = { id: id, kind: kind, fn: (typeof fn === "function" ? fn : function () {}),
                    delay: +delay || 0, args: args };
        timers[id] = rec;
        if (timersPaused) { rec.remaining = rec.delay; rec.real = null; } // hold until resume
        else scheduleReal(rec);
        return id;
    }

    global.setTimeout = function (fn, delay) {
        return makeTimer("timeout", fn, delay, Array.prototype.slice.call(arguments, 2));
    };
    global.setInterval = function (fn, delay) {
        return makeTimer("interval", fn, delay, Array.prototype.slice.call(arguments, 2));
    };
    global.clearTimeout = function (id) {
        var rec = timers[id];
        if (rec) { if (rec.real != null) realClearTimeout(rec.real); delete timers[id]; }
        else realClearTimeout(id); // not one of ours (e.g. pre-shim / 3rd-party)
    };
    global.clearInterval = function (id) {
        var rec = timers[id];
        if (rec) { if (rec.real != null) realClearInterval(rec.real); delete timers[id]; }
        else realClearInterval(id);
    };

    function freezeTimers() {
        if (timersPaused) return;
        timersPaused = true;
        Object.keys(timers).forEach(function (id) {
            var rec = timers[id];
            if (rec.real == null) return;
            var elapsed = now() - rec.start;
            rec.remaining = Math.max(0, rec.delay - elapsed); // timeouts resume from here
            if (rec.kind === "interval") realClearInterval(rec.real);
            else realClearTimeout(rec.real);
            rec.real = null;
        });
    }

    function thawTimers() {
        if (!timersPaused) return;
        timersPaused = false;
        Object.keys(timers).forEach(function (id) {
            var rec = timers[id];
            if (rec.real != null) return;
            if (rec.kind === "interval") {
                scheduleReal(rec); // restart interval (phase reset — fine for this game)
            } else {
                rec.start = now();
                rec.delay = (rec.remaining != null ? rec.remaining : rec.delay);
                rec.real = realSetTimeout(function () {
                    delete timers[id];
                    rec.fn.apply(null, rec.args);
                }, rec.delay);
            }
        });
    }

    /* ---------- pause / resume ---------- */
    var paused = false;
    var resumeVideos = [];

    function videos() {
        return Array.prototype.slice.call(document.querySelectorAll("video"));
    }

    function pause() {
        if (paused) return;
        paused = true;
        freezeTimers();                                       // halt the game-flow timers
        document.documentElement.classList.add("is-paused");  // CSS freezes animations
        if (global.SFX && global.SFX.suspend) global.SFX.suspend();
        resumeVideos = [];
        videos().forEach(function (v) {
            if (!v.paused && !v.ended) { resumeVideos.push(v); try { v.pause(); } catch (e) {} }
        });
    }

    function resume() {
        if (!paused) return;
        if (document.hidden || !document.hasFocus()) return;  // only when truly back
        paused = false;
        document.documentElement.classList.remove("is-paused");
        if (global.SFX && global.SFX.resume) global.SFX.resume();
        resumeVideos.forEach(function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
        resumeVideos = [];
        thawTimers();                                         // resume timers with remaining time
    }

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) pause(); else resume();
    });
    global.addEventListener("blur", pause);     // minimize / alt-tab / focus loss
    global.addEventListener("focus", resume);   // back to the window
    global.addEventListener("pagehide", pause);

    if (document.hidden) pause(); // loaded while already hidden

    // Cancel every pending game-flow timer (timeouts AND intervals). Used when
    // HARD-jumping to a screen (e.g. the dev menu), so the screen we left can't
    // keep firing its queued `GameNav.show(...)` chain and flip us to a different
    // screen after we've already navigated away.
    function cancelAllTimers() {
        Object.keys(timers).forEach(function (id) {
            var rec = timers[id];
            if (rec.real != null) {
                if (rec.kind === "interval") realClearInterval(rec.real);
                else realClearTimeout(rec.real);
            }
            delete timers[id];
        });
    }

    global.GamePause = {
        pause: pause,
        resume: resume,
        isPaused: function () { return paused; },
        cancelAllTimers: cancelAllTimers
    };
})(window);
