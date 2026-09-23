/* ===========================================================================
   Scene 1: one grasshopper.

   LEFT   the ten houses, the line w x, and the miss on every one of them.
   RIGHT  L(w), the average of those ten squared misses, an exact parabola in
          w. The grasshopper stands on it at the current w, the short blue
          segment is the tilt under its feet, and it hops to the next w while
          the line on the left turns with it.

     w <- w - alpha * grad L(w)       one fixed step size, 0.00002

   The step size is the smallest of the three the house page offered, the one
   that walks down one side and lands. The walk stops by itself once a step
   moves w by less than a franc per square metre.

   Allowed globals: d3, Plot, UI, Fmt, Algo, Hopper, HOUSE_DATA.
   =========================================================================== */

window.scenes.scene1 = function (root) {
  "use strict";

  var DATA = window.HOUSE_DATA;
  var houses = DATA.houses;
  var W0 = DATA.startW;
  var ALPHA = DATA.alpha;
  var MAX_STEPS = DATA.maxSteps;

  var n = 0;
  var w = W0;
  var shown = W0;
  var trail = [W0];
  var lift = 0;
  var facing = 1;
  var settled = false;
  var playing = false, timer = null, anim = null;

  var row1 = UI.row(root);

  var leftPanel = UI.panel(row1, "Ten houses", "synthetic", 560);
  var sc = Plot.scatter(leftPanel.body, {
    width: 534, height: 506,
    points: houses.map(function (h) { return { x: h.area, y: h.price }; }),
    xMax: DATA.plot.areaMax, yMax: DATA.plot.priceMax, xStep: 30, yStep: 1000000,
    yFormat: Fmt.millions, xTitle: "Living area, square metres", yTitle: "Price, CHF",
    label: "Ten houses, living area against price"
  });

  var rightPanel = UI.panel(row1, "The hillside", "", 668);
  var Lmax = Math.max(Algo.loss(DATA.plot.wMin, houses), Algo.loss(DATA.plot.wMax, houses)) * 1.03;
  var hill = Plot.hill(rightPanel.body, {
    width: 642, height: 506, xMin: DATA.plot.wMin, xMax: DATA.plot.wMax, yMax: Lmax,
    xTicks: d3.range(DATA.plot.wMin, DATA.plot.wMax + 1, 12000), xFormat: Fmt.axisRate,
    xTitle: "w, francs per square metre", yTitle: "L(w)", ml: 40, mr: 30,
    hopper: { cls: "", scale: 1.25 },
    label: "The average squared miss as a function of w, with the grasshopper on it"
  });

  var bottom = UI.row(root, "bottom-row");
  var reads = UI.readouts(bottom, [
    { key: "w", label: "w", unit: "CHF per m<sup>2</sup>", cls: "gd", initial: Fmt.rate(W0) },
    { key: "L", label: "L(w)", unit: "billion", initial: "" }
  ]);
  var ctl = UI.el("div", "controls");
  bottom.appendChild(ctl);
  var stepBtn = UI.button(ctl, "Step", "primary", function () { step(); });
  var playBtn = UI.button(ctl, "Play", "", function () { if (playing) pause(); else play(); });
  var speedOf = UI.speed(ctl, function () { if (playing) { pause(); play(); } });
  UI.button(ctl, "Reset", "", function () { reset(); });

  function lossAt(v) { return Algo.loss(v, houses); }
  function slopeAt(v) { return Algo.grad(v, houses); }

  /* ========================================================== the drawing */
  function render() {
    sc.render({
      curves: [{ f: function (x) { return shown * x; }, cls: "fit-line" }],
      misses: { f: function (x) { return shown * x; } }
    });
    hill.render({
      f: lossAt, slope: slopeAt, x: shown, lift: lift, facing: facing,
      tangent: true, trail: trail
    });
    var done = settled || n >= MAX_STEPS;
    stepBtn.disabled = done;
    playBtn.disabled = done;
    rightPanel.note.textContent = "step " + n;
    reads.set("w", Fmt.rate(shown));
    reads.set("L", Fmt.lossBn(lossAt(shown)));
  }

  /* ========================================================= the stepping */
  function land() {
    if (anim) { anim.cancel(); anim = null; }
    shown = w; lift = 0;
  }

  function step() {
    /* land the running animation before starting another: a cancelled tween
       otherwise leaves the picture half way between two steps */
    land();
    /* LAND THE PICTURE BEFORE GIVING UP. render() otherwise lives in the
       tween, so a bare return leaves the stage on whatever frame the
       cancelled tween stopped at. */
    if (settled || n >= MAX_STEPS) { pause(); render(); return; }

    var from = w;
    var res = Algo.gdStep(w, n + 1, houses, ALPHA);
    w = res.w;
    n = res.n;
    trail = trail.concat([w]);
    facing = (w >= from) ? 1 : -1;
    /* HERE, and never in the animation callback: a following step cancels the
       tween and the callback then never runs. */
    if (Math.abs(w - from) < DATA.settle) { settled = true; pause(); }

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
    if (settled || n >= MAX_STEPS) reset();
    playing = true;
    playBtn.textContent = "Pause";
    playBtn.classList.add("on");
    tick();
  }

  function tick() {
    if (!playing) return;
    step();
    if (playing) timer = setTimeout(tick, 1000 / speedOf());
  }

  function pause() {
    playing = false;
    playBtn.textContent = "Play";
    playBtn.classList.remove("on");
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function reset() {
    pause();
    land();
    n = 0; w = W0; shown = W0; trail = [W0]; lift = 0; facing = 1; settled = false;
    render();
  }

  reset();

  if (window.Flags && window.Flags.run) {
    for (var k = 0; k < window.Flags.steps; k++) step();
  }

  /* A jump is over in half a second and a plain screenshot never catches one,
     so this parks the grasshopper at the top of the arc of the step it is
     about to take. Dev affordance, never reachable from a button. */
  if (window.Flags && window.Flags.test === "midhop" && !settled) {
    var from = w;
    var res = Algo.gdStep(w, n + 1, houses, ALPHA);
    w = res.w; n = res.n;
    trail = trail.concat([w]);
    facing = (w >= from) ? 1 : -1;
    shown = from + (w - from) * 0.5;
    lift = Hopper.ARC;
    render();
  }

  return {
    onEnter: function () { reset(); },
    onLeave: function () { pause(); land(); }
  };
};
