/* The scene engine.
 *
 * Each scene file registers window.scenes.sceneN(root), returning an optional
 * { onEnter, onLeave, onNextKey, onPrevKey }. Returning true from onNextKey
 * consumes the keystroke, which is how a scene that stages internally holds on
 * to the arrow keys until it is finished.
 *
 * Hash routing is mandatory. #scene=4 deep links straight into a scene, which
 * saves the lecturer mid lecture and saves anyone verifying the viz from
 * clicking Next eight times per reload. Two more flags ride the same hash and
 * exist only for headless capture: &run trips a scene's primary gated button,
 * and &theme=light or &theme=dark forces a theme without touching storage.
 *
 * Globals used: Theme, and window.scenes. */

(function () {
  const SCENE_TITLES = [
    "",                            // 0, the title card
    "One feature at a time",
    "All 493 at once",
    "Tell them apart",
    "Fitting everything",
    "Predicted against actual",
    "Regularisation",
    "What the models kept",
    "One split, then a hundred",
    "Takeaways",
  ];

  let current = -1;
  const sceneNodes = [];
  const sceneState = [];

  function readHashScene() {
    const m = (window.location.hash || "").match(/scene=(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return (Number.isFinite(n) && n >= 0 && n < SCENE_TITLES.length) ? n : null;
  }

  function writeHashScene(idx) {
    const h = window.location.hash || "";
    const next = /scene=\d+/.test(h)
      ? h.replace(/scene=\d+/, "scene=" + idx)
      : (h ? h + "&scene=" + idx : "#scene=" + idx);
    if (next !== h) {
      // replaceState keeps the back button useful for leaving the viz rather
      // than for walking back through every scene the lecturer visited.
      history.replaceState(null, "", next);
    }
  }

  function handleNext() {
    const st = sceneState[current];
    if (st && st.onNextKey && st.onNextKey()) return;
    goTo(current + 1);
  }

  function handlePrev() {
    const st = sceneState[current];
    if (st && st.onPrevKey && st.onPrevKey()) return;
    goTo(current - 1);
  }

  function goTo(idx) {
    if (idx < 0 || idx >= SCENE_TITLES.length) return;
    if (idx === current) return;

    const stage = document.getElementById("stage");
    const oldNode = sceneNodes[current];
    if (oldNode) {
      oldNode.classList.remove("active");
      const oldState = sceneState[current];
      if (oldState && oldState.onLeave) oldState.onLeave();
    }

    if (!sceneNodes[idx]) {
      const node = document.createElement("div");
      node.className = "scene";
      node.setAttribute("data-scene", idx);
      stage.appendChild(node);
      sceneNodes[idx] = node;
      const builder = window.scenes && window.scenes["scene" + idx];
      if (builder) {
        try {
          sceneState[idx] = builder(node) || {};
        } catch (err) {
          console.error("Scene " + idx + " builder threw:", err);
          node.innerHTML = '<div class="scene-stub"><h2>Scene ' + idx +
            '</h2><p class="muted">' + err.message + "</p></div>";
        }
      } else {
        node.innerHTML = '<div class="scene-stub"><h2>Scene ' + idx +
          '</h2><p class="muted">' + (SCENE_TITLES[idx] || "title") +
          '</p><p class="muted small">Builder not registered.</p></div>';
      }
    } else if (sceneState[idx] && sceneState[idx].onEnter) {
      sceneState[idx].onEnter();
    }

    current = idx;

    // Under headless capture the fade would be caught mid transition and the
    // whole page would read as a ghost. Skip it when a dev flag is set.
    const instant = /[#&?](run|test=)/.test(window.location.hash + window.location.search);
    if (instant) {
      sceneNodes[idx].style.transition = "none";
      sceneNodes[idx].classList.add("active");
    } else {
      setTimeout(() => sceneNodes[idx].classList.add("active"), 20);
    }

    document.getElementById("scene-title").textContent = SCENE_TITLES[idx] || "";
    document.querySelectorAll("#dots .dot").forEach((d, i) => {
      d.classList.toggle("active", i === idx);
    });
    document.getElementById("prev-btn").disabled = idx === 0;
    document.getElementById("next-btn").disabled = idx === SCENE_TITLES.length - 1;
    writeHashScene(idx);
  }

  function init() {
    Theme.init();
    document.getElementById("theme-toggle").addEventListener("click", () => Theme.toggle());

    const dotsEl = document.getElementById("dots");
    SCENE_TITLES.forEach((t, i) => {
      const dot = document.createElement("button");
      dot.className = "dot";
      dot.setAttribute("data-idx", i);
      dot.setAttribute("aria-label", "Scene " + i + (t ? ", " + t : ""));
      dot.title = t || "Title";
      dot.addEventListener("click", () => goTo(i));
      dotsEl.appendChild(dot);
    });

    document.getElementById("prev-btn").addEventListener("click", handlePrev);
    document.getElementById("next-btn").addEventListener("click", handleNext);

    window.addEventListener("keydown", e => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName || "")) return;
      if (e.key === "ArrowRight") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
    });

    window.addEventListener("hashchange", () => {
      const n = readHashScene();
      if (n != null) goTo(n);
    });

    goTo(readHashScene() != null ? readHashScene() : 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SceneEngine = { goTo, current: () => current, titles: SCENE_TITLES };
})();
