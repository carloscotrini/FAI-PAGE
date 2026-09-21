/* ===========================================================================
   Scene 3: gradient descent, side by side with the grasshopper game.

   LEFT   the ten houses, the line w x, and the miss on every one of them,
          because this rule looks at all ten before it moves.
   RIGHT  L(w), the average of those ten squared misses, which is an exact
          parabola in w. The grasshopper stands on it at the current w, the
          short blue segment is the tilt under its feet, and it hops to the
          next w while the line on the left turns with it.

     w := w - alpha * grad L(w)          gd-slides.tex line 999

   The three step sizes are the three regimes of this parabola, and which
   regime each one is in is checked against the data in
   precompute/reference.py and again in precompute/check_js.mjs.

   Allowed globals: d3, Plot, UI, Fmt, Algo, Hopper, HOUSE_DATA.
   =========================================================================== */

window.scenes.scene3 = function (root) {
  "use strict";

  var DATA = window.HOUSE_DATA;
  var houses = DATA.houses;
  var W0 = DATA.startW;
  var st = Algo.stats(houses);
  var ALPHAS = DATA.gdAlphas;
  var MAX_ROUNDS = 40;

  var ai = 0;               /* which step size is selected */
  var n = 0;
  var w = W0;
  var shown = W0;
  var trail = [W0];
  var lift = 0;
  var facing = 1;
  var gone = false;         /* the walk has left the drawn window */
  var playing = false, timer = null, anim = null;

  UI.lead(root, "The same ten houses. Every round reads the miss on "
    + "<b>all ten</b>, turns that into one tilt, and steps against it.");

  var row1 = UI.row(root);

  var leftPanel = UI.panel(row1, "The ten misses", "all ten, every round", 572);
  var sc = Plot.scatter(leftPanel.body, {
    width: 540, height: 398, houses: houses, plot: DATA.plot, showIds: false
  });

  var rightPanel = UI.panel(row1, "The hillside L(w)", "", 654);
  var lc = Plot.lossCurve(rightPanel.body, {
    width: 622, height: 398, houses: houses, plot: DATA.plot, stats: st, hopper: true
  });

  /* The step size selector rides in the hillside's own head. In the bottom row
     it made that row wrap, and the wrap pushed the last line of the scene under
     the footer on a 1280 by 720 screen. */
  UI.label(rightPanel.head, "Step size");
  var group = UI.el("div", "btn-group");
  rightPanel.head.appendChild(group);
  var alphaBtns = ALPHAS.map(function (spec, i) {
    return UI.button(group, spec.value.toFixed(5), "", function () { choose(i); });
  });

  /* the arithmetic of this round, in the deck's rule */
  var formula = UI.el("div", "formula fmla");
  root.appendChild(formula);
  formula.appendChild(UI.el("div", "fmla-sym sym", "w := w - alpha * tilt"));
  var fVal = UI.el("div", "fmla-val val gd", "");
  formula.appendChild(fVal);

  var bottom = UI.row(root, "bottom-row");

  var reads = UI.readouts(bottom, [
    { key: "n", label: "Round", initial: "0" },
    { key: "w", label: "w", unit: "CHF per m2", initial: Fmt.rate(W0) },
    { key: "g", label: "Tilt", unit: "million", initial: "" },
    { key: "L", label: "L(w)", unit: "billion", initial: "" }
  ]);

  var ctl = UI.el("div", "controls ctl-right");
  bottom.appendChild(ctl);

  var stepBtn = UI.button(ctl, "Step", "primary", function () { step(); });
  var playBtn = UI.button(ctl, "Play", "", function () { playing ? pause() : play(); });
  var speedOf = UI.speed(ctl, function () { if (playing) { pause(); play(); } });
  UI.button(ctl, "Reset", "", function () { reset(); });

  var claim = UI.footnote(root, "");

  /* ========================================================== the drawing */
  function render() {
    var all = houses.map(function (h, i) { return i; });
    sc.render({
      lines: [{ w: shown, cls: "gd" }],
      misses: [{ w: shown, indices: all, cls: "gd" }],
      visiting: null
    });
    lc.render({
      trails: [{ cls: "gd", ws: trail }],
      current: { w: shown, cls: "gd", facing: facing },
      tangent: true,
      lift: lift,
      note: gone ? ("w = " + Fmt.rate(w) + ", off the picture") : null
    });

    stepBtn.disabled = (gone || n >= MAX_ROUNDS);
    playBtn.disabled = (gone || n >= MAX_ROUNDS);
    reads.set("n", String(n));
    reads.set("w", Fmt.rate(shown));
    reads.set("g", Fmt.slopeM(Algo.grad(shown, houses)));
    reads.set("L", Fmt.lossBn(Algo.loss(shown, houses)));

    var alpha = ALPHAS[ai].value;
    var g = Algo.grad(w, houses);
    if (n === 0) {
      fVal.textContent = "the tilt here is " + Fmt.slopeM(g) + " million, so the next step is "
        + Fmt.signed(-alpha * g) + " francs per square metre";
    } else {
      /* Fmt.stepTo, never Fmt.signed(-alpha * lastGrad): see the note on
         stepTo in js/fmt.js. Rounding the step on its own made round 14 of the
         small step read 24 052 +0 = 24 053. */
      fVal.textContent = Fmt.rate(lastFrom) + " " + Fmt.stepTo(lastFrom, w)
        + " = " + Fmt.rate(w);
    }
  }

  var lastFrom = W0, lastGrad = 0;

  /* ========================================================= the stepping */
  function step() {
    /* land the running animation before starting another: a cancelled tween
       otherwise leaves the picture half way between two rounds */
    if (anim) { anim.cancel(); anim = null; shown = w; lift = 0; }
    /* LAND THE PICTURE BEFORE GIVING UP. render() lives in the tween, so a
       return without it leaves the stage on the frame the cancelled tween
       happened to stop at, with Step and Play still looking usable. */
    if (n >= MAX_ROUNDS || gone) { pause(); shown = w; lift = 0; render(); return; }

    var alpha = ALPHAS[ai].value;
    var from = w;
    var res = Algo.gdStep(w, n + 1, houses, alpha);
    lastFrom = from;
    lastGrad = res.usedGrad;
    w = res.w;
    n = res.n;
    trail = trail.concat([w]);
    facing = (w >= from) ? 1 : -1;

    /* HERE, not in the animation callback below. The callback does not run when
       a following step cancels the tween, and then nothing stops the walk. */
    if (!lc.inside(w)) { gone = true; pause(); }

    var move = Math.min(600, 900 / speedOf());
    anim = Plot.tween(from, w, move, function (v, e) {
      shown = v;
      lift = Hopper.ARC * Math.sin(Math.PI * e);
      render();
    }, function () {
      anim = null;
      shown = w;
      lift = 0;
      render();
    });
  }

  function play() {
    if (n >= MAX_ROUNDS || gone) reset();
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

  function choose(i) {
    ai = i;
    alphaBtns.forEach(function (b, k) { b.classList.toggle("on", k === i); });
    claim.textContent = ALPHAS[i].name + " step, " + ALPHAS[i].value.toFixed(5)
      + ": it " + ALPHAS[i].claim + ". One step multiplies the distance to the "
      + "bottom by " + Algo.errorFactor(ALPHAS[i].value, st).toFixed(2) + ".";
    reset();
  }

  function reset() {
    pause();
    if (anim) { anim.cancel(); anim = null; }
    n = 0; w = W0; shown = W0; trail = [W0]; lift = 0; facing = 1; gone = false;
    lastFrom = W0; lastGrad = 0;
    render();
  }

  choose(window.Flags && window.Flags.alphaIndex ? window.Flags.alphaIndex : 0);

  if (window.Flags && window.Flags.run) {
    for (var k = 0; k < window.Flags.steps; k++) step();
  }

  /* A jump is over in half a second and a plain screenshot never catches one,
     so this parks the grasshopper at the top of the arc of the step it is
     about to take. Dev affordance, never reachable from a button. */
  if (window.Flags && window.Flags.test === "midhop" && !gone) {
    var from = w;
    var res = Algo.gdStep(w, n + 1, houses, ALPHAS[ai].value);
    lastFrom = from; lastGrad = res.usedGrad;
    w = res.w; n = res.n;
    trail = trail.concat([w]);
    facing = (w >= from) ? 1 : -1;
    shown = from + (w - from) * 0.5;
    lift = Hopper.ARC;
    render();
  }

  return {
    onEnter: function () { reset(); },
    onLeave: function () { pause(); if (anim) { anim.cancel(); anim = null; } }
  };
};
