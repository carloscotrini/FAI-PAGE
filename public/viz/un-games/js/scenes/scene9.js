/* Scene 9. Takeaways.
 *
 * The close. Six lines, one per chapter beat, each one anchored to a number
 * the viz has already put on screen. Nothing new is computed here that the
 * student has not seen: every figure below is read or recomputed straight out
 * of DATA, so a change upstream moves this card with it.
 *
 * Interaction: none. This is a card the lecturer talks over, which is why it
 * carries no control and no step engine.
 *
 * The one picture is the crash sparkline, chapter two seen from a distance:
 * train climbing while test falls out of the frame. It is a quarter of the
 * scene, it has no axes and no ticks, and it exists so the last slide is not
 * a wall of type.
 *
 * Globals used: d3, Plot, UI, Stats, DATA. */

window.scenes.scene9 = function (root) {
  const D = window.DATA;

  /* ================================================ every number, from DATA */

  // 1. The ranking of the 50 strongest correlations with log10 GDP.
  const TOP_N = 50;
  const ranked = D.bait.features.slice().sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  const top = ranked.slice(0, TOP_N);
  const nIncidental = top.filter(f => f.role === "incidental").length;
  const nCausalTop = top.filter(f => f.role === "causal").length;

  // 2. The strongest spurious column, and the causal columns it outranks.
  const strongestSpurious = ranked.find(f => f.role === "spurious");
  const causalBeaten = ranked.filter(
    f => f.role === "causal" && Math.abs(f.r) < Math.abs(strongestSpurious.r)).length;
  const nCausal = D.meta.roleCounts.causal;

  // 3. The crash, read at p = n_train.
  const C = D.crash;
  const atN = C.ps.indexOf(C.nTrain);
  const trainAtN = C.trainR2[atN];
  const testAtN = C.testR2[atN];
  let worst = 0;
  C.testR2.forEach((v, i) => { if (v < C.testR2[worst]) worst = i; });

  // 4. The patch. Lasso at its best alpha.
  const lasso = D.patch.models.lasso;

  // 5. The reveal. Two models that predict alike and explain differently.
  const R = D.reveal;

  // 6. The trust. OLS, one split against a hundred.
  const olsTrust = D.trust.models[0];

  /* ================================================================== head */

  root.appendChild(UI.head(
    "The close",
    "Takeaways.",
    "Six lines. Every number on them appeared earlier in this viz."));

  const layout = UI.el("div.scene-layout.s9-grid");
  const list = UI.el("div.s9-list");
  const rail = UI.el("div.s9-rail");
  layout.appendChild(list);
  layout.appendChild(rail);
  root.appendChild(layout);

  /* ================================================================= lines */

  function fig(v) { return UI.el("span.s9-fig", String(v)); }

  function item(n, lead, parts) {
    const body = UI.el("div.s9-body", UI.el("span.s9-lead", lead), " ");
    parts.forEach(p => {
      body.appendChild(p instanceof Node ? p : document.createTextNode(String(p)));
    });
    return UI.el("div.s9-item", UI.el("div.s9-num", String(n)), body);
  }

  list.appendChild(item(1, "Correlation ranks symptoms above causes.", [
    "Of the ", fig(TOP_N), " strongest correlations with GDP, ",
    fig(nIncidental), " are incidental and ", fig(nCausalTop), " are causal.",
  ]));

  list.appendChild(item(2, "A feature with no mechanism can still correlate.", [
    "The strongest spurious column reaches ", UI.itex("|r|"), " of ",
    fig(Stats.corr(Math.abs(strongestSpurious.r))),
    ", and it beats ", fig(causalBeaten), " of the ", fig(nCausal), " causal ones.",
  ]));

  list.appendChild(item(3, "More features stop helping and start hurting.", [
    "At ", UI.itex("p = n = " + C.nTrain), " the training score is ",
    fig(Stats.r2(trainAtN)), " and the test score is ", fig(Stats.r2(testAtN)), ".",
  ]));

  list.appendChild(item(4, "Regularisation rescues the prediction.", [
    "Lasso reaches test ", UI.itex("R^2"), " of ", fig(Stats.r2(lasso.bestTestR2)),
    " while keeping ", fig(lasso.bestNonzero), " of the ", fig(D.patch.nFeatures),
    " coefficients.",
  ]));

  list.appendChild(item(5, "A rescued prediction buys you no explanation.", [
    "Lasso and the random forest score ", fig(Stats.r2(R.lasso.testR2)), " and ",
    fig(Stats.r2(R.rf.testR2)), " on the same test set, and they share ",
    fig(R.overlap.length), " of their top ", fig(R.lasso.top20.length), " features.",
  ]));

  list.appendChild(item(6, "One split is not evidence.", [
    "Seed ", fig(D.trust.singleSeed), " handed OLS ",
    fig("+" + Stats.r2(olsTrust.single)), ". Its median over ",
    fig(D.trust.nSplits), " splits is ", fig(Stats.r2(olsTrust.summary.median)), ".",
  ]));

  /* ========================================================= the recall */

  /* The hockey stick, small and without a y axis. The test score runs from
   * +0.57 to -240.8, so a linear axis wide enough for the fall flattens
   * everything else, and a clipped one cuts the curve into fragments: around
   * p = n the score swings between -8 and -240 from one column to the next,
   * which is the instability itself. A symlog axis keeps the whole curve
   * continuous and honest, with the squeeze declared in the caption. */
  const pts = C.ps.map((p, i) => ({ p, train: C.trainR2[i], test: C.testR2[i] }));
  const lo = Math.min(C.testR2[worst], d3.min(C.trainR2));
  const hi = Math.max(d3.max(C.trainR2), d3.max(C.testR2));

  const sparkHost = UI.el("div.viz-wrap.s9-spark");
  rail.appendChild(sparkHost);

  Plot.mount(sparkHost, function (g, iw, ih) {
    const x = d3.scaleLinear().domain([C.ps[0], C.pMax]).range([0, iw]);
    const y = d3.scaleSymlog().constant(1).domain([lo, hi]).range([ih, 0]);

    g.append("line").attr("class", "ref-line")
      .attr("x1", 0).attr("x2", iw).attr("y1", y(0)).attr("y2", y(0));
    g.append("text").attr("class", "s9-mark-label")
      .attr("x", 1).attr("y", y(0) - 5).text("0");

    g.append("line").attr("class", "ref-line")
      .attr("x1", x(C.nTrain)).attr("x2", x(C.nTrain)).attr("y1", 0).attr("y2", ih);
    g.append("text").attr("class", "s9-mark-label")
      .attr("x", x(C.nTrain)).attr("y", -5).attr("text-anchor", "middle")
      .text("p = n");

    Plot.fitLine(g, pts, "train", {
      x: d => x(d.p), y: d => y(d.train),
      labelDx: 6, labelDy: -2,
    });

    Plot.fitLine(g, pts, "test", {
      x: d => x(d.p), y: d => y(d.test),
      labelDx: 6, labelDy: 15,
    });

    g.append("text").attr("class", "s9-mark-label")
      .attr("x", x(C.ps[worst]) + 7).attr("y", y(C.testR2[worst]) + 4)
      .text(Stats.r2(C.testR2[worst]));
  }, { margin: { top: 18, right: 44, bottom: 14, left: 14 } });

  rail.appendChild(UI.el("p.s9-cap",
    "Chapter two, the crash. Columns added from " + C.ps[0] + " to " + C.pMax
    + ", left to right. The vertical scale is squeezed so the whole fall fits on "
    + "one card."));

  /* No gated content, so &run and test= have nothing to reach: this card
   * paints its whole state on entry. */

  return {};
};
