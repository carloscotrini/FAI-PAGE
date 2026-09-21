/* Scene 4. Fitting everything.
 *
 * Chapter two, the crash, part one. Correlation handed over one column at a
 * time and gave nothing worth a decision, so the analyst escalates: every
 * column goes to ordinary least squares at once. The training score climbs
 * toward 1. The score on countries the fit never saw falls off a cliff.
 *
 * THE AXIS PROBLEM, and how this scene answers it. Train R squared lives in
 * [0.55, 1] while test R squared reaches -240.8. One linear axis over that
 * range turns the train curve into a hairline pinned to the top edge, which
 * is the exact defect the house checklist warns about. So the chart is two
 * stacked panels on one shared x axis, each with its own y scale:
 *
 *   panel A   both curves together, linear, clipped at R squared = -1. The
 *             clip is printed in the panel title and the test curve is
 *             allowed to run off the bottom edge, which is what it does.
 *   panel B   the test curve alone over its whole depth, so the true minimum
 *             is on the page, marked, and readable.
 *
 * Keeping both curves in one panel is deliberate. The gap between them IS
 * overfitting, and a reader cannot measure a gap across two panels.
 *
 * Interaction: single state, direct. One slider over p. Every landmark the
 * scene annotates (the worst point, the p = n crossing, the recovery at
 * p = 493) is found in the payload at build time rather than written down.
 *
 * Globals used: d3, Plot, UI, Stats, DATA. */

window.scenes.scene4 = function (root) {
  const D = window.DATA;
  const C = D.crash;

  const ps = C.ps;
  const nTrain = C.nTrain;
  const nTest = C.nTest;
  const last = ps.length - 1;

  /* ===================================================== landmarks, derived */

  // The deepest test score anywhere in the sweep.
  let worst = 0;
  for (let i = 1; i < ps.length; i++) {
    if (C.testR2[i] < C.testR2[worst]) worst = i;
  }
  // The sweep stop that sits on p = n, one column per training country.
  let cliff = 0;
  for (let i = 1; i < ps.length; i++) {
    if (Math.abs(ps[i] - nTrain) < Math.abs(ps[cliff] - nTrain)) cliff = i;
  }

  const series = ps.map((p, i) => ({ p: p, train: C.trainR2[i], test: C.testR2[i] }));

  /* Stats.r2 prints anything at or below -10 with no decimals, because at that
   * depth the decimals are noise. The one exception is the minimum itself:
   * reading it is the job of panel B, so it keeps a decimal there. */
  function deep(v) { return v.toFixed(1); }

  // Panel A: the band where R squared is still a measurement.
  const FLOOR = -1;
  const TOP_HI = 1.08;
  // Panel B: the whole plunge, with a little air above zero.
  const DEEP_LO = C.testR2[worst] * 1.04;
  const DEEP_HI = -C.testR2[worst] * 0.05;

  /* =========================================================== initial state */

  let idx = 0;

  // Dev affordances for headless capture. The slider stays canonical.
  const mode = UI.testMode();
  if (mode === "worst") idx = worst;
  else if (mode === "cliff") idx = cliff;
  else if (mode === "full") idx = last;
  else if (UI.flag("run")) idx = cliff;

  /* ================================================================== layout */

  root.appendChild(UI.head(
    "chapter two " + "·" + " the crash",
    "Fitting everything",
    "Correlation asked one column at a time. Ordinary least squares takes every "
    + "column at once and drives the training error as low as it will go."));

  const layout = UI.el("div.scene-layout");
  const left = UI.el("div.crash-col");
  const panels = UI.el("div.crash-panels");
  const hostTop = UI.el("div.viz-wrap.crash-panel-top");
  const hostDeep = UI.el("div.viz-wrap.crash-panel-deep");
  panels.appendChild(hostTop);
  panels.appendChild(hostDeep);
  left.appendChild(panels);

  const controls = UI.el("div.controls-row");
  const slider = UI.slider("Features p", {
    min: 0, max: last, step: 1, value: idx, width: 240,
    format: i => String(ps[i]),
    onInput: i => { idx = i; refresh(); },
  });
  controls.appendChild(slider);
  // The readout sits beside the hand that is dragging, and it keeps the right
  // column short enough to fit a 1280x800 stage without a scrollbar.
  const strip = UI.el("div.stat-strip");
  controls.appendChild(strip);
  left.appendChild(controls);

  const right = UI.el("div.text-col");
  right.appendChild(UI.el("p",
    "Each stop refits the model on the same " + nTrain + " countries, taking p "
    + "columns in codebook order. The dashed line scores those countries. The "
    + "solid line scores the " + nTest + " held back."));

  right.appendChild(UI.notation([
    { tex: "p", gloss: "feature columns handed to the fit" },
    { tex: "n = " + nTrain, gloss: "countries the fit is allowed to see" },
    {
      tex: "R^2",
      gloss: "1 is perfect, 0 matches always guessing the training mean, "
        + "below 0 is worse than that guess",
    },
  ]));

  right.appendChild(UI.note("The cliff",
    UI.el("span", "At p = " + ps[cliff] + " the fit has one column per training "
      + "country. It scores " + Stats.r2(C.trainR2[cliff]) + " on the countries "
      + "it saw and " + Stats.r2(C.testR2[cliff]) + " on the ones it did not.")));

  right.appendChild(UI.note("Past the cliff",
    UI.el("span", "With " + ps[last] + " columns and " + nTrain + " countries, "
      + "many coefficient vectors fit the training data exactly. The solver "
      + "returns the smallest, which scores " + Stats.r2(C.testR2[last])
      + " on the held back countries.")));

  layout.appendChild(left);
  layout.appendChild(right);
  root.appendChild(layout);

  /* ================================================================== charts */

  function xScale(w) {
    return d3.scaleLinear().domain([ps[0], ps[last]]).range([0, w]);
  }

  /* The two vertical rules both panels carry: p = n, and wherever the slider
   * currently sits. */
  function guides(g, x, h) {
    const xn = x(nTrain);
    g.append("line").attr("class", "ref-line")
      .attr("x1", xn).attr("x2", xn).attr("y1", 0).attr("y2", h);
    const xs = x(ps[idx]);
    g.append("line").attr("class", "crash-sel")
      .attr("x1", xs).attr("x2", xs).attr("y1", 0).attr("y2", h);
  }

  function dot(g, cx, cy, kind) {
    g.append("circle").attr("class", "mark crash-dot fill-fit-" + kind)
      .attr("cx", cx).attr("cy", cy).attr("r", 4.6);
  }

  function renderTop(g, w, h) {
    const x = xScale(w);
    const y = d3.scaleLinear().domain([FLOOR, TOP_HI]).range([h, 0]);

    Plot.axes(g, x, y, w, h, {
      xTicks: 7, yTicks: 5,
      xFormat: () => "",
      title: "Train and test R squared, clipped at " + FLOOR,
    });
    Plot.refLine(g, y(0), w, "R squared = 0, the training mean", { anchor: "start" });
    guides(g, x, h);

    /* The test curve leaves this panel through the floor and comes back. A
     * clip lets it run off the edge, which reads correctly; a break in the
     * line would read as missing data. */
    g.append("clipPath").attr("id", "s4-clip-top").append("rect")
      .attr("x", 0).attr("y", 0).attr("width", w).attr("height", h);
    const inner = g.append("g").attr("clip-path", "url(#s4-clip-top)");

    Plot.fitLine(inner, series, "train", {
      x: d => x(d.p), y: d => y(d.train),
      labelAnchor: "end", labelDx: -8, labelDy: 17,
    });
    /* The test curve climbs into its own label from the left over the last
     * stretch, so the label sits below the line rather than above it. */
    Plot.fitLine(inner, series, "test", {
      x: d => x(d.p), y: d => y(d.test),
      labelAnchor: "end", labelDx: -8, labelDy: 18,
    });

    g.append("text").attr("class", "axis-label crash-vlabel")
      .attr("x", x(nTrain) + 7).attr("y", h - 9)
      .attr("text-anchor", "start")
      .text("p = n = " + nTrain);

    const d = series[idx];
    if (d.train >= FLOOR && d.train <= TOP_HI) dot(g, x(d.p), y(d.train), "train");
    if (d.test >= FLOOR && d.test <= TOP_HI) dot(g, x(d.p), y(d.test), "test");
  }

  function renderDeep(g, w, h) {
    const x = xScale(w);
    const y = d3.scaleLinear().domain([DEEP_LO, DEEP_HI]).range([h, 0]);

    Plot.axes(g, x, y, w, h, {
      xTicks: 7, yTicks: 6,
      xLabel: "p, feature columns in the fit",
      title: "Test R squared, the whole plunge",
    });
    Plot.refLine(g, y(0), w, null);
    guides(g, x, h);

    Plot.fitLine(g, series, "test", {
      x: d => x(d.p), y: d => y(d.test),
      labelAnchor: "end", labelDx: -8, labelDy: 21,
    });

    const wx = x(ps[worst]);
    const wy = y(C.testR2[worst]);
    dot(g, wx, wy, "test");
    g.append("line").attr("class", "crash-lead")
      .attr("x1", wx - 4).attr("x2", wx - 12).attr("y1", wy).attr("y2", wy);
    g.append("text").attr("class", "axis-label crash-worst")
      .attr("x", wx - 16).attr("y", wy + 4).attr("text-anchor", "end")
      .text("worst " + deep(C.testR2[worst]) + " at p = " + ps[worst]);

    const d = series[idx];
    dot(g, x(d.p), y(Math.max(DEEP_LO, Math.min(DEEP_HI, d.test))), "test");
  }

  const MARGIN_SIDES = { right: 30, left: 48 };
  const mTop = Plot.mount(hostTop, renderTop,
    { margin: Object.assign({ top: 26, bottom: 16 }, MARGIN_SIDES) });
  const mDeep = Plot.mount(hostDeep, renderDeep,
    { margin: Object.assign({ top: 26, bottom: 44 }, MARGIN_SIDES) });

  /* ================================================================= refresh */

  function paintStrip() {
    strip.replaceChildren(
      UI.stat(String(nTrain), "training set"),
      UI.stat(Stats.r2(C.trainR2[idx]), "train R squared"),
      UI.stat(Stats.r2(C.testR2[idx]), "test R squared"));
  }

  function refresh() {
    paintStrip();
    mTop.redraw();
    mDeep.redraw();
  }

  slider.setValue(idx);
  paintStrip();

  // No onEnter, onLeave or key handler: the scene runs no animation and holds
  // no arrow key, so the driver keeps them.
  return {};
};
