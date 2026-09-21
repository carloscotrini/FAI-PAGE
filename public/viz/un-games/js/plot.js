/* Shared chart helpers, so every scene draws in the same language.
 *
 * The rule this module exists to enforce: COLOUR IS NEVER THE ONLY CHANNEL.
 *
 *   a feature role  ->  a hue AND a marker shape
 *   train or test   ->  a hue AND a dash pattern AND a label at the line's end
 *
 * A viewer with any of the three dichromacies, a lecturer projecting through a
 * yellowing bulb, and a student reading a photocopy all get the same reading.
 * The hues themselves are gated by precompute/verify_palette.py, which fails
 * the build if any two that share a chart come within CIEDE2000 18 of each
 * other under normal vision, protanopia, deuteranopia or tritanopia.
 *
 * Colours are never written here as hex. They come from the CSS custom
 * properties, applied through the classes in css/style.css, so the theme
 * toggle costs nothing.
 *
 * Globals used: d3, Theme. */

window.Plot = (function () {

  const ROLES = ["causal", "spurious", "incidental"];

  const ROLE_GLOSS = {
    causal: "a plausible mechanism for national wealth",
    spurious: "correlation with no mechanism behind it",
    incidental: "a real statistic that moves with wealth without causing it",
  };

  // d3.symbol types, one per role. Distinct in silhouette as well as in hue.
  const ROLE_SYMBOL = {
    causal: d3.symbolCircle,
    spurious: d3.symbolTriangle,
    incidental: d3.symbolSquare,
  };

  // Triangles and squares carry less ink than a circle of the same nominal
  // area, so each gets a scale factor that makes them read as equal weight.
  const ROLE_SIZE_SCALE = { causal: 1.0, spurious: 1.28, incidental: 0.92 };

  const FIT_STYLE = {
    test: { dash: "", width: 2.6, label: "test" },
    train: { dash: "7 4", width: 2.0, label: "train" },
  };

  function roleClass(role) { return "role-" + (ROLES.includes(role) ? role : "incidental"); }
  function roleSymbol(role) { return ROLE_SYMBOL[role] || ROLE_SYMBOL.incidental; }

  /** An SVG path string for one role's marker, at the given nominal area. */
  function rolePath(role, area) {
    const a = (area || 46) * (ROLE_SIZE_SCALE[role] || 1);
    return d3.symbol().type(roleSymbol(role)).size(a)();
  }

  /* ======================================================= mount and resize */

  /* A chart is comfortable at roughly this many square pixels. Past it the
   * chart is drawn at this size and the whole SVG is SCALED UP instead of
   * being redrawn larger, so marks, strokes and type all grow together. */
  const REF_AREA = 620 * 420;
  const MAX_ZOOM = 1.75;

  /* Measure the host, size the SVG in real pixels, and re-render on resize and
   * on a theme change. Sizing the SVG explicitly is load bearing: an <svg>
   * left to a flex parent's default `align-items: stretch` renders correctly
   * in the interactive browser and captures as a squashed slice under headless
   * Chrome, which is a bug that costs a day to find by reading code.
   *
   * The viewBox is where the zoom happens. Drawing 1:1 into a very large panel
   * gives a huge empty field speckled with 3px marks and 11px labels, which
   * reads as a broken or low resolution chart rather than as a big one. So
   * past REF_AREA the viewBox stays at the comfortable size while the element
   * keeps the panel's real pixels, and the browser scales the drawing
   * uniformly. The aspect ratio of the viewBox always matches the element, so
   * nothing is letterboxed or stretched. */
  function mount(host, render, opts) {
    opts = opts || {};
    const margin = Object.assign({ top: 18, right: 22, bottom: 42, left: 56 }, opts.margin);

    const svg = d3.select(host).append("svg")
      .attr("role", "img")
      .style("display", "block");
    const g = svg.append("g");

    let last = { w: 0, h: 0 };

    function draw() {
      const rect = host.getBoundingClientRect();
      const w = Math.max(160, Math.round(rect.width));
      const h = Math.max(120, Math.round(rect.height));

      const zoom = Math.min(MAX_ZOOM, Math.max(1, Math.sqrt((w * h) / REF_AREA)));
      const vw = Math.round(w / zoom);
      const vh = Math.round(h / zoom);

      svg.attr("width", w).attr("height", h).attr("viewBox", `0 0 ${vw} ${vh}`);
      g.attr("transform", `translate(${margin.left},${margin.top})`);
      const iw = Math.max(40, vw - margin.left - margin.right);
      const ih = Math.max(40, vh - margin.top - margin.bottom);
      last = { w: iw, h: ih, zoom };
      g.selectAll("*").remove();
      render(g, iw, ih, svg);
    }

    draw();

    let raf = null;
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { raf = null; draw(); });
    };

    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(schedule);
      ro.observe(host);
    } else {
      window.addEventListener("resize", schedule);
    }
    window.addEventListener("theme-change", schedule);

    return {
      svg, g, redraw: draw,
      size: () => last,
      destroy() {
        if (ro) ro.disconnect();
        window.removeEventListener("theme-change", schedule);
        window.removeEventListener("resize", schedule);
        svg.remove();
      },
    };
  }

  /* ==================================================================== axes */

  function axes(g, x, y, w, h, o) {
    o = o || {};
    if (o.grid !== false) {
      g.append("g").attr("class", "grid")
        .selectAll("line").data(y.ticks(o.yTicks || 5)).join("line")
        .attr("x1", 0).attr("x2", w).attr("y1", d => y(d)).attr("y2", d => y(d));
    }
    g.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(o.xTicks || 6).tickFormat(o.xFormat || null).tickSizeOuter(0));
    g.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).ticks(o.yTicks || 5).tickFormat(o.yFormat || null).tickSizeOuter(0));

    if (o.xLabel) {
      g.append("text").attr("class", "axis-label")
        .attr("x", w / 2).attr("y", h + 34).attr("text-anchor", "middle")
        .text(o.xLabel);
    }
    if (o.yLabel) {
      g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -h / 2).attr("y", -42).attr("text-anchor", "middle")
        .text(o.yLabel);
    }
    if (o.title) {
      g.append("text").attr("class", "chart-title")
        .attr("x", 0).attr("y", -6).text(o.title);
    }
  }

  /* ================================================================= scatter */

  /* One <path> per point, shaped by role. Handlers go on the merged selection,
   * because a scatter that re-renders with new data would otherwise keep the
   * handler its first render gave it.
   *
   * The join selects `path.plot-point`, a class this function alone applies,
   * rather than `path.mark`. `mark` is the STYLING class and a scene is free to
   * put it on a legend swatch or a lane key inside the same `g`; joining on it
   * swept those into the selection with no datum bound and threw on the first
   * render. Style with `mark`, join on `plot-point`. */
  function scatter(g, data, o) {
    o = o || {};
    const area = o.area || 46;
    const roleOf = o.role || (() => "incidental");
    const sel = g.selectAll("path.plot-point").data(data, o.key || null);
    sel.exit().remove();
    const merged = sel.enter().append("path").merge(sel)
      .attr("class", d => "plot-point mark " + roleClass(roleOf(d))
        + (o.extraClass ? " " + o.extraClass(d) : ""))
      .attr("d", d => rolePath(roleOf(d), area))
      .attr("transform", d => `translate(${o.x(d)},${o.y(d)})`);
    merged.selectAll("title").remove();
    if (o.title) merged.append("title").text(o.title);
    if (o.on) Object.keys(o.on).forEach(k => merged.on(k, o.on[k]));
    return merged;
  }

  /* =================================================================== lines */

  /* A fit series: hue, dash and stroke width from FIT_STYLE, and its name set
   * at the end of the line rather than in a legend the eye has to leave the
   * chart to read. */
  function fitLine(g, points, kind, o) {
    o = o || {};
    const st = FIT_STYLE[kind] || FIT_STYLE.test;
    const gen = d3.line().x(o.x).y(o.y);
    if (o.defined) gen.defined(o.defined);
    if (o.curve) gen.curve(o.curve);

    g.append("path")
      .attr("class", "fit-" + kind)
      .attr("d", gen(points))
      .attr("stroke-width", st.width)
      .attr("stroke-dasharray", st.dash || null)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    if (o.label !== false) {
      const at = o.labelAt || points[points.length - 1];
      if (at) {
        g.append("text")
          .attr("class", "series-label fit-" + kind)
          .attr("x", o.x(at) + (o.labelDx == null ? 6 : o.labelDx))
          .attr("y", o.y(at) + (o.labelDy == null ? 4 : o.labelDy))
          .attr("text-anchor", o.labelAnchor || "start")
          .text(o.labelText || st.label);
      }
    }
  }

  /** A horizontal reference line, for zero or for a single split's score. */
  function refLine(g, y, w, label, o) {
    o = o || {};
    g.append("line").attr("class", "ref-line")
      .attr("x1", 0).attr("x2", w).attr("y1", y).attr("y2", y);
    if (label) {
      g.append("text").attr("class", "axis-label")
        .attr("x", o.anchor === "start" ? 3 : w - 3)
        .attr("y", y - 5)
        .attr("text-anchor", o.anchor === "start" ? "start" : "end")
        .text(label);
    }
  }

  /* ================================================================== legend */

  /* The role key. Shape first, then the word, so a reader who cannot see the
   * hue still gets the mapping from the picture. */
  function roleLegend(host, o) {
    o = o || {};
    const wrap = document.createElement("div");
    wrap.className = "role-legend";
    (o.roles || ROLES).forEach(role => {
      const key = document.createElement("div");
      key.className = "role-key";

      const svg = d3.select(key).append("svg")
        .attr("width", 16).attr("height", 16).attr("viewBox", "-8 -8 16 16");
      svg.append("path")
        .attr("class", "mark " + roleClass(role))
        .attr("d", rolePath(role, 74));

      const name = document.createElement("span");
      name.className = "role-name " + roleClass(role);
      name.textContent = role;
      key.appendChild(name);

      if (o.counts && o.counts[role] != null) {
        const n = document.createElement("span");
        n.className = "role-gloss tabular";
        n.textContent = o.counts[role];
        key.appendChild(n);
      }
      if (o.gloss) {
        const gl = document.createElement("span");
        gl.className = "role-gloss";
        gl.textContent = ROLE_GLOSS[role];
        key.appendChild(gl);
      }
      wrap.appendChild(key);
    });
    host.appendChild(wrap);
    return wrap;
  }

  /* A key for the fit axis, drawn as the two line styles themselves. */
  function fitLegend(host, o) {
    o = o || {};
    const wrap = document.createElement("div");
    wrap.className = "role-legend";
    ["test", "train"].forEach(kind => {
      const st = FIT_STYLE[kind];
      const key = document.createElement("div");
      key.className = "role-key";
      const svg = d3.select(key).append("svg").attr("width", 28).attr("height", 12);
      svg.append("line")
        .attr("class", "fit-" + kind)
        .attr("x1", 0).attr("x2", 28).attr("y1", 6).attr("y2", 6)
        .attr("stroke-width", st.width)
        .attr("stroke-dasharray", st.dash || null);
      const name = document.createElement("span");
      name.className = "role-name";
      name.style.color = "var(--fit-" + kind + ")";
      name.textContent = (o.labels && o.labels[kind]) || st.label;
      key.appendChild(name);
      if (o.gloss && o.gloss[kind]) {
        const gl = document.createElement("span");
        gl.className = "role-gloss";
        gl.textContent = o.gloss[kind];
        key.appendChild(gl);
      }
      wrap.appendChild(key);
    });
    host.appendChild(wrap);
    return wrap;
  }

  return {
    ROLES, ROLE_GLOSS, FIT_STYLE,
    roleClass, roleSymbol, rolePath,
    mount, axes, scatter, fitLine, refLine,
    roleLegend, fitLegend,
  };
})();
