/* ===========================================================================
   Scene 2: Robbins-Monro, one house at a time.

   One house per round. The house it visits is ringed, its miss is the vertical
   segment between the line and the dot, the three lines of arithmetic under the
   readouts are that round's numbers in the deck's own rule, and then the line
   turns. The ghost is where the line stood before the step.

     l     = y - w x        the verdict on the house visited
     alpha = c / n          the step shrinks as the rounds pile up
     w    := w + alpha l    the update

   Allowed globals: d3, Plot, UI, Fmt, Algo, HOUSE_DATA.
   =========================================================================== */

window.scenes.scene2 = function (root) {
  "use strict";

  var DATA = window.HOUSE_DATA;
  var houses = DATA.houses;
  var order = DATA.visitOrder;
  var W0 = DATA.startW;
  var C = DATA.rmC;
  var MAX_ROUNDS = order.length;

  /* ============================================================ the state */
  var n = 0;                /* rounds taken */
  var w = W0;               /* the weight now */
  var wPrev = W0;           /* where the line stood before the last step */
  var row = null;           /* the last step, straight from Algo.rmStep */
  var shown = W0;           /* the w the line is drawn at, mid animation */
  var playing = false;
  var timer = null;       /* the play loop */
  var hold = null;        /* the pause between showing the miss and moving */
  var anim = null;        /* the line turning */

  UI.lead(root, "One house per round. Look at the miss on that house, "
    + "and nudge <span class='sym'>w</span> by a shrinking fraction of it.");

  var row1 = UI.row(root);

  var leftPanel = UI.panel(row1, "The ten houses, and the line w x", "", 700);
  var sc = Plot.scatter(leftPanel.body, {
    width: 668, height: 450, houses: houses, plot: DATA.plot, showIds: false
  });

  var side = UI.el("div", "side-col");
  row1.appendChild(side);

  var reads = UI.readouts(side, [
    { key: "n", label: "Round", initial: "0" },
    { key: "w", label: "w", unit: "CHF per m2", initial: Fmt.rate(W0) },
    { key: "alpha", label: "Step size", initial: Fmt.alpha(C) }
  ]);

  /* the three lines of arithmetic, symbols on the left, this round on the right */
  var formula = UI.el("div", "formula fmla");
  side.appendChild(formula);
  var fRows = [
    { sym: "l = y - w x", key: "l" },
    { sym: "alpha = c / n", key: "a" },
    { sym: "w := w + alpha l", key: "w" }
  ].map(function (d) {
    var s = UI.el("div", "fmla-sym sym", d.sym);
    var v = UI.el("div", "fmla-val val rm", "");
    formula.appendChild(s);
    formula.appendChild(v);
    return v;
  });

  var codeBlock = UI.code(side, [
    "def fit(x, y, w, c):",
    "    n = 1",
    "    l_bar = verdict(x, y, w)   # the average miss, all ten",
    "    while abs(l_bar) > 0.5:    # half a franc out on average",
    "        i = next_house()       # one house this round",
    "        l = y[i] - w * x[i]    # the verdict on that house",
    "        w = w + (c / n) * l    # the update",
    "        n = n + 1",
    "        l_bar = verdict(x, y, w)",
    "    return w"
  ]);

  var ctl = UI.el("div", "controls");
  side.appendChild(ctl);
  var stepBtn = UI.button(ctl, "Step", "primary", function () { step(); });
  var playBtn = UI.button(ctl, "Play", "", function () { playing ? pause() : play(); });
  var speedOf = UI.speed(ctl, function () { if (playing) { pause(); play(); } });
  UI.button(ctl, "Reset", "", function () { reset(); });

  var note = UI.footnote(side, "");

  /* ========================================================== the drawing */
  function render() {
    var lines = [{ w: shown, cls: "rm" }];
    if (n > 0 && Math.abs(wPrev - shown) > 1) lines.unshift({ w: wPrev, cls: "ghost" });
    sc.render({
      lines: lines,
      misses: row ? [{ w: wPrev, indices: [row.house], cls: "rm" }] : [],
      visiting: row ? row.house : null
    });
    reads.set("n", String(n));
    reads.set("w", Fmt.rate(shown));
    reads.set("alpha", n === 0 ? Fmt.alpha(C) : Fmt.alpha(row.alpha));
    stepBtn.disabled = (n >= MAX_ROUNDS);
    playBtn.disabled = (n >= MAX_ROUNDS);
    if (row) {
      var h = houses[row.house];
      fRows[0].textContent = Fmt.money(h.price) + " - " + Fmt.rate(wPrev) + " * "
        + h.area + " = " + Fmt.signed(row.l);
      fRows[1].textContent = C + " / " + row.n + " = " + Fmt.alpha(row.alpha);
      /* Fmt.stepTo, never Fmt.signed(alpha * l): see the note on stepTo in
         js/fmt.js. Rounding the step on its own made this line read
         23 619 -5 = 23 613 in 58 of the 300 rounds. */
      fRows[2].textContent = Fmt.rate(wPrev) + " " + Fmt.stepTo(wPrev, row.w)
        + " = " + Fmt.rate(row.w);
    } else {
      fRows[0].textContent = "waiting for the first round";
      fRows[1].textContent = C + " / 1 = " + Fmt.alpha(C);
      fRows[2].textContent = "w starts at " + Fmt.rate(W0);
    }
  }

  /* ========================================================= the stepping */
  function step() {
    if (anim) { anim.cancel(); anim = null; shown = w; }
    if (hold) { clearTimeout(hold); hold = null; }
    /* LAND THE PICTURE BEFORE GIVING UP. The two lines above have just killed
       whatever was moving; returning without drawing leaves the stage on a half
       finished round and the buttons on their old state. */
    if (n >= MAX_ROUNDS) { pause(); shown = w; render(); return; }

    row = Algo.rmStep(w, n + 1, houses, order, C);
    wPrev = w;
    w = row.w;
    n = row.n;
    shown = wPrev;
    render();
    codeBlock.highlight(5);

    var total = Math.min(620, 800 / speedOf());
    var holdMs = total * 0.35;
    var move = total * 0.65;

    function run() {
      codeBlock.highlight(6);
      anim = Plot.tween(wPrev, w, move, function (v) {
        shown = v;
        render();
      }, function () {
        anim = null;
        shown = w;
        render();
        codeBlock.highlight(6);
      });
    }

    if (window.Flags && window.Flags.instant) run();
    else hold = setTimeout(function () { hold = null; run(); }, holdMs);
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
    if (hold) { clearTimeout(hold); hold = null; }
    n = 0; w = W0; wPrev = W0; shown = W0; row = null;
    codeBlock.highlight(1);
    render();
  }

  /* what the loop above would still be doing after the last round this page
     runs, said in numbers rather than left to the imagination */
  var last = Algo.rmRun(houses, order, W0, C, MAX_ROUNDS)[MAX_ROUNDS];
  note.textContent =
    "The loop stops when the average miss over all ten is under half a franc. "
    + "This page runs " + MAX_ROUNDS + " rounds and stops there, with w = "
    + Fmt.rate(last.w) + " and an average miss of "
    + Fmt.money(Math.abs(Algo.meanMiss(last.w, houses))) + " francs, still falling.";

  reset();

  if (window.Flags && window.Flags.run) {
    for (var k = 0; k < window.Flags.steps; k++) step();
  }

  return {
    onEnter: function () { reset(); },
    onLeave: function () {
      pause();
      if (anim) { anim.cancel(); anim = null; }
      if (hold) { clearTimeout(hold); hold = null; }
    }
  };
};
