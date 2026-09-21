/* ===========================================================================
   main.js : the scene engine.

   Four scenes, numbered the way the page numbers them, so #scene=2 in the URL
   is the scene the topbar calls 2. Each scene file registers

     window.scenes.sceneN(root) -> { onEnter?, onLeave?, onNextKey?, onPrevKey? }

   onEnter RESETS the scene. A scene that was left half run comes back at its
   start, which is what a lecturer wants when they flip back to it.
   onLeave stops whatever the scene has running: every scene with a play button
   must clear its timer there.

   Hash routing is mandatory:

     #scene=3            deep link straight into a scene
     &theme=dark         force a theme for a screenshot, storage untouched
     &run                let a scene run its own steps for a screenshot, and
                         switch every animation off so a capture is never
                         caught mid flight
     &steps=12           how many steps &run takes, default 6
     &alpha=2            which step size button scene 3 and 4 start on, 1 to 3
     &test=midhop        scene 3 only: freeze the grasshopper at the top of its
                         arc, a state a plain screenshot cannot otherwise reach

   The last three are dev affordances for the headless screenshots, and the
   buttons stay the real interaction.
   =========================================================================== */

(function () {
  "use strict";

  var SCENE_TITLES = {
    1: "The ten houses",
    2: "Robbins-Monro, one house at a time",
    3: "Gradient descent, and the grasshopper",
    4: "One house a step against ten"
  };
  var FIRST = 1, LAST = 4;

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
    var alpha = h.match(/alpha=(\d+)/);
    var test = h.match(/test=([a-z]+)/);
    return {
      run: /[#&?]run\b/.test(h),
      instant: /[#&?]run\b/.test(h) || /[#&?]test=/.test(h),
      steps: steps ? parseInt(steps[1], 10) : 6,
      alphaIndex: alpha ? parseInt(alpha[1], 10) - 1 : 0,
      test: test ? test[1] : null
    };
  })();

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
    var old = sceneNodes[current];
    if (old) {
      if (sceneState[current] && sceneState[current].onLeave) sceneState[current].onLeave();
    }

    /* EVERY scene loses "active" here, and any fade in still waiting is
       cancelled. Removing it from the scene being left is not enough: the
       scenes are absolutely positioned on top of one another, and holding the
       right arrow down pages faster than the 20 ms fade, so the timer of a
       scene that was already left fired afterwards and put it back. Three
       scenes then sat drawn over each other on the stage. */
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
          node.innerHTML = '<div class="lead">Scene ' + idx + ": " + err.message + "</div>";
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
    var dots = document.querySelectorAll("#dots .dot");
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle("active", (i + FIRST) === idx);
    }
    document.getElementById("prev-btn").disabled = (idx === FIRST);
    document.getElementById("next-btn").disabled = (idx === LAST);
    writeHashScene(idx);
  }

  function handleNext() {
    var st = sceneState[current];
    if (st && st.onNextKey && st.onNextKey()) return;
    goTo(current + 1);
  }

  function handlePrev() {
    var st = sceneState[current];
    if (st && st.onPrevKey && st.onPrevKey()) return;
    goTo(current - 1);
  }

  function init() {
    Theme.init();
    document.getElementById("theme-toggle")
      .addEventListener("click", function () { Theme.toggle(); });

    var dotsEl = document.getElementById("dots");
    for (var n = FIRST; n <= LAST; n++) {
      (function (i) {
        var dot = document.createElement("button");
        dot.className = "dot";
        dot.type = "button";
        dot.title = SCENE_TITLES[i];
        dot.setAttribute("aria-label", "Scene " + i + ", " + SCENE_TITLES[i]);
        dot.addEventListener("click", function () { goTo(i); });
        dotsEl.appendChild(dot);
      })(n);
    }

    document.getElementById("prev-btn").addEventListener("click", handlePrev);
    document.getElementById("next-btn").addEventListener("click", handleNext);

    window.addEventListener("keydown", function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName || "")) return;
      if (e.key === "ArrowRight") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
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
