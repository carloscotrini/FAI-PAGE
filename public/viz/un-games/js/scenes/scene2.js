/* Scene 2. All 493 at once.
 *
 * Stop plotting one column at a time and rank every column by the strength of
 * its correlation with GDP per capita. The eye wants the top of that ranking
 * to be the causes of wealth. The top of that ranking is mostly symptoms.
 *
 * Chart shape: three role lanes sharing one x axis, |r| left to right, each
 * lane a deterministic beeswarm. The alternative shape, one 493 row ranked
 * strip, gives every feature a row about one pixel tall at 1280x800, which
 * loses the marker shapes and therefore loses the redundant encoding that this
 * whole viz is built on. Lanes keep the shapes readable and put the two facts
 * this scene has to carry, the mix in the top 50 and the reach of the
 * strongest spurious column, directly on the picture.
 *
 * Interaction: single state, direct. One slider sets how many of the strongest
 * are counted, and the shaded band, the legend counts and the sentence below
 * all follow it. Every count is derived from DATA.bait.features at render time.
 *
 * Globals used: d3, Plot, UI, Stats, DATA. */

window.scenes.scene2 = function (root) {
  const D = window.DATA;
  const FEATS = D.bait.features;

  // Top to bottom. Causal sits above the line that the strongest spurious
  // column draws, so the reach of that column reads upwards.
  const LANES = ["causal", "incidental", "spurious"];

  /* ================================================ derived, nothing pinned */

  function absR(f) { return Math.abs(f.r); }
  const ranked = FEATS.slice().sort((a, b) => absR(b) - absR(a) || (a.key < b.key ? -1 : 1));
  const maxR = absR(ranked[0]);

  const roleTotal = {};
  LANES.forEach(role => { roleTotal[role] = FEATS.filter(f => f.role === role).length; });

  const strongestSpurious = ranked.find(f => f.role === "spurious");
  const spurAbs = absR(strongestSpurious);
  const causalBelow = FEATS.filter(f => f.role === "causal" && absR(f) < spurAbs);

  let k = 50;
  // &run has nothing to trip here: the chart paints in full on entry.
  const test = UI.testMode();
  if (test === "all") k = FEATS.length;
  if (test === "ten") k = 10;

  function threshold() { return absR(ranked[Math.min(k, ranked.length) - 1]); }
  function mix() {
    const m = {};
    LANES.forEach(role => { m[role] = 0; });
    ranked.slice(0, k).forEach(f => { m[f.role] = (m[f.role] || 0) + 1; });
    return m;
  }

  /* ============================================================== the header */

  root.appendChild(UI.head(
    "Chapter one, the bait",
    "All 493 at once.",
    "Every column, ranked by the strength of its correlation with GDP per capita."));

  /* ============================================================ the controls */

  const controls = UI.el("div.controls-row");
  const slider = UI.slider("Count the strongest", {
    min: 10, max: FEATS.length, step: 1, value: k, width: 240,
    onInput: v => { k = v; paint(); },
  });
  controls.appendChild(slider);

  const legendLabel = UI.el("span.s2-legend-label", "");
  const legendHost = UI.el("div.s2-legend-host");
  controls.appendChild(UI.el("div.s2-legend", legendLabel, legendHost));
  root.appendChild(controls);

  /* =============================================================== the chart */

  const vizWrap = UI.el("div.viz-wrap");
  root.appendChild(vizWrap);

  /* A deterministic beeswarm. Points are laid out strongest last within a
   * lane, binned by pixel column, and stacked 0, +1, -1, +2, -2 away from the
   * lane centre. The vertical step shrinks to whatever the deepest stack needs,
   * so a dense lane cannot spill into its neighbour. No randomness anywhere:
   * the same payload gives the same picture on every load. */
  function swarm(list, x, laneCentre, room, binPx) {
    const order = list.map((f, i) => i)
      .sort((a, b) => absR(list[a]) - absR(list[b]) || (list[a].key < list[b].key ? -1 : 1));
    const counts = new Map();
    const slot = new Array(list.length);
    let deepest = 0;
    order.forEach(i => {
      const b = Math.round(x(absR(list[i])) / binPx);
      const c = counts.get(b) || 0;
      counts.set(b, c + 1);
      slot[i] = Math.ceil(c / 2) * (c % 2 === 1 ? 1 : -1);
      if (Math.abs(slot[i]) > deepest) deepest = Math.abs(slot[i]);
    });
    const step = deepest > 0 ? Math.min(binPx, room / deepest) : binPx;
    return list.map((f, i) => ({ f: f, cx: x(absR(f)), cy: laneCentre + slot[i] * step }));
  }

  let hoverKey = null;

  function drawChart(g, iw, ih) {
    const x = d3.scaleLinear().domain([0, maxR]).nice().range([0, iw]);
    const laneH = ih / LANES.length;
    const thr = threshold();

    // The mark and the swarm bin grow with the lane, so the picture that reads
    // at 1280x800 fills the lane at 1920x1080 instead of leaving it half empty.
    const area = Math.max(26, Math.min(46, laneH * 0.22));
    const binPx = Math.max(6, Math.min(9, Math.sqrt(area) * 1.3));

    // The band that holds the strongest k. Chrome, not a category, so it is a
    // low opacity wash of the ink token rather than a colour of its own.
    g.append("rect").attr("class", "s2-band")
      .attr("x", x(thr)).attr("y", 0)
      .attr("width", Math.max(0, iw - x(thr))).attr("height", ih);

    g.append("g").attr("class", "grid").selectAll("line").data(x.ticks(9)).join("line")
      .attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", 0).attr("y2", ih);

    g.append("g").attr("class", "axis")
      .attr("transform", "translate(0," + ih + ")")
      .call(d3.axisBottom(x).ticks(9).tickFormat(d => Stats.corr(d)).tickSizeOuter(0));

    // This axis is LINEAR in |r|. The log belongs to the target it was taken
    // against, so the caption has to attach it there and nowhere else.
    g.append("text").attr("class", "axis-label")
      .attr("x", iw / 2).attr("y", ih + 36).attr("text-anchor", "middle")
      .text("strength of the correlation with log10 GDP per capita");

    // Lanes: a hairline between them, the role name and its count outside the
    // plot on the left, with the role's own marker so the lane is named by
    // shape as well as by hue.
    const marks = [];
    LANES.forEach((role, li) => {
      const centre = laneH * li + laneH / 2;
      if (li > 0) {
        g.append("line").attr("class", "s2-lane-rule")
          .attr("x1", 0).attr("x2", iw).attr("y1", laneH * li).attr("y2", laneH * li);
      }
      // Deliberately NOT class "mark": Plot.scatter joins on path.mark, and a
      // stray one inside g would be pulled into the join with no datum bound.
      g.append("path")
        .attr("class", "s2-lane-mark " + Plot.roleClass(role))
        .attr("d", Plot.rolePath(role, 78))
        .attr("transform", "translate(-104," + centre + ")");
      g.append("text")
        .attr("class", "s2-lane-label " + Plot.roleClass(role))
        .attr("x", -94).attr("y", centre + 4)
        .text(role + ", " + roleTotal[role]);

      swarm(FEATS.filter(f => f.role === role), x, centre, laneH / 2 - 9, binPx)
        .forEach(m => marks.push(m));
    });

    // The reach of the strongest spurious column: a rule at its strength, the
    // causal columns it beats outlined in ink, and a leader to its own mark.
    g.append("line").attr("class", "ref-line")
      .attr("x1", x(spurAbs)).attr("x2", x(spurAbs)).attr("y1", 0).attr("y2", ih);

    g.append("text").attr("class", "s2-annot")
      .attr("x", x(spurAbs)).attr("y", -9).attr("text-anchor", "middle")
      .text("the strongest spurious column");

    g.append("text").attr("class", "s2-annot")
      .attr("x", x(spurAbs) - 10).attr("y", laneH / 2 - 30).attr("text-anchor", "end")
      .text(causalBelow.length + " causal columns fall short of it");

    const spurMark = marks.find(m => m.f.key === strongestSpurious.key);
    if (spurMark) {
      g.append("line").attr("class", "s2-leader")
        .attr("x1", spurMark.cx + 7).attr("x2", spurMark.cx + 38)
        .attr("y1", spurMark.cy).attr("y2", spurMark.cy);
      g.append("text").attr("class", "s2-annot")
        .attr("x", spurMark.cx + 44).attr("y", spurMark.cy + 4).attr("text-anchor", "start")
        .text(Stats.pretty(strongestSpurious.key));
    }

    const outlined = new Set(causalBelow.map(f => f.key));
    outlined.add(strongestSpurious.key);

    Plot.scatter(g, marks, {
      x: m => m.cx, y: m => m.cy,
      role: m => m.f.role, area: area,
      extraClass: m => (outlined.has(m.f.key) ? "hot" : "")
        + (hoverKey === m.f.key ? " s2-lit" : ""),
      title: m => Stats.pretty(m.f.key) + ", r = " + Stats.corr(m.f.r) + ", " + m.f.role,
      on: {
        // Toggle the class on the node itself. A full redraw per hover would
        // rebuild 493 marks and drop the pointer out from under the cursor.
        mouseenter: (ev, m) => {
          hoverKey = m.f.key;
          d3.select(ev.currentTarget).classed("s2-lit", true);
          setHover(m.f);
        },
        mouseleave: ev => {
          hoverKey = null;
          d3.select(ev.currentTarget).classed("s2-lit", false);
          setHover(null);
        },
      },
    });
  }

  const chart = Plot.mount(vizWrap, drawChart,
    { margin: { top: 26, right: 30, bottom: 50, left: 120 } });

  /* ========================================================= under the chart */

  const hoverVal = UI.el("span.s2-hover-value", "");
  const under = UI.el("div.s2-under",
    UI.el("span.s2-hover-label", "Under the pointer"), hoverVal);
  root.appendChild(under);

  function setHover(f) {
    if (!f) {
      hoverVal.textContent = "hover a mark to name it";
      hoverVal.classList.add("muted");
      return;
    }
    hoverVal.classList.remove("muted");
    hoverVal.textContent = Stats.pretty(f.key) + "  " + f.desc
      + "  r = " + Stats.corr(f.r) + ", " + f.role;
  }

  const facts = UI.el("div.s2-facts");
  const factMix = UI.el("p");
  facts.appendChild(factMix);
  root.appendChild(facts);

  // The second fact never moves, so it is built once. Both numbers in it are
  // counted off DATA.bait.features above rather than written down here.
  const factReach = UI.sentence(
    "Strength is ", UI.itex("|r|"), ", the size of the correlation with ",
    UI.itex("\\log_{10}"), " GDP per capita. The strongest spurious column, ",
    UI.el("strong", Stats.pretty(strongestSpurious.key)), ", reaches ",
    UI.itex("|r| = " + Stats.corr(spurAbs)), " and outranks " + causalBelow.length
    + " of the " + roleTotal.causal + " causal columns.");
  facts.appendChild(factReach);

  /* ================================================================== paint */

  function paint() {
    const m = mix();
    legendLabel.textContent = "In the strongest " + k;
    legendHost.textContent = "";
    Plot.roleLegend(legendHost, { roles: LANES, counts: m });

    const byCount = LANES.slice().sort((a, b) => m[b] - m[a] || LANES.indexOf(a) - LANES.indexOf(b));
    factMix.textContent = "Of the " + k + " strongest correlations, "
      + byCount.map(role => m[role] + " " + (m[role] === 1 ? "is " : "are ") + role).join(", ")
        .replace(/, ([^,]*)$/, " and $1")
      + ". The eye wants the top of this ranking to be the causes of wealth. "
      + "The top of this ranking is mostly symptoms.";

    chart.redraw();
  }

  setHover(null);
  paint();

  return {};
};
