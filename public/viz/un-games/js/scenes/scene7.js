/* Scene 7. What the models kept.
 *
 * The twin of scene 6 and the answer to it. Scene 6 fixes prediction, this one
 * asks what the fixed model believes, and the relief stops. Two ranked lists,
 * lasso by absolute coefficient and the random forest by Gini importance, each
 * bar in its feature's role colour and carrying its role's marker shape. The
 * two value scales are different units, so each list gets its own x scale and
 * says on its own head what it measures.
 *
 * The six features both models rank in their top twenty are marked with an ink
 * tick at the left edge of the row. That signal is deliberately not a hue: the
 * hues are spoken for by the three roles, and a fourth would collide with one
 * of them under at least one dichromacy.
 *
 * Interaction: SINGLE STATE, direct. Hover a row for the full name, the value
 * and the role. One toggle reorders the rows by role. No step engine.
 *
 * Every number comes out of DATA.reveal. Nothing is typed in by hand.
 *
 * Globals used: d3, Plot, UI, Stats, DATA. */

window.scenes.scene7 = function (root) {
  const D = window.DATA;
  const R = D.reveal;
  const NFEAT = R.nFeatures;
  const OVERLAP = R.overlap;
  const SHARED = {};
  OVERLAP.forEach(k => { SHARED[k] = true; });

  const ROLE_ORDER = { causal: 0, spurious: 1, incidental: 2 };

  const LISTS = [
    {
      key: "lasso",
      name: "Lasso",
      rows: R.lasso.top20,
      score: "test R squared " + Stats.r2(R.lasso.testR2)
        + ", " + R.lasso.nonzero + " of " + NFEAT + " kept",
      unit: "coefficient size, US dollars per standard deviation",
      value: d3.format(",.0f"),
      tick: d3.format(",.0f"),
    },
    {
      key: "rf",
      name: "Random forest",
      rows: R.rf.top20,
      score: "test R squared " + Stats.r2(R.rf.testR2),
      unit: "Gini importance, share of the total",
      value: d3.format(".3f"),
      tick: d3.format(".2f"),
    },
  ];

  /* State. One sort order, one hovered row. */
  let sortBy = "value";
  let hover = null;

  const test = UI.testMode();
  if (test === "role") sortBy = "role";

  /* ================================================================== chrome */

  root.appendChild(UI.head(
    "Chapter four, the reveal",
    "What the models kept",
    "Both models predict well. They disagree about which features matter, and "
    + "nothing in the data settles it."));

  const sortToggle = UI.toggleGroup(
    [{ label: "Value", value: "value" }, { label: "Role", value: "role" }],
    { value: sortBy, onChange: v => { sortBy = v; redrawAll(); } });

  const roleKey = UI.el("div.s7-rolekey");
  Plot.roleLegend(roleKey, {});

  /* Both models rank one column of pure synthetic noise inside their top
   * twenty, and it is one of the few things they agree on. Read off the roles
   * rather than named here, so a rebuilt payload cannot leave this line
   * asserting something that stopped being true. */
  const rowOf = {};
  LISTS.forEach(L => L.rows.forEach(d => { if (!rowOf[d.key]) rowOf[d.key] = d; }));
  const sharedSpurious = OVERLAP.filter(k => rowOf[k] && rowOf[k].role === "spurious");

  let sharedText = OVERLAP.length + " features appear in both lists";
  if (sharedSpurious.length === 1) {
    sharedText += ", and one is " + rowOf[sharedSpurious[0]].desc.toLowerCase();
  } else if (sharedSpurious.length > 1) {
    sharedText += ", " + sharedSpurious.length + " of them spurious";
  }

  const sharedKey = UI.el("div.s7-sharedkey");
  d3.select(sharedKey).append("svg")
    .attr("width", 8).attr("height", 15).attr("viewBox", "0 0 8 15")
    .append("rect").attr("class", "s7-tick")
    .attr("x", 1).attr("y", 0).attr("width", 3).attr("height", 15);
  sharedKey.appendChild(UI.el("span", sharedText));

  root.appendChild(UI.el("div.controls-row",
    UI.el("div.control", UI.el("label", "Order rows by"), sortToggle),
    roleKey, sharedKey));

  const grid = UI.el("div.s7-grid");
  root.appendChild(grid);

  const detail = UI.el("div.s7-detail");
  root.appendChild(detail);

  /* =================================================================== lists */

  LISTS.forEach(L => {
    const card = UI.el("div.s7-col");
    card.appendChild(UI.el("div.s7-col-head",
      UI.el("span.s7-model", L.name),
      UI.el("span.s7-score", L.score),
      UI.el("span.s7-unit", L.unit)));

    const chart = UI.el("div.s7-chart");
    card.appendChild(chart);
    grid.appendChild(card);

    L.mount = Plot.mount(chart, (g, iw, ih) => drawList(L, g, iw, ih),
      { margin: { top: 30, right: 6, bottom: 28, left: 4 } });
  });

  function ordered(L) {
    if (sortBy === "value") return L.rows;
    return L.rows.slice().sort((a, b) =>
      (ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) || (b.value - a.value));
  }

  /* Shorten a label to a pixel budget and keep the full name for the hover
   * line and the native tooltip. Binary search rather than a character at a
   * time: this runs for forty labels on every resize. */
  function fitText(node, full, maxW) {
    node.textContent = full;
    if (node.getComputedTextLength() <= maxW) return;
    let lo = 1, hi = full.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      node.textContent = full.slice(0, mid) + "...";
      if (node.getComputedTextLength() <= maxW) lo = mid; else hi = mid - 1;
    }
    node.textContent = full.slice(0, lo).replace(/[\s,]+$/, "") + "...";
  }

  function drawList(L, g, iw, ih) {
    const rows = ordered(L);
    const barX = Math.max(140, Math.round(iw * 0.40));
    const valW = 46;
    const x = d3.scaleLinear()
      .domain([0, d3.max(rows, d => d.value)])
      .range([barX, Math.max(barX + 20, iw - valW)]);
    const y = d3.scaleBand()
      .domain(d3.range(rows.length)).range([0, ih]).paddingInner(0.26);
    const bh = y.bandwidth();
    const step = y.step();

    // The role mix, drawn in the top margin: one marker per feature in the
    // list, grouped by role, with the count in front of each group.
    let mx = 0;
    ["causal", "spurious", "incidental"].forEach(role => {
      const n = rows.filter(d => d.role === role).length;
      if (!n) return;
      g.append("text").attr("class", "s7-mixn tabular")
        .attr("x", mx).attr("y", -14).attr("dy", "0.34em").text(n);
      mx += 8 + String(n).length * 7;
      for (let i = 0; i < n; i++) {
        g.append("path").attr("class", "mark " + Plot.roleClass(role))
          .attr("d", Plot.rolePath(role, 40))
          .attr("transform", "translate(" + mx + ",-14)");
        mx += 12.5;
      }
      mx += 12;
    });

    g.append("g").attr("class", "axis")
      .attr("transform", "translate(0," + ih + ")")
      .call(d3.axisBottom(x).ticks(4).tickFormat(L.tick).tickSizeOuter(0));

    const rowSel = g.selectAll("g.s7-row").data(rows).join("g")
      .attr("class", "s7-row")
      .attr("transform", (d, i) => "translate(0," + y(i) + ")");

    rowSel.each(function (d) {
      const r = d3.select(this);

      if (SHARED[d.key]) {
        r.append("rect").attr("class", "s7-tick")
          .attr("x", 0).attr("y", 0).attr("width", 3.5).attr("height", bh);
      }

      r.append("path").attr("class", "mark " + Plot.roleClass(d.role))
        .attr("d", Plot.rolePath(d.role, 40))
        .attr("transform", "translate(15," + (bh / 2) + ")");

      const label = r.append("text").attr("class", "s7-label")
        .attr("x", 25).attr("y", bh / 2).attr("dy", "0.34em");
      fitText(label.node(), d.desc, barX - 33);

      r.append("rect").attr("class", "s7-bar " + Plot.roleClass(d.role))
        .attr("x", barX).attr("y", 0)
        .attr("width", Math.max(1.5, x(d.value) - barX)).attr("height", bh);

      r.append("text").attr("class", "s7-value tabular")
        .attr("x", iw).attr("y", bh / 2).attr("dy", "0.34em")
        .attr("text-anchor", "end").text(L.value(d.value));

      r.append("title").text(d.desc + ", " + L.value(d.value) + ", " + d.role
        + (SHARED[d.key] ? ", in both lists" : ""));

      r.append("rect").attr("class", "s7-hit")
        .attr("x", 0).attr("y", -(step - bh) / 2)
        .attr("width", iw).attr("height", step);
    });

    /* mouseover rather than mouseenter: it bubbles, so the hit rect that
     * covers each row carries it up to the row group, and a synthetic one
     * exercises the same path a real pointer does. */
    rowSel.on("mouseover", (ev, d) => setHover(L, d));

    L.rowSel = rowSel;
    paintHover();
  }

  /* ================================================================== hover */

  function setHover(L, d) {
    hover = { list: L.key, key: d.key };
    setDetail(L, d);
    paintHover();
  }

  function paintHover() {
    LISTS.forEach(L => {
      if (!L.rowSel) return;
      L.rowSel.classed("hot", d => !!hover && hover.list === L.key && hover.key === d.key);
    });
  }

  function setDetail(L, d) {
    detail.textContent = "";
    detail.appendChild(UI.el("span.s7-d-model", L.name));

    const shape = UI.el("span.s7-d-shape");
    d3.select(shape).append("svg")
      .attr("width", 15).attr("height", 15).attr("viewBox", "-7.5 -7.5 15 15")
      .append("path").attr("class", "mark " + Plot.roleClass(d.role))
      .attr("d", Plot.rolePath(d.role, 62));
    detail.appendChild(shape);

    detail.appendChild(UI.el("span.s7-d-role." + Plot.roleClass(d.role), d.role));
    detail.appendChild(UI.el("span.s7-d-name", d.desc));
    detail.appendChild(UI.el("span.s7-d-val.tabular", L.value(d.value)));
    detail.appendChild(UI.el("span.s7-d-unit", L.unit));
    if (SHARED[d.key]) detail.appendChild(UI.el("span.s7-d-shared", "in both lists"));
  }

  function redrawAll() {
    LISTS.forEach(L => L.mount.redraw());
  }

  /* Open on the top row of the first list, so the detail line carries a real
   * reading rather than an instruction. Under &run, open on the highest ranked
   * feature both models kept, which is the row the scene is about. */
  const opening = (UI.flag("run") || test === "shared")
    ? (LISTS[0].rows.filter(d => SHARED[d.key])[0] || LISTS[0].rows[0])
    : LISTS[0].rows[0];
  setHover(LISTS[0], opening);

  /* A headless capture has no pointer, so test=hover fires a real event at a
   * real row and the screenshot then proves the whole hover path rather than
   * just the function behind it. Dev affordance, never a user feature. */
  if (test === "hover") {
    const node = LISTS[1].rowSel.nodes()[8];
    const hit = node && node.querySelector(".s7-hit");
    if (hit) hit.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  }

  // Nothing to tear down: the mounts survive a revisit.
  return {};
};
