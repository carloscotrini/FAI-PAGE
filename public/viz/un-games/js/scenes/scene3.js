/* Scene 3. Tell them apart.
 *
 * The student's turn. Three scatters at almost the same correlation strength,
 * one causal, one incidental, one spurious, and nothing on the picture says
 * which is which. Click the one you think is causal, then the roles appear.
 *
 * Before the answer, every panel is drawn in a NEUTRAL mark, a grey diamond
 * that is none of the three role shapes and none of the three role hues, so
 * the quiz cannot give itself away. After the answer each panel switches to
 * its own role shape and hue. The columns are unlabelled until then, tick
 * values included, because a range of minus one to one names a synthetic
 * column at a glance.
 *
 * Interaction: direct. Three clickable panels and a button for the next round.
 * No step engine and no forced sequence.
 *
 * Nothing here is random at load. The three rounds are derived from
 * DATA.bait.features by strength band, and the panel order comes from a seeded
 * generator with a pinned seed, so the lecturer gets the same three rounds
 * every time the page opens.
 *
 * Globals used: d3, Plot, UI, Stats, DATA. */

window.scenes.scene3 = function (root) {
  const D = window.DATA;
  const FEATS = D.bait.features;

  const LETTERS = ["A", "B", "C"];
  const ROLE_ORDER = ["causal", "incidental", "spurious"];

  // Pinned. Changing it reshuffles which panel holds the causal column.
  const SEED = 20260909;

  // Bands of correlation strength that hold one column of each role. The
  // trios themselves are derived below; these are only the windows to look in.
  const BANDS = [[0.40, 0.50], [0.30, 0.40], [0.20, 0.30]];

  // Used only if the payload ever stops offering one plottable column of each
  // role inside a band. Derivation comes first.
  const FALLBACK = [
    ["exports_pct_gdp", "tertiary_enrollment_gross", "observed_inclusion_proxy_18"],
    ["trade_pct_gdp", "urban_population_pct", "regional_productivity_estimator_247"],
    ["govt_consumption_pct_gdp", "smoking_prevalence_female", "prestige_score"],
  ];

  const logGdp = D.gdp.map(Stats.log10);
  const byKey = new Map(FEATS.map(f => [f.key, f]));

  function absR(f) { return Math.abs(f.r); }

  /* ==================================================== picking the three rounds */

  /* A column is worth putting in a panel when it actually spreads across its
   * own axis. Some columns in this payload are a handful of repeated values,
   * and some are a long tail with everything crushed against the left edge.
   * Either one makes a panel that reads as broken rather than as data. */
  const profileCache = {};
  function profile(key) {
    if (profileCache[key]) return profileCache[key];
    const col = D.columns[key];
    const sorted = col.slice().sort((a, b) => a - b);
    const range = (sorted[sorted.length - 1] - sorted[0]) || 1;
    const counts = new Map();
    col.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    let top = 0;
    counts.forEach(c => { if (c > top) top = c; });
    profileCache[key] = {
      tie: top / col.length,
      spread: (Stats.quantile(sorted, 0.95) - Stats.quantile(sorted, 0.05)) / range,
      distinct: counts.size,
    };
    return profileCache[key];
  }
  function plottable(f) {
    const p = profile(f.key);
    return p.tie <= 0.55 && p.spread >= 0.20 && p.distinct >= 40;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Choosing a trio, in two passes.
   *
   * First the three strengths have to sit close together, so the student
   * cannot separate the roles by reading the number off the panel.
   *
   * Then, among the trios within STRENGTH_TOL of the closest, take the one
   * where the causal column is hardest to pick out by its shape alone. Many
   * columns here have a block of countries sharing one value, which draws a
   * vertical stripe in the scatter, and the causal columns tend to have the
   * least of it. So the second pass minimises how far the causal column's tie
   * fraction sits from the nearer of the other two: match it to one of them
   * and the stripe can no longer single out the answer. */
  const STRENGTH_TOL = 0.02;

  function trioFor(band) {
    const inBand = FEATS.filter(f => absR(f) >= band[0] && absR(f) < band[1] && plottable(f));
    const by = {};
    ROLE_ORDER.forEach(role => { by[role] = inBand.filter(f => f.role === role); });
    if (ROLE_ORDER.some(role => by[role].length === 0)) return null;

    const all = [];
    by.causal.forEach(c => by.incidental.forEach(i => by.spurious.forEach(s => {
      const trio = [c, i, s];
      const v = trio.map(absR);
      const tie = trio.map(f => profile(f.key).tie);
      all.push({
        spread: Math.max.apply(null, v) - Math.min.apply(null, v),
        causalTell: Math.min(Math.abs(tie[0] - tie[1]), Math.abs(tie[0] - tie[2])),
        trio: trio,
      });
    })));
    if (!all.length) return null;

    const tightest = Math.min.apply(null, all.map(a => a.spread));
    const pool = all.filter(a => a.spread <= tightest + STRENGTH_TOL);
    pool.sort((a, b) => a.causalTell - b.causalTell || a.spread - b.spread
      || (a.trio[1].key < b.trio[1].key ? -1 : 1));
    return pool[0];
  }

  const rounds = BANDS.map(function (band, bi) {
    let picked = trioFor(band);
    if (!picked) {
      const keys = FALLBACK[bi] || [];
      const trio = keys.map(k => byKey.get(k)).filter(Boolean);
      if (trio.length !== 3) return null;
      const v = trio.map(absR);
      picked = { spread: Math.max.apply(null, v) - Math.min.apply(null, v), trio: trio };
    }
    const order = picked.trio.slice();
    const rnd = mulberry32(SEED + bi * 7919);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    return { spread: picked.spread, order: order };
  }).filter(Boolean);

  // Cold entry has to survive a payload that cannot fill a single round.
  if (!rounds.length) {
    root.appendChild(UI.head("Chapter one, the bait", "Tell them apart.",
      "This payload carries no strength band with one column of each role, so "
      + "there is no round to play."));
    return {};
  }

  /* ====================================================================== state */

  let round = 0;
  let pick = null;

  // &run is deliberately inert: the unanswered quiz IS this scene's default
  // state, and verify.sh captures every scene with &run. test=revealed is
  // how a screenshot reaches the state behind the click.
  const test = UI.testMode();
  if (test === "round2") round = Math.min(1, rounds.length - 1);
  if (test === "round3") round = Math.min(2, rounds.length - 1);
  if (test === "revealed") pick = 0;

  function panelFeature(idx) { return rounds[round].order[idx]; }
  function answerIndex() { return rounds[round].order.findIndex(f => f.role === "causal"); }
  function revealed() { return pick !== null; }

  /* ===================================================================== header */

  root.appendChild(UI.head(
    "Chapter one, the bait",
    "Tell them apart.",
    "Three columns at almost the same strength. One is causal, one incidental, one "
    + "spurious. Click the panel you think is causal."));

  /* =================================================================== controls */

  const controls = UI.el("div.controls-row");
  const roundLabel = UI.el("span.s3-round", "");
  controls.appendChild(roundLabel);
  controls.appendChild(UI.button("Next round", () => {
    round = (round + 1) % rounds.length;
    pick = null;
    paint();
  }, "small"));
  root.appendChild(controls);

  /* ===================================================================== panels */

  const panels = UI.el("div.s3-panels");
  const parts = [];

  for (let idx = 0; idx < 3; idx++) {
    const letter = UI.el("span.s3-letter", LETTERS[idx]);
    const tag = UI.el("span.s3-tag", "");
    const strength = UI.el("span.s3-strength", "");
    const head = UI.el("div.s3-panel-head", letter, tag, strength);

    const chartHost = UI.el("div.s3-chart");
    const foot = UI.el("div.s3-panel-foot");

    const panel = UI.el("div.s3-panel", {
      role: "button", tabindex: "0",
      "aria-label": "Panel " + LETTERS[idx] + ", click if you think this column is causal",
    }, head, chartHost, foot);

    const choose = () => { if (!revealed()) { pick = idx; paint(); } };
    panel.addEventListener("click", choose);
    panel.addEventListener("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); choose(); }
    });

    panels.appendChild(panel);
    parts.push({ panel: panel, tag: tag, strength: strength, foot: foot, chartHost: chartHost });
  }
  root.appendChild(panels);

  /* ==================================================================== verdict */

  const verdict = UI.el("div.s3-verdict");
  root.appendChild(verdict);

  /* ===================================================================== charts */

  function makeRender(idx) {
    return function (g, iw, ih) {
      const f = panelFeature(idx);
      const open = revealed();
      const xs = D.columns[f.key];
      const pts = [];
      for (let i = 0; i < xs.length; i++) {
        if (Number.isFinite(xs[i]) && Number.isFinite(logGdp[i])) {
          pts.push({ i: i, x: xs[i], y: logGdp[i] });
        }
      }
      if (!pts.length) return;

      /* The axis follows the BULK of the column rather than its longest tail.
       * Several of these columns are strongly right skewed: cereal yield runs
       * to 29,241 while nine countries in ten sit under 6,000, and on a full
       * extent axis every one of those lands in the left quarter of the panel
       * with two lone marks stranded to the right. That reads as a broken
       * chart rather than as a skewed column, and it changes what the student
       * is comparing between panels. So the domain is the 2nd to 98th
       * percentile with a small pad, and the handful of points outside it are
       * clamped to the wall rather than dropped, so no country disappears. */
      const sortedX = pts.map(p => p.x).sort(d3.ascending);
      const lo = d3.quantileSorted(sortedX, 0.02);
      const hi = d3.quantileSorted(sortedX, 0.98);
      const pad = (hi - lo) * 0.06;
      let xd = pad > 0 ? [lo - pad, hi + pad] : d3.extent(pts, p => p.x);
      if (xd[0] === xd[1]) xd = [xd[0] - 0.5, xd[1] + 0.5];
      const x = d3.scaleLinear().domain(xd).nice().range([0, iw]).clamp(true);
      const y = d3.scaleLinear().domain(d3.extent(pts, p => p.y)).nice().range([ih, 0]);

      Plot.axes(g, x, y, iw, ih, {
        xTicks: 4, yTicks: 4,
        yFormat: d => Stats.usd(Math.pow(10, d)),
        // The tick values name the column to anyone who knows the units, so
        // they stay blank until the student has answered.
        xFormat: open ? null : (() => ""),
        xLabel: open ? Stats.pretty(f.key) : "column " + LETTERS[idx],
        yLabel: idx === 0 ? "GDP per capita, log scale" : null,
      });

      // The mark grows with the panel, so 254 points read the same at 1280x800
      // and at 1920x1080 instead of shrinking into the corner of a bigger box.
      const area = Math.max(24, Math.min(42, ih * 0.09));

      if (open) {
        Plot.scatter(g, pts, {
          x: p => x(p.x), y: p => y(p.y),
          role: () => f.role, area: area,
          title: p => D.countries[p.i] + ", " + Stats.usd(D.gdp[p.i]),
        });
      } else {
        // The neutral mark. A diamond is none of the three role shapes, and
        // .s3-neutral in css/scene3.css fills it from the muted token, so the
        // panel carries no role signal at all.
        const shape = d3.symbol().type(d3.symbolDiamond).size(area * 1.08)();
        g.selectAll("path.s3-neutral").data(pts).join("path")
          .attr("class", "s3-neutral")
          .attr("d", shape)
          .attr("transform", p => "translate(" + x(p.x) + "," + y(p.y) + ")");
      }
    };
  }

  const charts = parts.map((part, idx) => Plot.mount(part.chartHost, makeRender(idx),
    // Plot.axes drops the x label 34px below the plot, so the bottom margin has
    // to clear that plus the descenders or the label is sliced by the panel.
    { margin: { top: 10, right: 28, bottom: 46, left: 52 } }));

  /* ====================================================================== paint */

  function roleMark(role, size) {
    const host = UI.el("span.s3-mark");
    d3.select(host).append("svg")
      .attr("width", 15).attr("height", 15).attr("viewBox", "-7.5 -7.5 15 15")
      .append("path")
      .attr("class", "mark " + Plot.roleClass(role))
      .attr("d", Plot.rolePath(role, size || 62));
    return host;
  }

  function paint() {
    const open = revealed();
    roundLabel.textContent = "Round " + (round + 1) + " of " + rounds.length;

    parts.forEach((part, idx) => {
      const f = panelFeature(idx);
      part.panel.classList.toggle("s3-open", open);
      part.panel.classList.toggle("s3-picked", open && pick === idx);

      part.tag.textContent = (open && pick === idx) ? "your pick" : "";

      part.strength.textContent = "";
      part.strength.appendChild(UI.itex(
        open ? "r = " + Stats.corr(f.r) : "|r| = " + Stats.corr(absR(f))));

      part.foot.textContent = "";
      if (!open) {
        // The foot keeps its height either way, so the reveal moves nothing.
        part.foot.appendChild(UI.el("div.s3-foot-wait", "role hidden"));
      } else {
        const line = UI.el("div.s3-foot-role",
          roleMark(f.role),
          UI.el("span.s3-foot-name." + Plot.roleClass(f.role), f.role));
        part.foot.appendChild(line);
        part.foot.appendChild(UI.el("div.s3-foot-desc", f.desc));
      }
    });

    verdict.textContent = "";
    if (!open) {
      verdict.appendChild(UI.el("p.muted", "The roles appear once you answer."));
    } else {
      const ans = answerIndex();
      const chosen = panelFeature(pick);
      const line = (pick === ans)
        ? "Panel " + LETTERS[ans] + " is the causal one, and you picked it."
        : "Panel " + LETTERS[ans] + " is the causal one. Panel " + LETTERS[pick]
          + " is " + chosen.role + ", " + Plot.ROLE_GLOSS[chosen.role] + ".";
      verdict.appendChild(UI.sentence(line + " The three strengths differ by ",
        Stats.corr(rounds[round].spread),
        ", so ", UI.itex("|r|"), " cannot separate the roles."));
    }

    charts.forEach(c => c.redraw());
  }

  paint();

  return {};
};
