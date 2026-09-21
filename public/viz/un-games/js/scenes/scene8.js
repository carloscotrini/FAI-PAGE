/* Scene 8. One split, then a hundred.
 *
 * Chapter five, the trust. Every number this story has quoted came out of one
 * random train and test split of the 254 countries, seed 42. Deal the cards
 * again ninety nine more times and the single number becomes a wide cloud.
 * The width of that cloud is the lesson.
 *
 * Interaction: single state and direct. One toggle, 100 resampled splits
 * against 5 fold cross validation, and a hover readout that prints the exact
 * score under the pointer. No step engine: the comparison the student has to
 * make is between two marks on the same row, and it is available in one frame.
 *
 * Encoding. No feature roles appear here, so the role palette stays out of it.
 * The cloud is drawn in the train grey and the seed 42 score in the darker test
 * ink, and on top of that tonal difference the seed marker is a DIAMOND with a
 * dashed stem while every resampled score is a small circle. Shape and weight
 * carry it, so the row reads in greyscale.
 *
 * Every number comes from DATA.trust. The quartiles, the medians, the off
 * chart counts and the count of negative splits are recomputed here from the
 * raw score arrays rather than read out of the stored summary, so nothing on
 * the slide can drift from the payload.
 *
 * Globals used: d3, Plot, UI, Stats, DATA. */

window.scenes.scene8 = function (root) {
  const D = window.DATA;
  const T = D.trust;

  /* ===================================================== the clamped x axis */

  /* OLS reaches -9.49 on its worst split while every other model lives inside
   * roughly [-2.15, 0.92]. On a shared axis wide enough for the worst case,
   * four of the five rows collapse into a smear. So the axis is clamped and
   * the points outside it are drawn at the wall and counted out loud. The
   * clamp is the same in both modes on purpose, so the toggle compares like
   * with like. */
  const CLAMP_LO = -2;
  const CLAMP_HI = 1;

  /* ============================================================ the jitter */

  /* Mulberry32, seeded once with a pinned constant. The offsets are generated
   * at build time and reused on every redraw, so a resize or a theme flip
   * never reshuffles the cloud, and two runs of the viz draw the same picture.
   * The constant below is a date and has nothing to do with the split seed. */
  const JITTER_SEED = 20260902;

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(JITTER_SEED);
  const JITTER = T.models.map(() => {
    const n = Math.max(T.nSplits, T.k);
    return Array.from({ length: n }, () => rand() * 2 - 1);
  });

  /* ======================================================== the row records */

  function describe(values, tags, single) {
    const sorted = values.slice().sort((a, b) => a - b);
    return {
      values, tags, single,
      n: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      q25: Stats.quantile(sorted, 0.25),
      median: Stats.quantile(sorted, 0.5),
      q75: Stats.quantile(sorted, 0.75),
      nNeg: values.filter(v => v < 0).length,
      nOff: values.filter(v => v < CLAMP_LO).length,
    };
  }

  const ROWS = {
    splits: T.models.map(m => Object.assign(
      { name: m.name },
      describe(m.testR2, T.seeds.map(s => "split seed " + s), m.single))),
    kfold: T.models.map(m => Object.assign(
      { name: m.name },
      describe(m.kfold, m.kfold.map((v, i) => "fold " + (i + 1) + " of " + T.k), m.single))),
  };

  const totalOff = { splits: 0, kfold: 0 };
  Object.keys(ROWS).forEach(k => {
    ROWS[k].forEach(r => { totalOff[k] += r.nOff; });
  });
  const totalPoints = { splits: 0, kfold: 0 };
  Object.keys(ROWS).forEach(k => {
    ROWS[k].forEach(r => { totalPoints[k] += r.n; });
  });

  const state = { mode: "splits" };
  const tm = UI.testMode();
  if (tm === "kfold" || tm === "splits") state.mode = tm;

  /* ================================================================== head */

  root.appendChild(UI.head(
    "Chapter five, the trust",
    "One split, then a hundred.",
    "Every score in this story came from one random split of the "
    + D.meta.nCountries + " countries, seed " + T.singleSeed + "."));

  const layout = UI.el("div.scene-layout");
  const left = UI.el("div.s8-col");
  const right = UI.el("div.text-col");
  layout.appendChild(left);
  layout.appendChild(right);
  root.appendChild(layout);

  /* ============================================================== controls */

  const readout = UI.el("span.readout.s8-readout", "Hover a point for its exact score.");

  const toggle = UI.toggleGroup([
    { value: "splits", label: T.nSplits + " resampled splits" },
    { value: "kfold", label: T.k + " fold cross validation" },
  ], {
    value: state.mode,
    onChange: v => {
      state.mode = v;
      resetReadout();
      chart.redraw();
      paintProse();
    },
  });

  const controls = UI.el("div.controls-row", toggle, readout);
  left.appendChild(controls);

  function resetReadout() {
    readout.textContent = "Hover a point for its exact score.";
  }

  /* ================================================================= chart */

  const host = UI.el("div.viz-wrap");
  left.appendChild(host);

  const DOT = d3.symbol().type(d3.symbolCircle).size(30)();
  const OFF = d3.symbol().type(d3.symbolTriangle).size(38)();
  const SEED_MARK = d3.symbol().type(d3.symbolDiamond).size(118)();

  /* d3's default tick format prints a Unicode minus. Keep the axis ASCII, so
   * it matches Stats.r2 everywhere else in the viz. */
  function fmtTick(v) {
    const s = (Math.round(v * 100) / 100).toFixed(2);
    return s.replace(/0+$/, "").replace(/\.$/, "");
  }

  function render(g, iw, ih) {
    const rows = ROWS[state.mode];

    const x = d3.scaleLinear().domain([CLAMP_LO, CLAMP_HI]).range([0, iw]).clamp(true);
    const y = d3.scaleBand().domain(rows.map(r => r.name)).range([0, ih])
      .paddingInner(0.3).paddingOuter(0.14);

    const band = y.bandwidth();
    const half = Math.min(24, band * 0.44);
    const boxH = Math.min(32, band * 0.6);

    const ticks = x.ticks(7);

    g.append("g").attr("class", "grid")
      .selectAll("line").data(ticks).join("line")
      .attr("y1", 0).attr("y2", ih).attr("x1", d => x(d)).attr("x2", d => x(d));

    g.append("line").attr("class", "s8-zero")
      .attr("x1", x(0)).attr("x2", x(0)).attr("y1", -4).attr("y2", ih + 4);

    g.append("line").attr("class", "s8-wall")
      .attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", ih);

    g.append("g").attr("class", "axis")
      .attr("transform", "translate(0," + ih + ")")
      .call(d3.axisBottom(x).tickValues(ticks).tickFormat(fmtTick).tickSizeOuter(0));

    g.append("text").attr("class", "axis-label")
      .attr("x", iw / 2).attr("y", ih + 37).attr("text-anchor", "middle")
      .text("Test R squared. 0 is the score of always guessing the average.");

    const off = totalOff[state.mode];
    g.append("text").attr("class", "s8-clamp-note")
      .attr("x", 0).attr("y", -11)
      .text(off > 0
        ? ("Axis clamped to [" + CLAMP_LO + ", " + CLAMP_HI + "]. " + off + " of the "
           + totalPoints[state.mode] + " scores fall below it and are drawn at the wall.")
        : ("Axis clamped to [" + CLAMP_LO + ", " + CLAMP_HI + "]. Every one of the "
           + totalPoints[state.mode] + " scores sits inside it."));

    rows.forEach((r, ri) => {
      const cy = y(r.name) + band / 2;
      const rowG = g.append("g").attr("class", "s8-row");

      rowG.append("text").attr("class", "s8-row-label")
        .attr("x", -12).attr("y", cy + 5).attr("text-anchor", "end")
        .text(r.name);

      rowG.append("line").attr("class", "s8-whisker")
        .attr("x1", x(r.min)).attr("x2", x(r.max)).attr("y1", cy).attr("y2", cy);

      const jit = JITTER[ri];

      const inside = [];
      const outside = [];
      r.values.forEach((v, i) => {
        (v < CLAMP_LO ? outside : inside).push({ v, i });
      });

      const dots = rowG.selectAll("path.s8-dot").data(inside).join("path")
        .attr("class", "mark s8-dot")
        .attr("d", DOT)
        .attr("transform", d => "translate(" + x(d.v) + "," + (cy + jit[d.i] * half) + ")");
      dots.append("title").text(d => r.name + ", " + r.tags[d.i] + ": " + Stats.r2(d.v));
      dots
        .on("pointerenter", function (ev, d) {
          d3.select(this).classed("hot", true);
          readout.textContent = r.name + ", " + r.tags[d.i] + ": R squared " + Stats.r2(d.v);
        })
        .on("pointerleave", function () {
          d3.select(this).classed("hot", false);
          resetReadout();
        });

      const offs = rowG.selectAll("path.s8-off").data(outside).join("path")
        .attr("class", "mark s8-off")
        .attr("d", OFF)
        .attr("transform", d => "translate(" + (x(CLAMP_LO) + 4) + ","
          + (cy + jit[d.i] * half) + ") rotate(-90)");
      offs.append("title").text(d => r.name + ", " + r.tags[d.i] + ": " + Stats.r2(d.v));
      offs
        .on("pointerenter", function (ev, d) {
          d3.select(this).classed("hot", true);
          readout.textContent = r.name + ", " + r.tags[d.i] + ": R squared " + Stats.r2(d.v)
            + ", off the chart";
        })
        .on("pointerleave", function () {
          d3.select(this).classed("hot", false);
          resetReadout();
        });

      if (r.nOff > 0) {
        rowG.append("text").attr("class", "s8-off-label")
          .attr("x", 14).attr("y", cy - half - 3)
          .text(r.nOff + " off chart, down to " + Stats.r2(r.min));
      }

      rowG.append("rect").attr("class", "s8-box")
        .attr("x", x(r.q25)).attr("y", cy - boxH / 2)
        .attr("width", Math.max(1, x(r.q75) - x(r.q25))).attr("height", boxH);

      rowG.append("line").attr("class", "s8-median")
        .attr("x1", x(r.median)).attr("x2", x(r.median))
        .attr("y1", cy - boxH / 2 - 3).attr("y2", cy + boxH / 2 + 3);

      rowG.append("line").attr("class", "s8-stem")
        .attr("x1", x(r.single)).attr("x2", x(r.single))
        .attr("y1", cy - half - 4).attr("y2", cy + half + 4);

      const seed = rowG.append("path").attr("class", "mark s8-seed")
        .attr("d", SEED_MARK)
        .attr("transform", "translate(" + x(r.single) + "," + cy + ")");
      seed.append("title").text(r.name + ", seed " + T.singleSeed + ": " + Stats.r2(r.single));
      seed
        .on("pointerenter", function () {
          d3.select(this).classed("hot", true);
          readout.textContent = r.name + ", seed " + T.singleSeed
            + ", the split this story used: R squared " + Stats.r2(r.single);
        })
        .on("pointerleave", function () {
          d3.select(this).classed("hot", false);
          resetReadout();
        });

      rowG.append("text").attr("class", "s8-row-stat")
        .attr("x", iw + 10).attr("y", cy + 4)
        .text("median " + Stats.r2(r.median));
    });
  }

  const chart = Plot.mount(host, render, {
    margin: { top: 30, right: 108, bottom: 54, left: 126 },
  });

  /* ================================================================== key */

  function keyMark(pathD, cls, rotate) {
    const wrap = UI.el("span");
    const svg = d3.select(wrap).append("svg")
      .attr("width", 18).attr("height", 16).attr("viewBox", "-9 -8 18 16");
    svg.append("path").attr("class", cls).attr("d", pathD)
      .attr("transform", rotate ? "rotate(" + rotate + ")" : null);
    return wrap;
  }

  function keyBox() {
    const wrap = UI.el("span");
    const svg = d3.select(wrap).append("svg")
      .attr("width", 30).attr("height", 16).attr("viewBox", "0 0 30 16");
    svg.append("rect").attr("class", "s8-box")
      .attr("x", 1).attr("y", 3).attr("width", 28).attr("height", 10);
    svg.append("line").attr("class", "s8-median")
      .attr("x1", 17).attr("x2", 17).attr("y1", 1).attr("y2", 15);
    return wrap;
  }

  const keyRow = UI.el("div.s8-key");
  const keyPoint = UI.el("span", "");
  const keyOffItem = UI.el("span.s8-key-item",
    keyMark(OFF, "mark s8-off", -90), "off the chart");
  keyRow.appendChild(UI.el("span.s8-key-item", keyMark(DOT, "mark s8-dot"), keyPoint));
  keyRow.appendChild(keyOffItem);
  keyRow.appendChild(UI.el("span.s8-key-item",
    keyMark(SEED_MARK, "mark s8-seed"),
    "seed " + T.singleSeed + ", the split this story used"));
  keyRow.appendChild(UI.el("span.s8-key-item", keyBox(), "middle half and median"));
  left.appendChild(keyRow);

  /* ================================================================= prose */

  const prose = UI.el("div.s8-prose");

  right.appendChild(UI.sentence(
    "A split deals the " + D.meta.nCountries + " countries into two piles: ",
    UI.itex("n_{\\text{train}} = " + D.crash.nTrain), " countries the model fits on, and ",
    UI.itex("n_{\\text{test}} = " + D.crash.nTest),
    " it never sees until the score. Change the deal and you change the score."));

  const formula = UI.el("div.formula-block");
  formula.appendChild(UI.tex(
    "R^2 \\;=\\; 1 \\;-\\; \\frac{\\sum_i (y_i - \\hat{y}_i)^2}{\\sum_i (y_i - \\bar{y})^2}"));
  right.appendChild(formula);

  right.appendChild(UI.el("p.muted.small.s8-gloss",
    "1 is a perfect fit on the held back countries. 0 is the score of always "
    + "guessing the average. Below 0 is worse than guessing the average."));

  right.appendChild(prose);

  function paintProse() {
    prose.innerHTML = "";
    const r = ROWS[state.mode][0];
    if (state.mode === "splits") {
      prose.appendChild(UI.callout("The one number and the cloud",
        UI.el("p.small",
          "Seed " + T.singleSeed + " handed OLS " + (r.single >= 0 ? "+" : "")
          + Stats.r2(r.single) + ". Over " + r.n + " splits its median is "
          + Stats.r2(r.median) + ", its middle half runs from " + Stats.r2(r.q25)
          + " to " + Stats.r2(r.q75) + ", and its worst is " + Stats.r2(r.min)
          + ". " + r.nNeg + " of the " + r.n + " land below zero. The split this "
          + "story used was one of its luckier ones.")));
    } else {
      prose.appendChild(UI.callout("The one number and the folds",
        UI.el("p.small",
          "Cross validation cuts the " + D.meta.nCountries + " countries into "
          + T.k + " parts and scores each one against a model fitted on the other "
          + (T.k - 1) + ". OLS runs from " + Stats.r2(r.min) + " to "
          + Stats.r2(r.max) + ", and " + r.nNeg + " of the " + r.n
          + " folds land below zero. Five numbers, and they disagree.")));
    }
    keyPoint.textContent = state.mode === "splits" ? "one resampled split" : "one fold";
    // No mark on screen means no key for it: in the fold view nothing is clamped.
    keyOffItem.classList.toggle("is-empty", totalOff[state.mode] === 0);
  }

  paintProse();

  /* &run has no gated button to trip here: the chart paints its full state on
   * entry. test=kfold and test=splits pick the mode for a headless capture. */
  toggle.select(state.mode);

  return {
    onEnter() { chart.redraw(); },
  };
};
