/* ===========================================================================
   Scene 4: the two rules at once, from the same start, on the same houses.

   LEFT   both lines on the ten houses, vermillion for Robbins-Monro and blue
          for gradient descent.
   RIGHT  both walks marked on the same parabola, so that the shapes can be
          compared: one house a round wanders and closes in slowly, ten houses
          a round goes straight down and gets there in a handful of rounds.

   The counter under the panels is the price of that: after the same number of
   rounds, one rule has read n houses and the other has read ten times as many.

   NO GRASSHOPPER ON THIS SCENE. The house rule forbids pairing red with green
   in one chart, and this chart already carries vermillion. The grasshopper
   keeps scene 3, which carries no vermillion.

   Allowed globals: d3, Plot, UI, Fmt, Algo, HOUSE_DATA.
   =========================================================================== */

window.scenes.scene4 = function (root) {
  "use strict";

  var DATA = window.HOUSE_DATA;
  var houses = DATA.houses;
  var order = DATA.visitOrder;
  var W0 = DATA.startW;
  var C = DATA.rmC;
  var st = Algo.stats(houses);
  var ALPHA = DATA.gdAlphas[0].value;      /* the step size that lands smoothly */
  var MAX_ROUNDS = 40;

  var n = 0;
  var wRM = W0, wGD = W0;
  var shownRM = W0, shownGD = W0;
  var trailRM = [W0], trailGD = [W0];
  var lastVisit = null;
  var playing = false, timer = null, anim = null;

  UI.lead(root, "Both rules, from the same start, on the same ten houses. "
    + "Gradient descent takes the step size that lands smoothly, "
    + ALPHA.toFixed(5) + ".");

  var row1 = UI.row(root);

  var leftPanel = UI.panel(row1, "Two lines on the same ten houses", "", 572);
  var sc = Plot.scatter(leftPanel.body, {
    width: 540, height: 398, houses: houses, plot: DATA.plot, showIds: false
  });

  var rightPanel = UI.panel(row1, "Both walks on the same hillside",
                            "L(w), the average squared miss", 654);
  var lc = Plot.lossCurve(rightPanel.body, {
    width: 622, height: 398, houses: houses, plot: DATA.plot, stats: st, hopper: false
  });

  var bottom = UI.row(root, "bottom-row");

  var reads = UI.readouts(bottom, [
    { key: "n", label: "Round", initial: "0" },
    { key: "rm", label: "w, one house a round", unit: "CHF per m2",
      initial: Fmt.rate(W0), cls: "rm" },
    { key: "gd", label: "w, ten houses a round", unit: "CHF per m2",
      initial: Fmt.rate(W0), cls: "gd" },
    { key: "seen", label: "Houses read", initial: "0 and 0" }
  ]);

  var ctl = UI.el("div", "controls ctl-right");
  bottom.appendChild(ctl);
  var stepBtn = UI.button(ctl, "Step", "primary", function () { step(); });
  var playBtn = UI.button(ctl, "Play", "", function () { playing ? pause() : play(); });
  var speedOf = UI.speed(ctl, function () { if (playing) { pause(); play(); } });
  UI.button(ctl, "Reset", "", function () { reset(); });

  UI.footnote(root,
    "Two rules, two questions. Robbins-Monro drives the average miss to zero, at "
    + "w = " + Fmt.rate(st.wAvgZero) + ". Gradient descent drives the average "
    + "squared miss down, and the bottom of that curve is at w = "
    + Fmt.rate(st.wMin) + ". The two answers sit "
    + Fmt.money(Math.abs(st.wMin - st.wAvgZero)) + " francs apart, "
    + (100 * Math.abs(st.wMin - st.wAvgZero) / st.wMin).toFixed(1)
    + " percent, which on this hillside is narrower than one of the marks.");

  /* ========================================================== the drawing */
  function render() {
    sc.render({
      /* gradient descent first, Robbins-Monro over it: the two start on the
         same w, and a solid line drawn last would hide the dashed one */
      lines: [
        { w: shownGD, cls: "gd", label: "Gradient descent" },
        { w: shownRM, cls: "rm", label: "Robbins-Monro" }
      ],
      misses: lastVisit === null ? [] : [{ w: shownRM, indices: [lastVisit], cls: "rm" }],
      visiting: lastVisit
    });
    lc.render({
      trails: [
        { cls: "gd", ws: trailGD },
        { cls: "rm", ws: trailRM }
      ],
      current: null
    });
    stepBtn.disabled = (n >= MAX_ROUNDS);
    playBtn.disabled = (n >= MAX_ROUNDS);
    reads.set("n", String(n));
    reads.set("rm", Fmt.rate(shownRM));
    reads.set("gd", Fmt.rate(shownGD));
    reads.set("seen", n + " and " + (n * houses.length));
  }

  /* ========================================================= the stepping */
  function step() {
    /* land the running animation first: see the note in scene3.js */
    if (anim) { anim.cancel(); anim = null; shownRM = wRM; shownGD = wGD; }
    /* LAND THE PICTURE BEFORE GIVING UP. This scene only ever draws from the
       tween, so returning here without a render left the whole stage frozen on
       an earlier round, Step and Play still enabled, for as long as the scene
       was open. Reached by pressing Step once more at round 40, and by Play
       running into the same wall. */
    if (n >= MAX_ROUNDS) { pause(); shownRM = wRM; shownGD = wGD; render(); return; }

    var fromRM = wRM, fromGD = wGD;
    var rm = Algo.rmStep(wRM, n + 1, houses, order, C);
    var gd = Algo.gdStep(wGD, n + 1, houses, ALPHA);
    wRM = rm.w;
    wGD = gd.w;
    lastVisit = rm.house;
    n = n + 1;
    trailRM = trailRM.concat([wRM]);
    trailGD = trailGD.concat([wGD]);

    var move = Math.min(560, 850 / speedOf());
    anim = Plot.tween(0, 1, move, function (v) {
      shownRM = fromRM + (wRM - fromRM) * v;
      shownGD = fromGD + (wGD - fromGD) * v;
      render();
    }, function () {
      anim = null;
      shownRM = wRM;
      shownGD = wGD;
      render();
    });
  }

  function play() {
    if (n >= MAX_ROUNDS) reset();
    playing = true;
    playBtn.textContent = "Pause";
    playBtn.classList.add("on");
    tick();
  }

  function tick() {
    if (!playing) return;
    step();
    timer = setTimeout(tick, 1000 / speedOf());
  }

  function pause() {
    playing = false;
    playBtn.textContent = "Play";
    playBtn.classList.remove("on");
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function reset() {
    pause();
    if (anim) { anim.cancel(); anim = null; }
    n = 0;
    wRM = W0; wGD = W0; shownRM = W0; shownGD = W0;
    trailRM = [W0]; trailGD = [W0];
    lastVisit = null;
    render();
  }

  reset();

  if (window.Flags && window.Flags.run) {
    for (var k = 0; k < window.Flags.steps; k++) step();
  }

  return {
    onEnter: function () { reset(); },
    onLeave: function () { pause(); if (anim) { anim.cancel(); anim = null; } }
  };
};
