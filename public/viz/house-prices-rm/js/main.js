/* ===========================================================================
   main.js : the scene engine.

   Two scenes, numbered the way the page numbers them, so #scene=2 in the URL
   is the scene the topbar calls 2. Each scene file registers

     window.scenes.sceneN(root) -> { onEnter?, onLeave?, onNextKey?, onPrevKey? }

   onEnter RESETS the scene. A scene that was left half run comes back at its
   start, which is what a lecturer wants when they flip back to it.
   onLeave stops whatever the scene has running: every scene with a play button
   must clear its timer there.

   Hash routing is mandatory:

     #scene=2            deep link straight into a scene
     &theme=dark         force a theme for a screenshot, storage untouched
     &run                let a scene run its own steps for a screenshot, and
                         switch every animation off so a capture is never
                         caught mid flight
     &steps=12           how many steps &run takes, default 6. A number past
                         the end of the run lands on the end
     &seed=2027          scene 2 starts on that random sequence of houses
     &cap=5              scene 2 stops at that many rounds, to show the cap
     &test=hold          scene 2 only: after the &run steps, show the next
                         round half done, its house drawn and its miss drawn,
                         the line not yet moved
     &fit                measure whether the scene fits the stage and write
                         the verdict on <html data-fit>, for verify.sh

   Everything after &theme is a dev affordance for the headless screenshots,
   and the buttons stay the real interaction.

   THE PAGE IS DESIGNED ON A 1280 BY 720 STAGE and scaled to the window, so a
   1920 by 1080 projector shows the same page half as large again and a small
   laptop window shows all of it rather than a part. See fit() below.
   =========================================================================== */

(function () {
  "use strict";

  var SCENE_TITLES = {
    1: "The ten houses",
    2: "Robbins-Monro"
  };
  var FIRST = 1, LAST = 2;
  var DESIGN_W = 1280, DESIGN_H = 720;

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
    var seed = h.match(/seed=(\d+)/);
    var cap = h.match(/cap=(\d+)/);
    var test = h.match(/test=([a-z]+)/);
    var fit = /[#&?]fit\b/.test(h);
    return {
      run: /[#&?]run\b/.test(h),
      instant: /[#&?]run\b/.test(h) || /[#&?]test=/.test(h) || fit,
      steps: steps ? parseInt(steps[1], 10) : 6,
      seed: seed ? parseInt(seed[1], 10) : null,
      cap: cap ? parseInt(cap[1], 10) : null,
      test: test ? test[1] : null,
      fit: fit
    };
  })();

  /* &fit: does the scene on screen fit? Every box of the active scene has to
     sit inside the stage, no box may hold more than it shows, and the page may
     not scroll. The verdict goes on <html data-fit="...">, "ok" or the boxes
     that spill, and verify.sh reads it back from a headless --dump-dom. The
     layout defects this page has had were all found by eye in a capture; this
     finds the same kind without one. */
  function fitReport() {
    var stage = document.getElementById("stage").getBoundingClientRect();
    var scene = document.querySelector(".scene.active");
    var bad = [];
    function name(el) {
      var c = (el.getAttribute("class") || "").trim().split(/\s+/)[0];
      return el.tagName.toLowerCase() + (c ? "." + c : "");
    }
    if (!scene) bad.push("no active scene");
    else {
      var all = scene.querySelectorAll("*");
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.left < stage.left - 0.5 || r.right > stage.right + 0.5 ||
            r.top < stage.top - 0.5 || r.bottom > stage.bottom + 0.5) {
          bad.push(name(el) + " outside the stage");
        }
        if (el instanceof HTMLElement && el.clientWidth > 0 &&
            (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
          bad.push(name(el) + " holds more than it shows");
        }
      }
    }
    var doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth || doc.scrollHeight > window.innerHeight) {
      bad.push("the page scrolls");
    }
    doc.setAttribute("data-fit", bad.length ? bad.slice(0, 6).join("; ") : "ok");
  }

  /* Scale the 1280 by 720 frame to the window, centred, and never crop it. */
  function fit() {
    var frame = document.getElementById("frame");
    if (!frame) return;
    var s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
    if (!(s > 0)) s = 1;
    var dx = Math.max(0, (window.innerWidth - DESIGN_W * s) / 2);
    var dy = Math.max(0, (window.innerHeight - DESIGN_H * s) / 2);
    frame.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + s + ")";
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
    if (sceneNodes[current] && sceneState[current] && sceneState[current].onLeave) {
      sceneState[current].onLeave();
    }

    /* EVERY scene loses "active" here, and any fade in still waiting is
       cancelled. Removing it from the scene being left is not enough: the
       scenes are absolutely positioned on top of one another, and holding the
       arrow key down pages faster than the 20 ms fade, so the timer of a scene
       that was already left fired afterwards and put it back. Scenes then sat
       drawn over each other on the stage. */
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
      dots[i].setAttribute("aria-current", (i + FIRST) === idx ? "step" : "false");
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
    fit();
    window.addEventListener("resize", fit);
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
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
    });

    window.addEventListener("hashchange", function () {
      var n = readHashScene();
      if (n != null) goTo(n);
    });

    goTo(readHashScene() != null ? readHashScene() : FIRST);

    if (window.Flags.fit) {
      var measure = function () {
        requestAnimationFrame(function () { requestAnimationFrame(fitReport); });
      };
      if (document.readyState === "complete") measure();
      else window.addEventListener("load", measure);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SceneEngine = { goTo: goTo, current: function () { return current; } };
})();
