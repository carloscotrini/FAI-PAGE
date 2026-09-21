/* Scene 1. One feature at a time.
 *
 * Day one on the job. There are 493 columns and one target, nobody has said
 * which columns matter, so you do the obvious thing and plot.
 *
 * The lesson lives in the marks. Every point carries the chosen feature's role
 * as a shape and a hue, so stepping down the ranking shows a strong
 * correlation wearing each of the three roles in turn. Strength says nothing
 * about role.
 *
 * Interaction: single state, direct. A feature picker, one button that steps
 * down the strength ranking, and a toggle for the y axis. No step engine.
 *
 * Globals used: d3, Plot, UI, Stats, DATA. */

window.scenes.scene1 = function (root) {
  const D = window.DATA;
  const FEATS = D.bait.features;

  /* ================================================ state and derived tables */

  // One ranking for the whole scene: |r| against log10 GDP, strongest first.
  // That is the payload's headline correlation, DATA.bait.features[i].r.
  const ranked = FEATS.slice().sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  const byKey = new Map(FEATS.map(f => [f.key, f]));
  const rankOf = new Map(ranked.map((f, i) => [f.key, i]));

  const logGdp = D.gdp.map(Stats.log10);

  let key = ranked[0].key;    // the strongest correlation in the payload
  let yMode = "log";

  // Dev affordances for headless capture. The click stays canonical, and
  // &run has nothing to trip here: no content is gated behind a button.
  const test = UI.testMode();
  if (test === "raw") yMode = "raw";
  if (test === "spurious" || test === "incidental" || test === "causal") {
    const first = ranked.find(f => f.role === test);
    if (first) key = first.key;
  }
  // The worst case for the right column: the longest name and description in
  // the payload. A screenshot cannot reach it through the picker by hand.
  if (test === "widest") {
    key = FEATS.slice().sort((a, b) =>
      (Stats.pretty(b.key).length + b.desc.length)
      - (Stats.pretty(a.key).length + a.desc.length))[0].key;
  }

  function feature() { return byKey.get(key); }
  function activeR(f) { return yMode === "log" ? f.r : f.rRaw; }

  /* ============================================================== the header */

  root.appendChild(UI.head(
    "Chapter one, the bait",
    "One feature at a time.",
    "Pick a column, plot it against GDP, read the correlation."));

  /* ============================================================ the controls */

  const controls = UI.el("div.controls-row");

  const sel = UI.el("select", { "aria-label": "Feature" });
  function optionFor(f) {
    return UI.el("option", { value: f.key },
      Stats.corr(Math.abs(f.r)) + "  " + Stats.pretty(f.key));
  }
  function group(label, list) {
    const gEl = UI.el("optgroup", { label: label });
    list.forEach(f => gEl.appendChild(optionFor(f)));
    sel.appendChild(gEl);
  }
  const featuredKeys = Plot.ROLES.map(r => D.featured[r] || []).flat();
  group("Twelve to start with",
    featuredKeys.map(k => byKey.get(k)).filter(Boolean)
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r)));
  group("All " + FEATS.length + ", strongest first", ranked);
  sel.value = key;
  sel.addEventListener("change", () => { key = sel.value; paint(); });
  controls.appendChild(UI.el("div.control", UI.el("label", "Feature"), sel));

  // Deterministic: one step down the same ranking the picker is sorted by,
  // wrapping back to the strongest at the end.
  controls.appendChild(UI.button("Next in the ranking", () => {
    key = ranked[(rankOf.get(key) + 1) % ranked.length].key;
    paint();
  }, "small"));

  const yToggle = UI.toggleGroup(
    [{ label: "Log scale", value: "log" }, { label: "Dollars", value: "raw" }],
    { value: yMode, onChange: v => { yMode = v; paint(); } });
  controls.appendChild(UI.el("div.control", UI.el("label", "GDP axis"), yToggle));

  root.appendChild(controls);

  /* ============================================================== the layout */

  const layout = UI.el("div.scene-layout");
  const vizWrap = UI.el("div.viz-wrap");
  const textCol = UI.el("div.text-col.s1-text");
  layout.appendChild(vizWrap);
  layout.appendChild(textCol);
  root.appendChild(layout);

  /* ======================================================== the right column */

  const heroVal = UI.el("div.s1-hero-value.tabular", "0.00");
  const heroCap = UI.el("div.s1-hero-cap");
  const hero = UI.el("div.s1-hero", heroVal, heroCap);
  textCol.appendChild(hero);

  const nameEl = UI.el("div.s1-name", "");
  const descEl = UI.el("div.s1-desc", "");
  const srcEl = UI.el("div.s1-src", "");
  textCol.appendChild(UI.el("div.s1-id", nameEl, descEl, srcEl));

  const roleLine = UI.el("div.s1-role");
  textCol.appendChild(roleLine);

  const stats = UI.el("div.s1-stats");
  textCol.appendChild(stats);

  textCol.appendChild(UI.callout("The point",
    UI.el("p", "A strong correlation looks the same whichever role it carries. "
      + "Only the codebook says which, and on the job there is none.")));

  textCol.appendChild(UI.note("What the numbers are",
    UI.sentence("Least squares line. Pearson's ", UI.itex("r"), " runs from ",
      UI.itex("-1"), " to ", UI.itex("1"), " and ", UI.itex("|r|"),
      " is its size. The rank is against ", UI.itex("\\log_{10}"), " GDP.")));

  /* =============================================================== the chart */

  function points() {
    const xs = D.columns[key];
    const ys = yMode === "log" ? logGdp : D.gdp;
    const out = [];
    for (let i = 0; i < xs.length; i++) {
      if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) out.push({ i: i, x: xs[i], y: ys[i] });
    }
    return out;
  }

  /* The least squares line, cut back to the part of itself that lies inside
   * the plotted y range. Without this a steep line leaves the panel through
   * the top or the bottom and paints over the axis. */
  function fitSegment(fit, xd, yd) {
    if (!fit) return null;
    let a = xd[0], b = xd[1];
    if (Math.abs(fit.m) > 1e-12) {
      const c = (yd[0] - fit.b) / fit.m;
      const d = (yd[1] - fit.b) / fit.m;
      a = Math.max(a, Math.min(c, d));
      b = Math.min(b, Math.max(c, d));
    } else if (fit.b < yd[0] || fit.b > yd[1]) {
      return null;
    }
    if (!(b > a)) return null;
    return [{ x: a, y: fit.m * a + fit.b }, { x: b, y: fit.m * b + fit.b }];
  }

  function drawChart(g, iw, ih) {
    const f = feature();
    const pts = points();
    if (!pts.length) return;

    let xd = d3.extent(pts, p => p.x);
    if (xd[0] === xd[1]) xd = [xd[0] - 0.5, xd[1] + 0.5];
    const x = d3.scaleLinear().domain(xd).nice().range([0, iw]);
    const y = d3.scaleLinear().domain(d3.extent(pts, p => p.y)).nice().range([ih, 0]);

    Plot.axes(g, x, y, iw, ih, {
      xTicks: 6, yTicks: 5,
      yFormat: yMode === "log" ? (d => Stats.usd(Math.pow(10, d))) : (d => Stats.usd(d)),
      xLabel: Stats.pretty(key),
      yLabel: yMode === "log" ? "GDP per capita, log scale" : "GDP per capita, US dollars",
    });

    Plot.scatter(g, pts, {
      x: p => x(p.x), y: p => y(p.y),
      role: () => f.role, area: 46,
      title: p => D.countries[p.i] + ", " + Stats.usd(D.gdp[p.i])
        + ", " + Stats.pretty(key) + " " + p.x,
    });

    // The fit goes on TOP of the marks. Drawn first, its label sits under
    // 254 points and no halo can rescue it.
    const seg = fitSegment(Stats.fitLine(pts.map(p => p.x), pts.map(p => p.y)),
      x.domain(), y.domain());
    if (seg) {
      // Label the end of the line that sits higher, so it never lands on the
      // x axis, and anchor it inwards so it never leaves the panel.
      const top = seg[0].y >= seg[1].y ? seg[0] : seg[1];
      const atRight = top === seg[1];
      Plot.fitLine(g, seg, "test", {
        x: p => x(p.x), y: p => y(p.y),
        labelAt: top, labelText: "least squares",
        labelAnchor: atRight ? "end" : "start",
        labelDx: atRight ? -5 : 5, labelDy: -9,
      });
    }
  }

  const chart = Plot.mount(vizWrap, drawChart, { margin: { top: 20, right: 26, bottom: 46, left: 62 } });

  /* ================================================================== paint */

  function paint() {
    const f = feature();
    if (sel.value !== key) sel.value = key;
    yToggle.select(yMode);

    heroVal.textContent = Stats.corr(Math.abs(activeR(f)));
    heroCap.textContent = "";
    heroCap.appendChild(UI.itex("|r|"));
    heroCap.appendChild(document.createTextNode(" against "));
    if (yMode === "log") {
      heroCap.appendChild(UI.itex("\\log_{10}"));
      heroCap.appendChild(document.createTextNode(" GDP per capita"));
    } else {
      heroCap.appendChild(document.createTextNode("GDP per capita in dollars"));
    }

    nameEl.textContent = Stats.pretty(f.key);
    descEl.textContent = f.desc;
    srcEl.textContent = "Source: " + f.src;

    roleLine.textContent = "";
    const mark = d3.select(roleLine).append("svg")
      .attr("width", 18).attr("height", 18).attr("viewBox", "-9 -9 18 18");
    mark.append("path")
      .attr("class", "mark " + Plot.roleClass(f.role))
      .attr("d", Plot.rolePath(f.role, 86));
    roleLine.appendChild(UI.el("span.s1-role-name." + Plot.roleClass(f.role), f.role));
    roleLine.appendChild(UI.el("span.s1-role-gloss", Plot.ROLE_GLOSS[f.role]));

    stats.textContent = "";
    // Built by hand: UI.statStrip passes an array as UI.el's second argument,
    // which UI.el reads as an attribute bag, so it renders empty.
    const strip = UI.el("div.stat-strip");
    [[Stats.corr(activeR(f)), "signed r"],
     [(rankOf.get(f.key) + 1) + " of " + FEATS.length, "strength rank"]]
      .forEach(pair => strip.appendChild(UI.stat(pair[0], pair[1])));
    stats.appendChild(strip);

    chart.redraw();
  }

  paint();

  // Nothing to stop on the way out: no timer, no animation, no shared state.
  return {};
};
