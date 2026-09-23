/* Scene 6. The Scrabble model.
 *
 * Chapter two, the crash, part three. Scenes 4 and 5 fed least squares every
 * column. This one feeds it nonsense only: every column the codebook tags
 * spurious, which is the hand made jokes (the Scrabble score of the name, the
 * colours in the flag, the length of the anthem), columns of random numbers,
 * and sines, products and ratios of the jokes. The fit still climbs to a
 * perfect score on the countries it saw, and the countries held back show what
 * that score is worth.
 *
 * One panel, drawn with the card, rules and clip of the top panel of scene 4,
 * so the two read as one argument. The verdict in the right column follows the
 * slider: the two scores, and the lowest prediction the fit makes for a held
 * back country, in dollars.
 *
 * Interaction: single state, direct. One slider over the number of nonsense
 * columns, opening on the first stop where the training score is perfect.
 * Every score and every prediction comes from DATA.scrabble, and the
 * column counts in the note are counted off DATA.bait.features.
 *
 * Globals used: d3, Plot, UI, Stats, DATA. */

window.scenes.scene6 = function (root) {
  const D = window.DATA;
  const S = D.scrabble;

  const ps = S.ps;
  const last = ps.length - 1;
  const nTrain = S.nTrain;
  const nTest = S.nTest;

  /* ===================================================== landmarks, derived */

  // The stop that sits on p = n, one nonsense column per training country.
  let cliff = 0;
  for (let i = 1; i < ps.length; i++) {
    if (Math.abs(ps[i] - nTrain) < Math.abs(ps[cliff] - nTrain)) cliff = i;
  }
  // The deepest test score of the sweep.
  let worst = 0;
  for (let i = 1; i < ps.length; i++) {
    if (S.testR2[i] < S.testR2[worst]) worst = i;
  }
  // The first stop where nonsense fits the training countries perfectly, to
  // the three decimals the scene prints. The scene opens here, on the verdict,
  // so a participant clicking through alone meets the joke without dragging.
  let perfect = S.trainR2.findIndex(v => v >= 0.9995);
  if (perfect < 0) perfect = ps.length - 1;
  // Where the two curves are well apart and both on the panel: their labels.
  let labelIdx = S.trainR2.findIndex((v, i) => v - S.testR2[i] > 0.3 && S.testR2[i] > -0.9);
  if (labelIdx < 0) labelIdx = Math.min(2, ps.length - 1);

  // What the nonsense is made of, counted off the codebook's roles and sources.
  const spur = D.bait.features.filter(f => f.role === "spurious");
  const nNoise = spur.filter(f => f.src === "Synthetic (random)").length;
  const nDerived = spur.filter(f => f.src === "Derived (computed)").length;
  const nJokes = spur.length - nNoise - nDerived;

  const series = ps.map((p, i) => ({ p: p, train: S.trainR2[i], test: S.testR2[i] }));

  // The window of the top panel of scene 4, for the same reason: below -1 the
  // score is a catastrophe, and the stat strip carries its exact value.
  const FLOOR = -1;
  const TOP = 1.08;

  /* =========================================================== initial state */

  let idx = perfect;

  // Dev affordances for headless capture. The slider stays canonical.
  const mode = UI.testMode();
  if (mode === "cliff") idx = cliff;
  else if (mode === "worst") idx = worst;
  else if (mode === "full") idx = last;
  else if (mode === "start") idx = 0;

  /* ================================================================== layout */

  root.appendChild(UI.head(
    "chapter two " + "·" + " the crash",
    "The Scrabble model",
    "Least squares again, fed nothing but nonsense: the Scrabble score of each "
    + "name, the colours in each flag, the length of each anthem."));

  const layout = UI.el("div.scene-layout");
  const left = UI.el("div.s6-col");
  const host = UI.el("div.viz-wrap.s6-panel");
  left.appendChild(host);

  const controls = UI.el("div.controls-row");
  const slider = UI.slider("Nonsense columns", {
    min: 0, max: last, step: 1, value: idx, width: 260,
    format: i => String(ps[i]),
    onInput: i => { idx = i; refresh(); },
  });
  controls.appendChild(slider);
  left.appendChild(controls);

  const right = UI.el("div.text-col.s6-text");
  const scores = UI.el("div.stat-strip.s6-scores");
  const verdict = UI.el("p.s6-verdict");
  right.appendChild(scores);
  right.appendChild(verdict);
  right.appendChild(UI.note("The nonsense",
    UI.el("span", spur.length + " columns: " + nJokes + " jokes like these, "
      + nNoise + " columns of random numbers, and " + nDerived
      + " sines, products and ratios of the jokes.")));

  layout.appendChild(left);
  layout.appendChild(right);
  root.appendChild(layout);

  /* =================================================================== chart */

  function render(g, w, h) {
    const x = d3.scaleLinear().domain([ps[0], ps[last]]).range([0, w]);
    const y = d3.scaleLinear().domain([FLOOR, TOP]).range([h, 0]);

    Plot.axes(g, x, y, w, h, {
      xTicks: 7, yTicks: 5,
      xLabel: "nonsense columns in the fit",
      title: "Train and test R squared, clipped at " + FLOOR,
    });
    // Labelled at the right, where the zero line runs clear of both curves.
    Plot.refLine(g, y(0), w, "R squared = 0, the training mean");

    // p = n, and wherever the slider currently sits.
    const xn = x(nTrain);
    g.append("line").attr("class", "ref-line")
      .attr("x1", xn).attr("x2", xn).attr("y1", 0).attr("y2", h);
    // Top left of its line: the markers and the falling test curve own the
    // bottom of the panel, and the training curve is still low on this side.
    g.append("text").attr("class", "axis-label s6-vlabel")
      .attr("x", xn - 7).attr("y", 12).attr("text-anchor", "end")
      .text("p = n = " + nTrain);
    const xs = x(ps[idx]);
    g.append("line").attr("class", "s6-sel")
      .attr("x1", xs).attr("x2", xs).attr("y1", 0).attr("y2", h);

    /* The test curve leaves through the floor and stays out: a clip lets it
     * run off the edge, which reads correctly, where a break in the line
     * would read as missing data. */
    g.append("clipPath").attr("id", "s6-clip").append("rect")
      .attr("x", 0).attr("y", 0).attr("width", w).attr("height", h);
    const inner = g.append("g").attr("clip-path", "url(#s6-clip)");

    // Both labels sit where the two curves are well apart and on the panel:
    // train above its line, test below its own.
    const at = series[labelIdx];
    Plot.fitLine(inner, series, "train", {
      x: d => x(d.p), y: d => y(d.train),
      labelAt: at, labelDx: 0, labelDy: -10, labelAnchor: "middle",
    });
    Plot.fitLine(inner, series, "test", {
      x: d => x(d.p), y: d => y(d.test),
      labelAt: at, labelDx: 0, labelDy: 20, labelAnchor: "middle",
    });

    marker(g, xs, S.trainR2[idx], y, "train");
    marker(g, xs, S.testR2[idx], y, "test");
  }

  /* A value inside the window gets a dot. A value the clip cut off gets a
   * caret pinned to the floor, so the eye is told the number exists and is
   * below the picture rather than missing. */
  function marker(g, cx, v, y, kind) {
    const dom = y.domain();
    if (v >= dom[0] && v <= dom[1]) {
      g.append("circle").attr("class", "mark s6-dot fill-fit-" + kind)
        .attr("cx", cx).attr("cy", y(v)).attr("r", 4.6);
      return;
    }
    const below = v < dom[0];
    g.append("path").attr("class", "mark s6-dot fill-fit-" + kind)
      .attr("d", d3.symbol().type(d3.symbolTriangle).size(60)())
      .attr("transform", "translate(" + cx + "," + (below ? y(dom[0]) - 8 : y(dom[1]) + 8)
        + ") rotate(" + (below ? 180 : 0) + ")");
  }

  const mount = Plot.mount(host, render,
    { margin: { top: 26, right: 30, bottom: 44, left: 48 } });

  /* ================================================================ verdict */

  const whole = d3.format(",.0f");
  function dollars(v) {
    return (v < 0 ? "minus $" : "$") + whole(Math.abs(v));
  }

  function paintVerdict() {
    const tr = S.trainR2[idx];
    const te = S.testR2[idx];
    scores.replaceChildren(
      UI.stat(Stats.r2(tr), "train, the " + nTrain + " countries it saw"),
      UI.stat(Stats.r2(te), "test, the " + nTest + " it never saw"));

    const lo = S.lowest[idx];
    const opener = tr >= 0.9995
      ? "A perfect score on the countries it saw, from nonsense alone. "
      : "";
    verdict.replaceChildren(
      document.createTextNode(opener + "Its lowest guess for a country it never saw: "),
      UI.el("strong", S.testIso[lo[0]]),
      document.createTextNode(", " + dollars(lo[1]) + " per person. The real figure is "
        + dollars(S.testTrue[lo[0]]) + "."));
  }

  function refresh() {
    paintVerdict();
    mount.redraw();
  }

  slider.setValue(idx);
  paintVerdict();

  // No onEnter, onLeave or key handler: the scene runs no animation and holds
  // no arrow key, so the driver keeps them.
  return {};
};
