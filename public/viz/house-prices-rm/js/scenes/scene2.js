/* ===========================================================================
   Scene 2: Robbins-Monro, one house at a time.

   One round, in the order the code panel runs it, with the executing line lit:

     pick    a house drawn at random is ringed and named
     miss    its miss l is the vertical segment from the line up to its dot
     move    the line turns by alpha * l, and the update line gives the sum
     land    the verdict l_bar, the average miss over all ten, is read out

   The grey line is where the line stood before the step. The loop stops by
   itself once abs(l_bar) is under TOL, and "return w" is lit.

   Under the scatter, l_bar against the round: one point more each time a
   round lands, the latest one ringed, the ring heavy once the loop stops.

   The whole run is computed by Algo.rmRun when the scene starts, and the page
   then shows it round by round, so what is drawn is exactly the run that
   precompute/reference.py prints and checks. The scatter and the l_bar chart
   read the same rows. Reset draws a fresh random sequence of houses: seed + 1,
   then + 2, and so on. Entering the scene again goes back to the default
   sequence.

   Allowed globals: d3, Plot, UI, Fmt, Algo, HOUSE_DATA, Flags.
   =========================================================================== */

window.scenes.scene2 = function (root) {
  "use strict";

  var DATA = window.HOUSE_DATA;
  var houses = DATA.houses;
  var W0 = DATA.startW;
  var ALPHA = DATA.alpha;
  var TOL = DATA.tol;
  var F = window.Flags || {};
  var SEED0 = (F.seed !== null && F.seed !== undefined) ? F.seed : DATA.drawSeed;
  var CAP = (F.cap !== null && F.cap !== undefined) ? F.cap : DATA.maxRounds;

  /* ===================================================== THE CODE PANEL ====
     The block 1 deck's frame "Many houses: the algorithm", with verdict()
     exactly as the deck prints it and fit() fed one house per round. The only
     comment is the one the lecturer asked for: next_house() is a house at
     random. The numbers are this run's own, written as Python writes them. */
  var CODE = [
    "def verdict(x, y, w):",
    "    total = 0",
    "    for i in range(len(x)):",
    "        total = total + (y[i] - w * x[i])",
    "    return total / len(x)",
    "",
    "def fit(x, y, w, alpha):",
    "    l_bar = verdict(x, y, w)",
    "    while abs(l_bar) > " + String(TOL) + ":",
    "        i = next_house()        # a house at random",
    "        l = y[i] - w * x[i]",
    "        w = w + alpha * l",
    "        l_bar = verdict(x, y, w)",
    "    return w",
    "",
    "fit(x, y, " + String(W0) + ", " + String(ALPHA) + ")"
  ];
  var LINE = { start: 7, loop: 8, pick: 9, miss: 10, update: 11, verdict: 12, ret: 13 };

  /* ============================================================ the state */
  var seed = SEED0;
  var run = null;           /* { rows, stopped } from Algo.rmRun */
  var last = 0;             /* the round the run ends on */
  var n = 0;                /* the round on screen */
  var phase = "land";       /* pick, miss, move, or land once the round is done */
  var shown = W0;           /* the w the line is drawn at, mid animation */
  var playing = false;
  var timer = null;         /* the play loop */
  var hold = null;          /* the pauses inside one round */
  var anim = null;          /* the line turning */

  UI.lead(root, "Each round, one house at random nudges <span class='sym'>w</span>.");

  var row1 = UI.row(root);

  /* The scatter over the l_bar chart. The two heights and the panels around
     them add up to the height of the column on the right; verify.sh measures
     the fit with &fit. */
  var leftCol = UI.el("div", "left-col");
  row1.appendChild(leftCol);
  var leftPanel = UI.panel(leftCol, null, 624);
  var sc = Plot.scatter(leftPanel.body, {
    width: 598, height: 336, houses: houses, plot: DATA.plot, showIds: false
  });
  var chartPanel = UI.panel(leftCol, null, 624);
  var chart = Plot.lbarChart(chartPanel.body, { width: 598, height: 184, tol: TOL });

  var side = UI.el("div", "side-col");
  row1.appendChild(side);

  /* Fixed widths, so a number that loses a digit does not move its
     neighbours. They add up to 594 of the column's 602 pixels with the gaps,
     and each one holds its widest value, +1 736 000 CHF, with room to spare:
     verify.sh measures both with &fit. */
  var reads = UI.readouts(side, [
    { key: "n", label: "Round", width: 72 },
    { key: "w", label: "w", code: true, unit: "CHF per m2", width: 170 },
    { key: "l", label: "l", code: true, unit: "CHF", width: 158 },
    { key: "lBar", label: "l_bar", code: true, unit: "CHF", width: 158 }
  ]);

  /* the update, with this round's numbers */
  var upd = UI.el("div", "formula fmla");
  side.appendChild(upd);
  upd.appendChild(UI.el("div", "fmla-sym", "w = w + alpha * l"));
  var updVal = UI.el("div", "fmla-val val rm", "");
  upd.appendChild(updVal);

  var codeBlock = UI.code(side, CODE);

  var ctl = UI.el("div", "controls");
  side.appendChild(ctl);
  var stepBtn = UI.button(ctl, "Step", "primary", function () { step(false); });
  var playBtn = UI.button(ctl, "Play", "", function () { if (playing) pause(); else play(); });
  var speedOf = UI.speed(ctl, function () { if (playing) { pause(); play(); } });
  UI.button(ctl, "Reset", "reset", function () { restart(seed + 1); });

  /* ========================================================== the drawing */
  function render() {
    var rows = run.rows;
    var now = rows[n];
    var before = n > 0 ? rows[n - 1] : null;
    var landed = (phase === "land");

    var lines = [];
    if (before && (phase === "move" || landed) && Math.abs(before.w - shown) > 1) {
      lines.push({ w: before.w, cls: "ghost" });
    }
    lines.push({ w: shown, cls: "rm", tag: "w * x" });
    sc.render({
      lines: lines,
      misses: (before && phase !== "pick")
        ? [{ w: before.w, to: now.w, indices: [now.house], cls: "rm", tag: "l" }] : [],
      visiting: before ? now.house : null
    });

    reads.set("n", String(n));
    reads.set("w", Fmt.rate(shown));
    reads.set("l", (before && phase !== "pick") ? Fmt.signed(now.l) : "");
    reads.set("lBar", Fmt.signed(landed ? now.lBar : before.lBar));

    /* Fmt.updateLine goes through Fmt.stepTo, never alpha * l rounded on its
       own: see the note on stepTo in js/fmt.js. While a round is still being
       drawn, the line keeps the last update, whose sum is the w on screen. */
    var from = null, to = null;
    if (before && (phase === "move" || landed)) { from = before.w; to = now.w; }
    else if (n > 1) { from = rows[n - 2].w; to = before.w; }
    updVal.textContent = (from === null) ? "" : Fmt.updateLine(from, to);

    var end = landed && n === last;
    reads.mark("lBar", end && run.stopped);
    /* A round's l_bar joins the chart when it lands, with the readout: until
       then the chart ends on the round before, as the readout does. */
    chart.render({ upTo: landed ? n : n - 1, met: end && run.stopped });
    codeBlock.highlight(
      n === 0 ? LINE.start
      : phase === "pick" ? LINE.pick
      : phase === "miss" ? LINE.miss
      : phase === "move" ? LINE.update
      : !end ? LINE.verdict
      : run.stopped ? LINE.ret : LINE.loop);

    stepBtn.disabled = end;
    playBtn.disabled = end;
  }

  /* ========================================================= the stepping */
  function land() {
    phase = "land";
    shown = run.rows[n].w;
    render();
    if (n >= last) pause();
  }

  /* One round. From Play the round takes the slider's pace; from the Step
     button it takes a fixed, slower one, so the room can read each lit line:
     at the Play pace the pick lasted 80 ms. A click during a round skips the
     rest of its animation, never its arithmetic: the rows are already known. */
  var STEP_MS = 1100;

  function step(fromPlay) {
    if (anim) { anim.cancel(); anim = null; }
    if (hold) { clearTimeout(hold); hold = null; }
    /* LAND THE PICTURE BEFORE GIVING UP. The two lines above have just killed
       whatever was moving; returning without drawing leaves the stage on a half
       finished round and the buttons on their old state. */
    if (n >= last) { pause(); land(); return; }

    n = n + 1;
    phase = "pick";
    shown = run.rows[n - 1].w;
    if (F.instant) { land(); return; }
    render();

    var total = fromPlay ? Math.min(900, 800 / speedOf()) : STEP_MS;
    hold = setTimeout(function () {
      phase = "miss";
      render();
      hold = setTimeout(function () {
        hold = null;
        phase = "move";
        render();
        anim = Plot.tween(run.rows[n - 1].w, run.rows[n].w, total * 0.5, function (v) {
          shown = v;
          render();
        }, function () {
          anim = null;
          land();
        });
      }, total * 0.25);
    }, total * 0.25);
  }

  function play() {
    if (n >= last) return;
    playing = true;
    playBtn.textContent = "Pause";
    playBtn.classList.add("on");
    tick();
  }

  function tick() {
    if (!playing) return;
    step(true);
    if (playing) timer = setTimeout(tick, 1000 / speedOf());
  }

  function pause() {
    playing = false;
    playBtn.textContent = "Play";
    playBtn.classList.remove("on");
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function stopAll() {
    pause();
    if (anim) { anim.cancel(); anim = null; }
    if (hold) { clearTimeout(hold); hold = null; }
  }

  /* A fresh run on random sequence s, back at round 0. */
  function restart(s) {
    stopAll();
    seed = s;
    run = Algo.rmRun(houses, W0, ALPHA, TOL, seed, CAP);
    last = run.rows.length - 1;
    chart.run(run.rows);
    n = 0;
    phase = "land";
    shown = W0;
    render();
  }

  restart(SEED0);

  if (F.run) {
    for (var k = 0; k < F.steps; k++) step(false);
  }
  if (F.test === "hold" && n < last) {
    n = n + 1;
    phase = "miss";
    shown = run.rows[n - 1].w;
    render();
  }

  return {
    onEnter: function () { restart(SEED0); },
    onLeave: function () { stopAll(); }
  };
};
