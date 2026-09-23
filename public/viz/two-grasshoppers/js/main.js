/* ===========================================================================
   main.js : the scene engine, and the frame that fits any window.

   Three scenes, numbered the way the page numbers them, so #scene=2 in the
   URL is the scene the topbar calls 2. Each scene file registers

     window.scenes.sceneN(root) -> { onEnter?, onLeave? }

   onEnter RESETS the scene. A scene that was left half run comes back at its
   start, which is what a lecturer wants when they flip back to it.
   onLeave stops whatever the scene has running: every scene with a Play
   button must clear its timer and cancel its animation there.

   Hash routing, and the dev flags that ride on it:

     #scene=3            deep link straight into a scene
     &theme=dark         force a theme for a screenshot, storage untouched
     &run                let the scene take its own steps before the capture,
                         with every animation switched off, so a capture is
                         never caught mid flight
     &steps=25           how many steps &run takes, default 6
     &test=midhop        freeze the grasshoppers at the top of the arc of the
                         next step (scenes 1 and 3)
     &test=morph         scene 3: freeze the next step half way through the
                         ground changing under both grasshoppers
     &norule             scene 2: start with the driving school curve hidden

   The flags are for the headless screenshots; the buttons stay the real
   interaction.

   THE FRAME. index.html lays everything out on a fixed 1280 by 720 box, #app,
   and fit() scales that box to the window and centres it. A 1920 by 1080
   projector gets the same picture one and a half times as large, and a laptop
   window that is a little short gets it a little smaller, with no scrolling
   anywhere.
   =========================================================================== */

(function () {
  "use strict";

  var SCENE_TITLES = {
    1: "One grasshopper",
    2: "Stopping distance",
    3: "Two grasshoppers"
  };
  var FIRST = 1, LAST = 3;
  var FRAME_W = 1280, FRAME_H = 720;

  var current = -1;
  var sceneNodes = {};
  var sceneState = {};
  /* The handle of the pending fade in. A scene is faded in 20 ms after it is
     entered, and the arrow key repeats faster than that when it is held down,
     so the timer has to be cancellable: see the note in goTo. */
  var fadeIn = null;

  function hashText() {
    return (window.location.hash || "") + (window.location.search || "");
  }

  window.Flags = (function () {
    var h = hashText();
    var steps = h.match(/steps=(\d+)/);
    var test = h.match(/test=([a-z]+)/);
    return {
      run: /[#&?]run\b/.test(h),
      instant: /[#&?]run\b/.test(h) || /[#&?]test=/.test(h),
      steps: steps ? parseInt(steps[1], 10) : 6,
      test: test ? test[1] : null,
      norule: /[#&?]norule\b/.test(h)
    };
  })();

  function fit() {
    var app = document.getElementById("app");
    var w = window.innerWidth, h = window.innerHeight;
    var s = Math.min(w / FRAME_W, h / FRAME_H);
    if (!(s > 0)) s = 1;
    var ox = Math.max(0, (w - FRAME_W * s) / 2);
    var oy = Math.max(0, (h - FRAME_H * s) / 2);
    app.style.transform = "translate(" + ox + "px," + oy + "px) scale(" + s + ")";
  }

  function readHashScene() {
    var m = (window.location.hash || "").match(/scene=(\d+)/);
    if (!m) return null;
    var n = parseInt(m[1], 10);
    return (n >= FIRST && n <= LAST) ? n : null;
  }

  function writeHashScene(idx) {
    var h = window.location.hash || "";
    var next = /scene=\d+/.test(h)
      ? h.replace(/scene=\d+/, "scene=" + idx)
      : (h ? h + "&scene=" + idx : "#scene=" + idx);
    if (next !== h) history.replaceState(null, "", next);
  }

  function goTo(idx) {
    if (idx < FIRST || idx > LAST || idx === current) return;

    var stage = document.getElementById("stage");
    if (sceneState[current] && sceneState[current].onLeave) sceneState[current].onLeave();

    /* EVERY scene loses "active" here, and any fade in still waiting is
       cancelled. Removing it from the scene being left is not enough: the
       scenes are absolutely positioned on top of one another, and holding the
       right arrow down pages faster than the 20 ms fade, so the timer of a
       scene that was already left fired afterwards and put it back. */
    if (fadeIn) { clearTimeout(fadeIn); fadeIn = null; }
    Object.keys(sceneNodes).forEach(function (k) {
      sceneNodes[k].classList.remove("active");
    });

    if (!sceneNodes[idx]) {
      var node = document.createElement("div");
      node.className = "scene";
      node.setAttribute("data-scene", idx);
      stage.appendChild(node);
      sceneNodes[idx] = node;
      var builder = window.scenes && window.scenes["scene" + idx];
      if (builder) {
        try {
          sceneState[idx] = builder(node) || {};
        } catch (err) {
          console.error("Scene " + idx + " builder threw:", err);
          node.textContent = "Scene " + idx + ": " + err.message;
        }
      }
    } else if (sceneState[idx] && sceneState[idx].onEnter) {
      sceneState[idx].onEnter();
    }

    current = idx;

    if (window.Flags.instant) {
      sceneNodes[idx].style.transition = "none";
      sceneNodes[idx].classList.add("active");
    } else {
      fadeIn = setTimeout(function () {
        fadeIn = null;
        sceneNodes[idx].classList.add("active");
      }, 20);
    }

    document.getElementById("scene-title").textContent = SCENE_TITLES[idx] || "";
    var dots = document.querySelectorAll("#dots .dot-btn");
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle("active", (i + FIRST) === idx);
    }
    document.getElementById("prev-btn").disabled = (idx === FIRST);
    document.getElementById("next-btn").disabled = (idx === LAST);
    writeHashScene(idx);
  }

  function init() {
    fit();
    window.addEventListener("resize", fit);

    Theme.init();
    document.getElementById("theme-toggle")
      .addEventListener("click", function () { Theme.toggle(); });

    var dotsEl = document.getElementById("dots");
    for (var n = FIRST; n <= LAST; n++) {
      (function (i) {
        var dot = document.createElement("button");
        dot.className = "dot-btn";
        dot.type = "button";
        dot.title = SCENE_TITLES[i];
        dot.setAttribute("aria-label", "Scene " + i + ", " + SCENE_TITLES[i]);
        dot.addEventListener("click", function () { goTo(i); });
        dotsEl.appendChild(dot);
      })(n);
    }

    document.getElementById("prev-btn").addEventListener("click", function () { goTo(current - 1); });
    document.getElementById("next-btn").addEventListener("click", function () { goTo(current + 1); });

    window.addEventListener("keydown", function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName || "")) return;
      if (e.key === "ArrowRight") goTo(current + 1);
      else if (e.key === "ArrowLeft") goTo(current - 1);
    });

    window.addEventListener("hashchange", function () {
      var n = readHashScene();
      if (n != null) goTo(n);
    });

    goTo(readHashScene() != null ? readHashScene() : FIRST);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SceneEngine = { goTo: goTo, current: function () { return current; } };
})();
