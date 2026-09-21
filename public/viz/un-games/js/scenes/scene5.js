/* Scene 5. Predicted against actual.
 *
 * Chapter two, the crash, part two, and the same tonal unit as scene 4. The
 * previous scene showed the crash as a number falling off a cliff. This one
 * shows what that number is made of: one mark per country, the prediction
 * against the truth, with the diagonal as the reference a perfect model would
 * lie on. Train sits on the left and test on the right, so the room watches
 * the left panel lock onto the diagonal while the right panel comes apart.
 *
 * Two chart decisions worth knowing about.
 *
 *   The plot area is forced SQUARE and centred inside its card. Both axes
 *   carry the same dollar scale, so a square is the only shape on which the
 *   identity line reads at 45 degrees, which is the whole point of the
 *   picture.
 *
 *   The axes are CLIPPED. At p = 203 the fit predicts down to -204k and up to
 *   578k dollars against a real range that stops at 177k, and one pair of
 *   outliers would squash every country into a corner. The window is stated
 *   on each card, and the number of points it hides is counted in the browser
 *   and printed there too.
 *
 * There is no role encoding in this chart, so the two panels take the fit
 * axis, fit-train and fit-test, and every mark inside a panel is one series
 * carrying one shape. The shape is a diamond, which no role uses, so nothing
 * here can be misread as a feature role.
 *
 * Interaction: single state, direct. Four buttons over the four snapshots.
 *
 * Globals used: d3, Plot, UI, Stats, DATA. */

window.scenes.scene5 = function (root) {
  const D = window.DATA;
  const C = D.crash;
  const snaps = C.snapshots;

  /* The window both axes run over. The top is the largest GDP per capita in
   * the data. The floor is a design choice, wide enough that no honest
   * prediction is hidden and tight enough that the countries stay legible;
   * every card says what it is and how many marks it costs. */
  const HI = Math.max.apply(null, D.gdp);
  const LO = -25000;

  const TITLES = {
    train: "Train, the " + C.nTrain + " countries the fit saw",
    test: "Test, the " + C.nTest + " it has never seen",
  };

  /* ============================================================ initial state */

  let sel = 0;
  const crashAt = snaps.findIndex(s => s.p === C.nTrain);

  const mode = UI.testMode();
  if (mode && /^p\d+$/.test(mode)) {
    const want = parseInt(mode.slice(1), 10);
    const j = snaps.findIndex(s => s.p === want);
    if (j >= 0) sel = j;
  } else if (UI.flag("run") && crashAt >= 0) {
    sel = crashAt;
  }

  /* ==================================================================== layout */

  root.appendChild(UI.head(
    "chapter two " + "·" + " the crash",
    "Predicted against actual",
    "The same four fits, one country at a time."));

  const controls = UI.el("div.controls-row");
  const toggle = UI.toggleGroup(
    snaps.map((s, i) => ({ label: String(s.p), value: String(i) })),
    { value: String(sel), onChange: v => { sel = Number(v); refresh(); } });
  controls.appendChild(UI.el("div.control", UI.el("label", "Feature columns p"), toggle));
  controls.appendChild(UI.el("span.muted.small",
    "At p = " + C.nTrain + " the fit has one column for every training country."));
  root.appendChild(controls);

  const grid = UI.el("div.pv-grid");
  const cards = {};
  ["train", "test"].forEach(kind => {
    const card = UI.el("div.viz-wrap.pv-panel");
    const plot = UI.el("div.pv-plot");
    const cap = UI.el("div.pv-cap");
    card.appendChild(plot);
    card.appendChild(cap);
    grid.appendChild(card);
    cards[kind] = { plot: plot, cap: cap };
  });
  root.appendChild(grid);

  /* The maths here is assembled from UI.itex nodes. UI.sentence's ["tex"] form
   * would do the same job now that its argument flattening is fixed, and both
   * forms are supported, so this is a style choice rather than a workaround. */
  const foot = UI.el("div.pv-foot");
  foot.appendChild(UI.el("p",
    "Each mark is one country: what it actually earns, ", UI.itex("y"),
    ", across, and what the model predicts, ", UI.itex("\\hat y"),
    ", up. The dashed diagonal is ", UI.itex("\\hat y = y"),
    ", where a perfect prediction lands."));
  root.appendChild(foot);

  /* ==================================================================== charts */

  function inWindow(v) { return v >= LO && v <= HI; }

  function shown(pan) {
    const out = [];
    for (let i = 0; i < pan.yTrue.length; i++) {
      if (!inWindow(pan.yTrue[i]) || !inWindow(pan.yPred[i])) continue;
      out.push({ iso: pan.iso[i], a: pan.yTrue[i], q: pan.yPred[i] });
    }
    return out;
  }

  // One shape for every mark in the scene. A diamond belongs to no feature
  // role, so nothing here reads as causal, spurious or incidental.
  const MARK = d3.symbol().type(d3.symbolDiamond).size(52)();

  function renderPanel(kind) {
    return function (g, iw, ih) {
      const pan = snaps[sel][kind];

      g.append("text").attr("class", "chart-title")
        .attr("x", 0).attr("y", -8).text(TITLES[kind]);

      // Same domain on both axes, and a square plot area, so the identity
      // line lands at 45 degrees.
      const side = Math.max(60, Math.min(iw, ih));
      const box = g.append("g")
        .attr("transform", "translate(" + ((iw - side) / 2) + "," + ((ih - side) / 2) + ")");

      const x = d3.scaleLinear().domain([LO, HI]).range([0, side]);
      const y = d3.scaleLinear().domain([LO, HI]).range([side, 0]);

      Plot.axes(box, x, y, side, side, {
        xTicks: 4, yTicks: 4,
        xFormat: Stats.usd, yFormat: Stats.usd,
        xLabel: "actual GDP per capita",
        yLabel: "predicted",
      });

      box.append("line").attr("class", "ref-line pv-diag")
        .attr("x1", x(LO)).attr("y1", y(LO))
        .attr("x2", x(HI)).attr("y2", y(HI));
      box.append("text").attr("class", "axis-label")
        .attr("x", side - 6).attr("y", 26).attr("text-anchor", "end")
        .text("predicted = actual");

      box.selectAll("path.pv-pt").data(shown(pan)).join("path")
        .attr("class", "mark pv-pt fill-fit-" + kind)
        .attr("d", MARK)
        .attr("transform", d => "translate(" + x(d.a) + "," + y(d.q) + ")")
        .append("title")
        .text(d => d.iso + ": actual " + Stats.usd(d.a)
          + ", predicted " + Stats.usd(d.q));
    };
  }

  const mounts = ["train", "test"].map(kind => Plot.mount(
    cards[kind].plot, renderPanel(kind),
    { margin: { top: 26, right: 18, bottom: 46, left: 58 } }));

  /* =================================================================== refresh */

  function paintCaps() {
    const s = snaps[sel];
    ["train", "test"].forEach(kind => {
      const pan = s[kind];
      const total = pan.yTrue.length;
      const hidden = total - shown(pan).length;
      const r2 = kind === "train" ? s.trainR2 : s.testR2;
      cards[kind].cap.replaceChildren(
        UI.el("div.pv-r2",
          UI.el("span.pv-r2-val.tabular", Stats.r2(r2)),
          UI.el("span.pv-r2-lab", "R squared on these " + total + " countries")),
        UI.el("div.pv-clip.muted.small",
          "Axes clipped to " + Stats.usd(LO) + " and " + Stats.usd(HI) + ". "
          + (hidden === 0
            ? "Every point is inside the window."
            : hidden === 1
              ? "1 of " + total + " falls outside it and is not drawn."
              : hidden + " of " + total + " fall outside it and are not drawn.")));
    });
  }

  function refresh() {
    paintCaps();
    mounts.forEach(m => m.redraw());
  }

  toggle.select(String(sel));
  paintCaps();

  // No onEnter, onLeave or key handler: the scene runs no animation and holds
  // no arrow key, so the driver keeps them.
  return {};
};
