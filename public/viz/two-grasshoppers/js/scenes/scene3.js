/* ===========================================================================
   Scene 3: two grasshoppers.

   LEFT    the forty stops, the model curve d = a (v/10)^2 + b (v/10) and the
           miss at every stop.
   CENTRE  the bowl: L(a, b) from above, with the point (a, b), the path it
           took, and the two slices through it. The horizontal slice is where
           only a changes, and it is grasshopper a's ground; the vertical slice
           is where only b changes, and it is grasshopper b's.
   RIGHT   the two slices drawn from the side. Grasshopper a stands on L(a)
           with b held where it is; grasshopper b stands on L(b) with a held.

   ONE STEP, in two movements, so the room can see each:

     1. the hop. Each grasshopper reads the slope under its own feet, which is
        its own partial derivative, and both hop at the same time, each with
        its own fixed step size:
            a <- a - alpha_a * dL/da          b <- b - alpha_b * dL/db
        In the bowl the point moves by both hops at once, and the two hops
        are drawn as arrows along the two old slices.
     2. the ground changes. Each slice is recomputed at the other's NEW value:
        the horizontal slice slides to the new b, the vertical one to the new
        a, and each grasshopper's hill morphs under its feet into the new
        slice. The old hill stays behind, dotted, with a ring where the
        grasshopper landed on it and a dotted line up or down to where the new
        hill has put it.

   Every curve on the right is L itself, recomputed from the forty stops at
   every frame. Nothing is interpolated between two drawings.

   Allowed globals: d3, Plot, UI, Fmt, Algo, Hopper, STOP_DATA.
   =========================================================================== */

window.scenes.scene3 = function (root) {
  "use strict";

  var DATA = window.STOP_DATA;
  var stops = DATA.stops;
  var P = DATA.plot;
  var A0 = DATA.start.a, B0 = DATA.start.b;
  var ALPHA_A = DATA.alphaA, ALPHA_B = DATA.alphaB;
  var MAX_STEPS = DATA.maxSteps, SETTLE = DATA.settle;
  var st = Algo.stats2(stops);

  /* ============================================================ the state */
  var n, a, b, settled, path;
  var last = null;          /* the last step: { a0, b0, a1, b1 } */
  /* what is on screen, which during a step runs behind the state */
  var view = { phase: "rest", aHop: A0, bHop: B0, aHeld: A0, bHeld: B0,
               point: [A0, B0], lift: 0, facingA: 1, facingB: 1 };
  var playing = false, timer = null, anim = null, hold = null, quiet = false;

  /* ============================================================ the layout
     THE HEIGHTS ADD UP TO THE 720 FRAME, and a few pixels more push the
     readouts under the footer. The scene box is 608 tall; the bottom row
     takes 48 and the gap above it 8, which leaves 552 for the panels. A panel
     spends 46 on itself (padding 14, border 2, a head fixed at 26 in
     style.css, gap 4), so a full height body is 506 and each of the two
     stacked ones is (552 - 8) / 2 - 46 = 226. Scene 1 uses the same 506. */
  var row1 = UI.row(root);

  var dataPanel = UI.panel(row1, "Forty stops", "", 300);
  var data = Plot.scatter(dataPanel.body, {
    width: 274, height: 506, ml: 58,
    points: stops.map(function (s) { return { x: s.speed, y: s.dist }; }),
    xMax: P.speedMax, yMax: P.distMax, xStep: 20, yStep: 50, dotR: 4.5,
    xTitle: "km/h", yTitle: "metres",
    label: "The forty stops and the current model curve"
  });

  var bowlPanel = UI.panel(row1, "The bowl", "", 500);
  /* The levels rise with the square of their index, so the ellipses are
     evenly spaced, from just above the bottom to the highest corner. */
  var corners = [[P.aMin, P.bMin], [P.aMin, P.bMax], [P.aMax, P.bMin], [P.aMax, P.bMax]];
  var top = d3.max(corners, function (c) { return Algo.loss2(c[0], c[1], stops); });
  var floor = Algo.loss2(st.aStar, st.bStar, stops);
  var levels = d3.range(1, 13).map(function (j) { return floor + (top - floor) * (j / 12) * (j / 12); });
  var bowl = Plot.bowl(bowlPanel.body, {
    width: 474, height: 506, px: P.bowlPx, ml: 44, mt: 14,
    aMin: P.aMin, aMax: P.aMax, bMin: P.bMin, bMax: P.bMax,
    f: function (av, bv) { return Algo.loss2(av, bv, stops); },
    levels: levels,
    aTicks: [0, 0.5, 1, 1.5], bTicks: [0, 2, 4, 6, 8, 10],
    label: "The loss L(a, b) seen from above, with the point and its two slices"
  });

  var side = UI.col(row1);
  var panelA = UI.panel(side, 'Grasshopper <span class="sym ka">a</span>', "", 416);
  var hillA = Plot.hill(panelA.body, {
    width: 390, height: 226, xMin: P.aMin, xMax: P.aMax, yMax: P.lossMax,
    xTicks: [0, 0.5, 1, 1.5], xTitle: "a", xTitleCls: "ka", curveCls: "ka", yTitle: "L",
    hopper: { cls: "ka", tag: "a", scale: 1.25 },
    label: "Grasshopper a on the slice of L along a"
  });
  var panelB = UI.panel(side, 'Grasshopper <span class="sym kb">b</span>', "", 416);
  var hillB = Plot.hill(panelB.body, {
    width: 390, height: 226, xMin: P.bMin, xMax: P.bMax, yMax: P.lossMax,
    xTicks: [0, 2, 4, 6, 8, 10], xTitle: "b", xTitleCls: "kb", curveCls: "kb", yTitle: "L",
    hopper: { cls: "kb", tag: "b", scale: 1.25 },
    label: "Grasshopper b on the slice of L along b"
  });

  var bottom = UI.row(root, "bottom-row");
  var reads = UI.readouts(bottom, [
    { key: "a", label: '<span class="sym ka">a</span>', cls: "ka" },
    { key: "b", label: '<span class="sym kb">b</span>', cls: "kb" },
    { key: "L", label: "L(a, b)", unit: "m<sup>2</sup>" }
  ]);
  var ctl = UI.el("div", "controls");
  bottom.appendChild(ctl);
  var stepBtn = UI.button(ctl, "Step", "primary", function () { step(); });
  var playBtn = UI.button(ctl, "Play", "", function () { if (playing) pause(); else play(); });
  var speedOf = UI.speed(ctl, function () { if (playing) { pause(); play(); } }, { max: 10, value: 2 });
  UI.button(ctl, "Reset", "", function () { reset(); });

  /* ================================================= the two slices of L */
  /* grasshopper a's ground: L along a, with b held */
  function groundA(bHeld) { return function (x) { return Algo.loss2(x, bHeld, stops); }; }
  function slopeA(bHeld) { return function (x) { return Algo.grad2(x, bHeld, stops)[0]; }; }
  /* grasshopper b's ground: L along b, with a held */
  function groundB(aHeld) { return function (x) { return Algo.loss2(aHeld, x, stops); }; }
  function slopeB(aHeld) { return function (x) { return Algo.grad2(aHeld, x, stops)[1]; }; }

  /* ========================================================== the drawing */
  function render() {
    if (quiet) return;
    var pa = view.point[0], pb = view.point[1];
    var model = function (v) { return Algo.predict(pa, pb, v); };
    data.render({ curves: [{ f: model, cls: "fit-curve" }], misses: { f: model, cls: "plain" } });

    var hopping = view.phase === "hop";
    bowl.render({
      path: hopping ? path.slice(0, -1).concat([view.point]) : path,
      point: view.point,
      sliceAt: [view.aHeld, view.bHeld],
      standA: [view.aHop, view.bHeld],
      standB: [view.aHeld, view.bHop],
      hopA: last ? { from: last.a0, to: view.aHop, b: last.b0 } : null,
      hopB: last ? { from: last.b0, to: view.bHop, a: last.a0 } : null
    });

    /* after the hop the old ground stays behind, dotted, with the drop or
       climb the new ground gave the grasshopper where it landed */
    var after = !!last && !hopping;
    hillA.render({
      f: groundA(view.bHeld), slope: slopeA(view.bHeld),
      x: view.aHop, lift: view.lift, facing: view.facingA, tangent: true,
      ghost: after ? groundA(last.b0) : null,
      landed: after ? { x: last.a1, f: groundA(last.b0) } : null
    });
    hillB.render({
      f: groundB(view.aHeld), slope: slopeB(view.aHeld),
      x: view.bHop, lift: view.lift, facing: view.facingB, tangent: true,
      ghost: after ? groundB(last.a0) : null,
      landed: after ? { x: last.b1, f: groundB(last.a0) } : null
    });

    panelA.note.innerHTML = 'holding <span class="sym kb">b</span> = ' + Fmt.coef(view.bHeld);
    panelB.note.innerHTML = 'holding <span class="sym ka">a</span> = ' + Fmt.coef(view.aHeld);
    bowlPanel.note.textContent = "step " + n;
    reads.set("a", Fmt.coef(pa));
    reads.set("b", Fmt.coef(pb));
    reads.set("L", Fmt.lossM2(Algo.loss2(pa, pb, stops)));
    var done = settled || n >= MAX_STEPS;
    stepBtn.disabled = done;
    playBtn.disabled = done;
  }

  /* =========================================== the two movements of a step */
  function showHop(e) {
    view.phase = "hop";
    view.aHop = last.a0 + (last.a1 - last.a0) * e;
    view.bHop = last.b0 + (last.b1 - last.b0) * e;
    view.aHeld = last.a0;
    view.bHeld = last.b0;
    view.point = [view.aHop, view.bHop];
    view.lift = Hopper.ARC * Math.sin(Math.PI * e);
  }

  function showMorph(e) {
    view.phase = "morph";
    view.aHop = last.a1;
    view.bHop = last.b1;
    view.aHeld = last.a0 + (last.a1 - last.a0) * e;
    view.bHeld = last.b0 + (last.b1 - last.b0) * e;
    view.point = [last.a1, last.b1];
    view.lift = 0;
  }

  /* cancel whatever is moving and put the picture where the state is */
  function land() {
    if (anim) { anim.cancel(); anim = null; }
    if (hold) { clearTimeout(hold); hold = null; }
    view.phase = "rest";
    view.aHop = a; view.bHop = b;
    view.aHeld = a; view.bHeld = b;
    view.point = [a, b];
    view.lift = 0;
  }

  /* the arithmetic of one step, and nothing on screen yet */
  function advance() {
    var r = Algo.gd2Step(a, b, n + 1, stops, ALPHA_A, ALPHA_B);
    last = { a0: a, b0: b, a1: r.a, b1: r.b };
    a = r.a; b = r.b; n = r.n;
    path = path.concat([[a, b]]);
    view.facingA = last.a1 >= last.a0 ? 1 : -1;
    view.facingB = last.b1 >= last.b0 ? 1 : -1;
    /* HERE, and never in an animation callback: a following step cancels the
       tween and the callback then never runs */
    if (r.move < SETTLE) { settled = true; pause(); }
  }

  /* ========================================================= the stepping */
  function step() {
    land();
    /* LAND THE PICTURE BEFORE GIVING UP: render() otherwise lives in the
       tweens, and a bare return would leave the stage on a half drawn frame */
    if (settled || n >= MAX_STEPS) { pause(); render(); return; }

    advance();

    /* A step taken by hand is slow enough to watch the ground change; under
       Play the three parts share the time between two steps. */
    var total = playing ? 1000 / speedOf() : 1800;
    var hopMs = Math.min(650, total * 0.36);
    var holdMs = Math.min(150, total * 0.08);
    var morphMs = Math.min(900, total * 0.46);
    function morph() {
      hold = null;
      anim = Plot.tween(0, 1, morphMs, function (v, e) { showMorph(e); render(); }, function () {
        anim = null;
        land();
        render();
      });
    }
    anim = Plot.tween(0, 1, hopMs, function (v, e) { showHop(e); render(); }, function () {
      anim = null;
      showMorph(0);
      render();
      if (window.Flags && window.Flags.instant) morph();
      else hold = setTimeout(morph, holdMs);
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
    n = 0; a = A0; b = B0; settled = false; path = [[A0, B0]]; last = null;
    view.facingA = 1; view.facingB = 1;
    land();
    render();
  }

  reset();

  /* ============================================================ dev flags */
  if (window.Flags && window.Flags.run) {
    quiet = true;
    for (var k = 0; k < window.Flags.steps; k++) step();
    quiet = false;
    land();
    render();
  }

  /* A step is over in under a second and a plain screenshot never catches
     one. These park the next step half way through either movement. Dev
     affordances, never reachable from a button. */
  if (window.Flags && (window.Flags.test === "midhop" || window.Flags.test === "morph") &&
      !settled && n < MAX_STEPS) {
    advance();
    if (window.Flags.test === "midhop") showHop(0.5);
    else { showMorph(0.5); }
    render();
  }

  return {
    onEnter: function () { reset(); },
    onLeave: function () { pause(); land(); }
  };
};
