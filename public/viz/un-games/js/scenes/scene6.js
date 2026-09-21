/* Scene 6. Regularisation, the patch.
 *
 * The crater of scene 4 is a fitting problem, and one extra knob fixes it.
 * Three penalty families get one panel each: SMALL MULTIPLES rather than three
 * curves on a shared axis. That is a colour decision before it is a layout
 * decision. A three way categorical split cannot be kept safe under
 * protanopia, deuteranopia and tritanopia at once, so no third fit hue exists;
 * each panel instead reuses the same two, train and test, and the panel title
 * carries the family. See the note at the foot of precompute/palette.py.
 *
 * Interaction: SINGLE STATE, direct. One alpha slider drives a marker in all
 * three panels and the readout under each of them. One toggle swaps what the
 * panels plot, the score or the number of coefficients still standing. No step
 * engine: the lesson is a relationship the student probes by dragging.
 *
 * Every number on the screen is read out of DATA.patch, or derived here from
 * DATA.columns. Nothing is typed in by hand.
 *
 * Globals used: d3, Plot, UI, Stats, DATA. */

window.scenes.scene6 = function (root) {
  const D = window.DATA;
  const PATCH = D.patch;
  const ALPHAS = PATCH.alphas;
  const N = ALPHAS.length;
  const NFEAT = PATCH.nFeatures;
  const OLS = PATCH.olsBaseline;

  const FAMILIES = [
    { key: "ridge", name: "Ridge" },
    { key: "lasso", name: "Lasso" },
    { key: "elasticnet", name: "Elastic net" },
  ];

  /* The y window, clamped on purpose. Lasso's test score falls to about minus
   * four at the left of its sweep, and a panel scaled to hold that would push
   * the whole story, the climb from 0.33 to 0.60, into its top eighth. The
   * panels therefore stop at Y_FLOOR, the curves are clipped there, and the
   * foot of the scene says so in words with the real depth of the dip. */
  const Y_FLOOR = -0.5;
  const Y_TOP = 1.05;
  const KEPT_TOP = 520;

  /* Derived facts, all of them read off the payload rather than typed in. */

  // The deepest point of the lasso sweep, quoted in the clamp note.
  const lassoTest = PATCH.models.lasso.testR2;
  let dipAt = 0;
  for (let i = 0; i < N; i++) if (lassoTest[i] < lassoTest[dipAt]) dipAt = i;

  // A column holding one value for every country carries no information, so no
  // penalty can give it a coefficient. This is why ridge tops out below 493.
  const nConstant = Object.keys(D.columns).filter(k => {
    const v = D.columns[k];
    for (let i = 1; i < v.length; i++) if (v[i] !== v[0]) return false;
    return true;
  }).length;

  // The alpha whose three test scores are jointly highest. Used only by the
  // headless flags, so a capture can reach the rescued state without dragging.
  let jointBest = 0, jointScore = -Infinity;
  for (let i = 0; i < N; i++) {
    let s = 0;
    FAMILIES.forEach(f => { s += PATCH.models[f.key].testR2[i]; });
    if (s > jointScore) { jointScore = s; jointBest = i; }
  }

  /* State. Two numbers, and both of them come from a control. */
  let idx = 0;
  let mode = "r2";

  const test = UI.testMode();
  if (test === "kept") mode = "kept";
  if (UI.flag("run") || test === "best" || test === "kept") idx = jointBest;

  /* ================================================================== chrome */

  root.appendChild(UI.head(
    "Chapter three, the patch",
    "Regularisation",
    "One extra knob drags the test score out of the crater."));

  const alphaSlider = UI.slider("alpha", {
    min: 0, max: N - 1, step: 1, value: idx, width: 300,
    format: v => Stats.alpha(ALPHAS[v]),
    onInput: v => { idx = v; refresh(); },
  });

  const modeToggle = UI.toggleGroup(
    [{ label: "R squared", value: "r2" }, { label: "Coefficients kept", value: "kept" }],
    { value: mode, onChange: v => { mode = v; refresh(); } });

  root.appendChild(UI.el("div.controls-row",
    alphaSlider,
    UI.el("div.control", UI.el("label", "Panels show"), modeToggle)));

  const layout = UI.el("div.scene-layout.s6-layout");
  const left = UI.el("div.s6-left");
  const grid = UI.el("div.s6-grid");
  left.appendChild(grid);

  const spread = "The three best alphas sit at "
    + FAMILIES.map(f => Stats.alpha(PATCH.models[f.key].bestAlpha)).join(", ")
    + ", so one slider position cannot suit all three.";

  const FOOT = {
    r2: "Panels stop at R squared " + Y_FLOOR.toFixed(1) + ". Lasso's test score dips to "
      + Stats.r2(lassoTest[dipAt]) + " at alpha " + Stats.alpha(ALPHAS[dipAt])
      + " and leaves the frame. " + spread,
    kept: "Ridge holds every column that varies, at every alpha on the sweep. Lasso "
      + "falls from " + PATCH.models.lasso.nonzero[0] + " to "
      + Math.min.apply(null, PATCH.models.lasso.nonzero) + " across it, and elastic net "
      + "follows late. " + spread,
  };

  const foot = UI.el("div.s6-foot.small.muted", FOOT.r2);
  left.appendChild(foot);
  layout.appendChild(left);

  const textCol = UI.el("div.text-col.s6-text");
  layout.appendChild(textCol);
  root.appendChild(layout);

  /* ================================================================== panels */

  function readoutCell(label, cls) {
    const value = UI.el("span.s6-v.tabular", "");
    const node = UI.el("div.s6-cell", UI.el("span.s6-k." + cls, label), value);
    return { node, value };
  }

  const panels = FAMILIES.map(f => {
    const m = PATCH.models[f.key];
    const card = UI.el("div.s6-panel");

    card.appendChild(UI.el("div.s6-panel-head",
      UI.el("span.s6-family", f.name),
      UI.el("span.s6-best",
        "best test " + Stats.r2(m.bestTestR2) + " at alpha " + Stats.alpha(m.bestAlpha)
        + ", keeps " + m.bestNonzero)));

    const chart = UI.el("div.s6-chart");
    card.appendChild(chart);

    const cells = {
      train: readoutCell("train", "k-train"),
      test: readoutCell("test", "k-test"),
      kept: readoutCell("kept", "k-kept"),
    };
    card.appendChild(UI.el("div.s6-readout",
      cells.train.node, cells.test.node, cells.kept.node));

    grid.appendChild(card);

    const mount = Plot.mount(chart, (g, iw, ih) => drawPanel(f, m, g, iw, ih),
      { margin: { top: 18, right: 14, bottom: 48, left: 48 } });

    return { f, m, mount, cells };
  });

  /* One panel. Both modes share the x scale, the best alpha rule and the
   * scrubber, so the two readings of the same sweep stay comparable. */
  function drawPanel(f, m, g, iw, ih) {
    const x = d3.scaleLog().domain([ALPHAS[0], ALPHAS[N - 1]]).range([0, iw]);
    const y = d3.scaleLinear()
      .domain(mode === "r2" ? [Y_FLOOR, Y_TOP] : [0, KEPT_TOP])
      .range([ih, 0]);

    const clipId = "s6-clip-" + f.key;
    g.append("defs").append("clipPath").attr("id", clipId)
      .append("rect").attr("x", -3).attr("y", -8)
      .attr("width", iw + 6).attr("height", ih + 8);

    Plot.axes(g, x, y, iw, ih, {
      xTicks: 4,
      xFormat: a => Stats.alpha(a),
      yTicks: 5,
      yFormat: mode === "r2" ? d3.format(".1f") : d3.format("d"),
      xLabel: "alpha",
      yLabel: f.key === "ridge"
        ? (mode === "r2" ? "R squared" : "coefficients kept")
        : null,
    });

    /* Small multiples annotate once: the reference runs across all three
     * panels and only the leftmost one carries its name. The label is drawn
     * here rather than by Plot.refLine, which anchors it at the right edge
     * where every one of these panels has a curve passing through. */
    const refY = y(mode === "r2" ? OLS.testR2 : NFEAT);
    Plot.refLine(g, refY, iw, null);
    if (f.key === FAMILIES[0].key) {
      g.append("text").attr("class", "axis-label")
        .attr("x", 2).attr("y", refY - 9).attr("text-anchor", "start")
        .text(mode === "r2" ? "least squares" : NFEAT + " features");
    }

    const plot = g.append("g").attr("clip-path", "url(#" + clipId + ")");
    const pts = d3.range(N);
    const px = i => x(ALPHAS[i]);

    if (mode === "r2") {
      Plot.fitLine(plot, pts, "train",
        { x: px, y: i => y(m.trainR2[i]), labelAt: 2, labelDy: 16 });
      Plot.fitLine(plot, pts, "test",
        { x: px, y: i => y(m.testR2[i]), labelAt: 2, labelDy: 16 });
    } else {
      plot.append("path").attr("class", "s6-count")
        .attr("d", d3.line().x(px).y(i => y(m.nonzero[i]))(pts));
      plot.append("text").attr("class", "s6-count-label")
        .attr("x", px(2) + 6).attr("y", y(m.nonzero[2]) + 17)
        .text("kept");
    }

    // The family's own best alpha, dashed and vertical, against the flat
    // dashed reference which is horizontal. Orientation separates them.
    const bx = x(m.bestAlpha);
    g.append("line").attr("class", "s6-bestline")
      .attr("x1", bx).attr("x2", bx).attr("y1", 0).attr("y2", ih);
    g.append("text").attr("class", "s6-bestlabel")
      .attr("x", bx).attr("y", -5).attr("text-anchor", "middle").text("best");

    // The scrubber: where the shared slider currently stands.
    const cx = x(ALPHAS[idx]);
    g.append("line").attr("class", "s6-scrub")
      .attr("x1", cx).attr("x2", cx).attr("y1", 0).attr("y2", ih);

    if (mode === "r2") {
      marker(g, cx, m.trainR2[idx], y, "fill-fit-train");
      marker(g, cx, m.testR2[idx], y, "fill-fit-test");
    } else {
      marker(g, cx, m.nonzero[idx], y, "s6-count-dot");
    }
  }

  /* A value inside the window gets a dot. A value the clamp cut off gets a
   * caret pinned to the edge it left through, so the eye is told the number
   * exists and is off the picture rather than missing. */
  function marker(g, cx, v, y, cls) {
    const dom = y.domain();
    if (v >= dom[0] && v <= dom[1]) {
      g.append("circle").attr("class", "s6-dot " + cls)
        .attr("cx", cx).attr("cy", y(v)).attr("r", 4.4);
      return;
    }
    const below = v < dom[0];
    const edge = below ? y(dom[0]) - 7 : y(dom[1]) + 7;
    g.append("path").attr("class", "s6-dot " + cls)
      .attr("d", d3.symbol().type(d3.symbolTriangle).size(56)())
      .attr("transform", "translate(" + cx + "," + edge + ") rotate("
        + (below ? 180 : 0) + ")");
  }

  /* ============================================================ the text side */

  textCol.appendChild(UI.tex(
    "\\sum_i \\bigl(y_i - \\hat{y}_i\\bigr)^2 \\;+\\; \\alpha \\cdot \\mathrm{size}(w)"));

  textCol.appendChild(UI.el("p",
    "The fit minimises that. ", UI.itex("\\alpha"),
    " is the price of a big coefficient. ", UI.itex("\\mathrm{size}(w)"),
    " is ", UI.itex("\\textstyle\\sum_j w_j^2"), " for ridge and ",
    UI.itex("\\textstyle\\sum_j |w_j|"), " for lasso, and elastic net charges both."));

  textCol.appendChild(UI.el("p",
    "Squaring shrinks coefficients and keeps them all. Absolute values push many "
    + "to exactly zero, so lasso alone drops features."));

  /* Short on purpose. The right column has to hold the formula, these two
   * paragraphs, this note and BOTH legend rows inside the stage at 1280x800,
   * and .text-col scrolls when it cannot: the scrollbar then narrows the
   * column, rewraps every paragraph wider and pushes the last legend row off
   * the bottom. The per family counts that used to sit here are already
   * printed in all three panel heads, so they went rather than the legend. */
  textCol.appendChild(UI.note("Least squares on everything",
    "Least squares on all " + NFEAT + " features scores train " + Stats.r2(OLS.trainR2)
    + " and test " + Stats.r2(OLS.testR2) + ". Every panel draws that test score flat, "
    + "so the climb above it is the rescue. Ridge tops out at " + (NFEAT - nConstant)
    + " because " + nConstant + " of the columns never vary."));

  const legendHost = UI.el("div.s6-legend");
  Plot.fitLegend(legendHost, {
    gloss: {
      train: D.crash.nTrain + " fitted",
      test: D.crash.nTest + " held out",
    },
  });
  textCol.appendChild(legendHost);

  /* ================================================================= refresh */

  function refresh() {
    legendHost.style.display = mode === "r2" ? "" : "none";
    foot.textContent = FOOT[mode];
    panels.forEach(p => {
      p.mount.redraw();
      p.cells.train.value.textContent = Stats.r2(p.m.trainR2[idx]);
      p.cells.test.value.textContent = Stats.r2(p.m.testR2[idx]);
      p.cells.kept.value.textContent = String(p.m.nonzero[idx]);
    });
  }

  refresh();

  /* A headless capture cannot drag, so test=slide drives the real input and
   * fires the real event, which puts the whole slider path under the
   * screenshot rather than only the function behind it. Dev affordance.
   * The target is ridge's own best alpha, read off the payload. */
  if (test === "slide") {
    const input = alphaSlider.input;
    input.value = String(PATCH.models.ridge.bestIndex);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Nothing to tear down: the mounts survive a revisit.
  return {};
};
