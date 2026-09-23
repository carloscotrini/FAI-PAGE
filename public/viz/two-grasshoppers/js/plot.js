/* ===========================================================================
   plot.js : the three pictures every scene is built from.

     Plot.scatter(host, opts)   the data, a model curve on it, and its misses
     Plot.hill(host, opts)      a loss curve with a grasshopper standing on it:
                                scene 1's L(w), and each of scene 3's profiles
     Plot.bowl(host, opts)      L(a, b) seen from above, with the point, its
                                path, the two slices and the two hops
     Plot.tween(a, b, ms, onFrame, onDone)   one eased move, cancellable

   Rules this file obeys:
     no colour is ever written here, only class names from css/style.css;
     every svg carries explicit width and height attributes AND the same values
     in css, so a flex parent cannot stretch it and the headless renderer sees
     what the browser sees;
     every curve is sampled from the function it is handed, and those
     functions are Algo's, so what is drawn is the data's own L.
   =========================================================================== */

window.Plot = (function () {
  "use strict";

  function reduceMotion() {
    try {
      return !!(window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }

  /* cubic in out, the easing the block 2 grasshopper game jumps with */
  function ease(u) {
    return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  }

  /* One eased move from a to b. Returns a handle with cancel(). When the page
     is asked to skip animation, it lands on b at once. */
  function tween(a, b, ms, onFrame, onDone) {
    var raf = 0, cancelled = false;
    if (ms <= 0 || reduceMotion() || (window.Flags && window.Flags.instant)) {
      if (onFrame) onFrame(b, 1);
      if (onDone) onDone();
      return { cancel: function () {} };
    }
    var t0 = null;
    function frame(ts) {
      if (cancelled) return;
      if (t0 === null) t0 = ts;
      var u = (ts - t0) / ms;
      if (u > 1) u = 1;
      var e = ease(u);
      if (onFrame) onFrame(a + (b - a) * e, e);
      if (u < 1) raf = requestAnimationFrame(frame);
      else { raf = 0; if (onDone) onDone(); }
    }
    raf = requestAnimationFrame(frame);
    return {
      cancel: function () {
        cancelled = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }
    };
  }

  var uidSeq = 0;
  function uid(prefix) { uidSeq += 1; return prefix + uidSeq; }

  function svgIn(host, w, h, label) {
    return d3.select(host).append("svg")
      .attr("width", w).attr("height", h)
      .attr("viewBox", "0 0 " + w + " " + h)
      .style("width", w + "px").style("height", h + "px")
      .style("display", "block")
      .attr("role", "img").attr("aria-label", label);
  }

  /* A curve y = f(x) as a path over [x0, x1]. */
  function curvePath(f, x0, x1, sx, sy, samples) {
    var n = samples || 160;
    var d = "";
    for (var k = 0; k <= n; k++) {
      var xv = x0 + (x1 - x0) * k / n;
      d += (k === 0 ? "M" : "L") + sx(xv).toFixed(2) + "," + sy(f(xv)).toFixed(2);
    }
    return d;
  }

  /* ========================================================= the scatter ==== */
  /* opts: { width, height, points: [{x, y}], xMax, yMax, xStep, yStep,
             xFormat, yFormat, xTitle, yTitle, label }                       */
  function scatter(host, opts) {
    var W = opts.width, H = opts.height;
    var ml = opts.ml || 62, mr = 16, mt = 12, mb = 40;
    var x = d3.scaleLinear().domain([0, opts.xMax]).range([ml, W - mr]);
    var y = d3.scaleLinear().domain([0, opts.yMax]).range([H - mb, mt]);
    var id = uid("sc");

    var svg = svgIn(host, W, H, opts.label || "The data");

    svg.append("clipPath").attr("id", id + "-clip").append("rect")
      .attr("x", ml).attr("y", mt).attr("width", W - ml - mr).attr("height", H - mt - mb);

    var gGrid = svg.append("g");
    var gAxis = svg.append("g");
    var gPlot = svg.append("g").attr("clip-path", "url(#" + id + "-clip)");
    var gMiss = gPlot.append("g");
    var gCurves = gPlot.append("g");
    var gDots = svg.append("g");
    var gInk = svg.append("g");

    d3.range(0, opts.yMax + 1e-9, opts.yStep).forEach(function (v) {
      gGrid.append("line").attr("class", "grid-line")
        .attr("x1", ml).attr("x2", W - mr).attr("y1", y(v)).attr("y2", y(v));
      gAxis.append("text").attr("class", "tick-ink")
        .attr("x", ml - 9).attr("y", y(v) + 4.5).attr("text-anchor", "end")
        .text(opts.yFormat ? opts.yFormat(v) : v);
    });
    d3.range(0, opts.xMax + 1e-9, opts.xStep).forEach(function (v) {
      gAxis.append("line").attr("class", "tick-line")
        .attr("x1", x(v)).attr("x2", x(v)).attr("y1", H - mb).attr("y2", H - mb + 5);
      gAxis.append("text").attr("class", "tick-ink")
        .attr("x", x(v)).attr("y", H - mb + 20).attr("text-anchor", "middle")
        .text(opts.xFormat ? opts.xFormat(v) : v);
    });
    gAxis.append("line").attr("class", "axis-line")
      .attr("x1", ml).attr("x2", W - mr).attr("y1", H - mb).attr("y2", H - mb);
    gAxis.append("line").attr("class", "axis-line")
      .attr("x1", ml).attr("x2", ml).attr("y1", H - mb).attr("y2", mt);
    gAxis.append("text").attr("class", "axis-title")
      .attr("x", W - mr).attr("y", H - 5).attr("text-anchor", "end")
      .text(opts.xTitle);
    /* ROTATED, along the axis it names: set horizontally at the left margin
       it runs off the panel */
    gAxis.append("text").attr("class", "axis-title")
      .attr("transform", "translate(15," + ((H - mb + mt) / 2) + ") rotate(-90)")
      .attr("text-anchor", "middle")
      .text(opts.yTitle);

    gDots.selectAll("circle").data(opts.points).enter().append("circle")
      .attr("class", "data-dot").attr("r", opts.dotR || 6)
      .attr("cx", function (d) { return x(d.x); })
      .attr("cy", function (d) { return y(d.y); });

    /* state: { curves: [{f, cls}], misses: {f, cls} | null,
                labels: [{text, x, y, cls, anchor}] } in data units */
    function render(state) {
      state = state || {};
      var curves = state.curves || [];
      var sel = gCurves.selectAll("path").data(curves);
      sel.enter().append("path").merge(sel)
        .attr("class", function (d) { return d.cls; })
        .attr("d", function (d) { return curvePath(d.f, 0, opts.xMax, x, y, 180); });
      sel.exit().remove();

      var segs = state.misses ? opts.points : [];
      var m = gMiss.selectAll("line").data(segs);
      m.enter().append("line").merge(m)
        .attr("class", "miss-line" + (state.misses && state.misses.cls ? " " + state.misses.cls : ""))
        .attr("x1", function (d) { return x(d.x); })
        .attr("x2", function (d) { return x(d.x); })
        .attr("y1", function (d) { return y(state.misses.f(d.x)); })
        .attr("y2", function (d) { return y(d.y); });
      m.exit().remove();

      var labels = state.labels || [];
      var lab = gInk.selectAll("text").data(labels);
      lab.enter().append("text").merge(lab)
        .attr("class", function (d) { return "halo " + d.cls; })
        .attr("text-anchor", function (d) { return d.anchor || "start"; })
        .attr("x", function (d) { return x(d.x) + (d.dx || 0); })
        .attr("y", function (d) { return y(d.y) + (d.dy || 0); })
        .text(function (d) { return d.text; });
      lab.exit().remove();
    }

    return { render: render, x: x, y: y, svg: svg };
  }

  /* ========================================================== the hill ==== */
  /* A loss curve seen from the side, with a grasshopper on it.
     opts: { width, height, xMin, xMax, yMax, xTicks: [..], xFormat, xTitle,
             xTitleCls, yTitle, curveCls, hopper: { cls, tag, scale },
             ml, mb, label }                                                */
  function hill(host, opts) {
    var W = opts.width, H = opts.height;
    var ml = opts.ml || 34, mr = opts.mr || 14, mt = opts.mt || 10, mb = opts.mb || 38;
    var x = d3.scaleLinear().domain([opts.xMin, opts.xMax]).range([ml, W - mr]);
    /* a little air under the lowest point, so a grasshopper standing there is
       clear of the axis line and the tick labels under it */
    var y = d3.scaleLinear().domain([-0.045 * opts.yMax, opts.yMax]).range([H - mb, mt]);
    var id = uid("hl");

    var svg = svgIn(host, W, H, opts.label || "A loss curve");

    svg.append("clipPath").attr("id", id + "-clip").append("rect")
      .attr("x", ml).attr("y", mt - 6).attr("width", W - ml - mr).attr("height", H - mt - mb + 6);
    svg.append("rect").attr("class", "sky")
      .attr("x", ml).attr("y", mt - 6).attr("width", W - ml - mr).attr("height", H - mt - mb + 6);

    var gPlot = svg.append("g").attr("clip-path", "url(#" + id + "-clip)");
    var ground = gPlot.append("path").attr("class", "ground");
    var ghost = gPlot.append("path").attr("class", "ghost-curve");
    var curve = gPlot.append("path").attr("class", "loss-curve" + (opts.curveCls ? " " + opts.curveCls : ""));
    var gTrail = gPlot.append("g");
    var ride = gPlot.append("line").attr("class", "ride");
    var landedDot = gPlot.append("circle").attr("class", "landed-dot").attr("r", 3.4);
    var tangent = gPlot.append("line").attr("class", "tangent" + (opts.curveCls ? " " + opts.curveCls : ""));
    var gActor = svg.append("g");
    var gAxis = svg.append("g");

    (opts.xTicks || []).forEach(function (v) {
      gAxis.append("line").attr("class", "tick-line")
        .attr("x1", x(v)).attr("x2", x(v)).attr("y1", H - mb).attr("y2", H - mb + 5);
      gAxis.append("text").attr("class", "tick-ink")
        .attr("x", x(v)).attr("y", H - mb + 20).attr("text-anchor", "middle")
        .text(opts.xFormat ? opts.xFormat(v) : v);
    });
    gAxis.append("line").attr("class", "axis-line")
      .attr("x1", ml).attr("x2", W - mr).attr("y1", H - mb).attr("y2", H - mb);
    gAxis.append("line").attr("class", "axis-line")
      .attr("x1", ml).attr("x2", ml).attr("y1", H - mb).attr("y2", mt - 6);
    gAxis.append("text").attr("class", "axis-title" + (opts.xTitleCls ? " " + opts.xTitleCls : ""))
      .attr("x", W - mr).attr("y", H - 4).attr("text-anchor", "end")
      .text(opts.xTitle);
    /* a title of one letter stands upright at the top of its axis; a longer
       one is rotated along it */
    if (opts.yTitle && opts.yTitle.length === 1) {
      gAxis.append("text").attr("class", "axis-title")
        .attr("x", ml - 8).attr("y", mt + 8).attr("text-anchor", "end")
        .text(opts.yTitle);
    } else if (opts.yTitle) {
      gAxis.append("text").attr("class", "axis-title")
        .attr("transform", "translate(14," + ((H - mb + mt) / 2) + ") rotate(-90)")
        .attr("text-anchor", "middle")
        .text(opts.yTitle);
    }

    var hop = opts.hopper
      ? Hopper.create(gActor, opts.hopper.scale || 1.25, opts.hopper.cls, opts.hopper.tag, mt)
      : null;

    var area = d3.area().x(function (d) { return x(d[0]); })
      .y0(H - mb).y1(function (d) { return y(d[1]); });

    function sample(f) {
      var pts = [];
      for (var k = 0; k <= 200; k++) {
        var xv = opts.xMin + (opts.xMax - opts.xMin) * k / 200;
        pts.push([xv, f(xv)]);
      }
      return pts;
    }

    /* the slope of the curve ON SCREEN at x: the tilt the grasshopper stands at */
    function screenSlope(slope, xv) {
      return -slope(xv) * (y(0) - y(1)) / (x(1) - x(0));
    }

    function inside(xv) { return xv >= opts.xMin && xv <= opts.xMax; }

    function arcPath(f, x1v, x2v) {
      var x1 = x(x1v), y1 = y(f(x1v));
      var x2 = x(x2v), y2 = y(f(x2v));
      var top = Math.min(y1, y2);
      for (var s = 1; s < 20; s++) top = Math.min(top, y(f(x1v + (x2v - x1v) * s / 20)));
      var chord = (y1 + y2) / 2;
      var apex = Math.min(chord, top) - 18;
      return "M " + x1 + " " + y1 + " Q " + ((x1 + x2) / 2) + " " + (2 * apex - chord) +
             " " + x2 + " " + y2;
    }

    /* state = { f, slope, x, lift, facing, tangent: bool,
                 trail: [x..] (on f), ghost: f | null,
                 landed: { x, f } | null (where it came down on the old
                 ground f) }                                                */
    function render(state) {
      var f = state.f;
      var pts = sample(f);
      ground.attr("d", area(pts));
      curve.attr("d", d3.line().x(function (d) { return x(d[0]); })
        .y(function (d) { return y(d[1]); })(pts));

      if (state.ghost) {
        ghost.attr("display", null).attr("d", curvePath(state.ghost, opts.xMin, opts.xMax, x, y, 200));
      } else {
        ghost.attr("display", "none");
      }

      /* the arcs of the trail, then the dots, on the ground they were made on */
      var arcs = [], dots = [];
      var tr = state.trail || [];
      for (var i = 0; i < tr.length; i++) {
        if (inside(tr[i])) dots.push(tr[i]);
        if (i > 0 && inside(tr[i]) && inside(tr[i - 1])) arcs.push({ f: f, a: tr[i - 1], b: tr[i] });
      }
      var arc = gTrail.selectAll("path.hop-arc").data(arcs);
      arc.enter().append("path").merge(arc)
        .attr("class", "hop-arc")
        .attr("d", function (d) { return arcPath(d.f, d.a, d.b); });
      arc.exit().remove();
      var dot = gTrail.selectAll("circle.trail-dot").data(dots);
      dot.enter().append("circle").attr("class", "trail-dot").attr("r", 3.6).merge(dot)
        .attr("cx", function (d) { return x(d); })
        .attr("cy", function (d) { return y(f(d)); });
      dot.exit().remove();

      /* where the grasshopper landed on the old ground, and the climb or drop
         the new ground gave it there: a dotted line straight up or down */
      if (state.landed && inside(state.landed.x)) {
        var yo = y(state.landed.f(state.landed.x)), yn = y(f(state.landed.x));
        var far = Math.abs(yo - yn) > 3;
        ride.attr("display", far ? null : "none")
          .attr("x1", x(state.landed.x)).attr("x2", x(state.landed.x))
          .attr("y1", yo).attr("y2", yn);
        landedDot.attr("display", far ? null : "none")
          .attr("cx", x(state.landed.x)).attr("cy", yo);
      } else {
        ride.attr("display", "none");
        landedDot.attr("display", "none");
      }

      var here = state.x;
      var on = here !== null && here !== undefined && inside(here);
      if (on && state.tangent) {
        var ang = Math.atan(screenSlope(state.slope, here));
        var cx0 = x(here), cy0 = y(f(here));
        tangent.attr("display", null)
          .attr("x1", cx0 - 46 * Math.cos(ang)).attr("y1", cy0 - 46 * Math.sin(ang))
          .attr("x2", cx0 + 46 * Math.cos(ang)).attr("y2", cy0 + 46 * Math.sin(ang));
      } else {
        tangent.attr("display", "none");
      }

      if (hop) {
        if (on) {
          hop.place(x(here), y(f(here)) - (state.lift || 0),
                    Math.atan(screenSlope(state.slope, here)) * 180 / Math.PI,
                    state.facing === undefined ? 1 : state.facing, y(f(here)));
          hop.show(true);
        } else {
          hop.show(false);
        }
      }
    }

    return { render: render, x: x, y: y, inside: inside, svg: svg };
  }

  /* ========================================================== the bowl ==== */
  /* L(a, b) from above.
     opts: { width, height, px: [w, h] of the plotting box, aMin, aMax, bMin,
             bMax, f(a, b), floor (the lowest L), levels, aTicks, bTicks,
             label }                                                         */
  function bowl(host, opts) {
    var W = opts.width, H = opts.height;
    var PW = opts.px[0], PH = opts.px[1];
    var ml = opts.ml || 44, mt = opts.mt || 10;
    var x = d3.scaleLinear().domain([opts.aMin, opts.aMax]).range([ml, ml + PW]);
    var y = d3.scaleLinear().domain([opts.bMin, opts.bMax]).range([mt + PH, mt]);
    var id = uid("bw");

    var svg = svgIn(host, W, H, opts.label || "The loss seen from above");
    var defs = svg.append("defs");
    defs.append("clipPath").attr("id", id + "-clip").append("rect")
      .attr("x", ml).attr("y", mt).attr("width", PW).attr("height", PH);
    ["ka", "kb"].forEach(function (k) {
      defs.append("marker")
        .attr("id", id + "-head-" + k)
        .attr("viewBox", "0 0 10 10").attr("refX", 7).attr("refY", 5)
        .attr("markerWidth", 5).attr("markerHeight", 5)
        .attr("orient", "auto-start-reverse")
        .append("path").attr("class", "arrow-head " + k)
        .attr("d", "M0,0 L10,5 L0,10 z");
    });

    svg.append("rect").attr("class", "sky")
      .attr("x", ml).attr("y", mt).attr("width", PW).attr("height", PH);

    var gPlot = svg.append("g").attr("clip-path", "url(#" + id + "-clip)");
    var gBands = gPlot.append("g");
    var gPath = gPlot.append("g");
    var gSlices = gPlot.append("g");
    var gHops = gPlot.append("g");
    var gNow = gPlot.append("g");
    var gAxis = svg.append("g");
    var gInk = svg.append("g");

    /* THE BANDS ARE COMPUTED FROM THE DATA, once: the landscape does not move.
       The grid samples L at the centre of every cell, which is where
       d3.contours places each value, so the contour lines land where L has
       those values to within a fraction of a pixel. Each band is the region
       where L is below one level, painted with the same faint fill, so the
       nested bands stack and the deepest ground is the most solid. The levels
       rise with the square of their index, which spaces the ellipses evenly. */
    var G = opts.grid || 140;
    var vals = new Array(G * G);
    for (var j = 0; j < G; j++) {
      var bv = opts.bMax - (opts.bMax - opts.bMin) * (j + 0.5) / G;
      for (var i = 0; i < G; i++) {
        var av = opts.aMin + (opts.aMax - opts.aMin) * (i + 0.5) / G;
        vals[j * G + i] = -opts.f(av, bv);
      }
    }
    var thresholds = opts.levels.map(function (v) { return -v; }).sort(d3.ascending);
    var contours = d3.contours().size([G, G]).thresholds(thresholds)(vals);
    var geo = d3.geoPath();
    gBands.selectAll("path").data(contours).enter().append("path")
      .attr("class", "band")
      .attr("d", function (c) { return geo(c); })
      .attr("transform", "translate(" + ml + "," + mt + ") scale(" + (PW / G) + "," + (PH / G) + ")")
      .attr("fill-opacity", opts.bandOpacity || 0.075)
      .attr("vector-effect", "non-scaling-stroke");
    svg.append("rect").attr("class", "bowl-edge")
      .attr("x", ml).attr("y", mt).attr("width", PW).attr("height", PH);

    (opts.aTicks || []).forEach(function (v) {
      gAxis.append("line").attr("class", "tick-line")
        .attr("x1", x(v)).attr("x2", x(v)).attr("y1", mt + PH).attr("y2", mt + PH + 5);
      gAxis.append("text").attr("class", "tick-ink")
        .attr("x", x(v)).attr("y", mt + PH + 20).attr("text-anchor", "middle")
        .text(opts.aFormat ? opts.aFormat(v) : v);
    });
    (opts.bTicks || []).forEach(function (v) {
      gAxis.append("line").attr("class", "tick-line")
        .attr("x1", ml - 5).attr("x2", ml).attr("y1", y(v)).attr("y2", y(v));
      gAxis.append("text").attr("class", "tick-ink")
        .attr("x", ml - 9).attr("y", y(v) + 4.5).attr("text-anchor", "end")
        .text(opts.bFormat ? opts.bFormat(v) : v);
    });
    gAxis.append("text").attr("class", "axis-title ka")
      .attr("x", ml + PW).attr("y", mt + PH + 38).attr("text-anchor", "end").text("a");
    gAxis.append("text").attr("class", "axis-title kb")
      .attr("x", 12).attr("y", mt + 14).attr("text-anchor", "middle").text("b");

    var pathLine = gPath.append("path").attr("class", "path-line");
    var sliceA = gSlices.append("line").attr("class", "slice ka");
    var sliceB = gSlices.append("line").attr("class", "slice kb");
    var tagA = gInk.append("text").attr("class", "slice-tag ka halo").attr("text-anchor", "end").text("a");
    var tagB = gInk.append("text").attr("class", "slice-tag kb halo").attr("text-anchor", "start").text("b");
    var hopA = gHops.append("line").attr("class", "hop-arrow ka")
      .attr("marker-end", "url(#" + id + "-head-ka)");
    var hopB = gHops.append("line").attr("class", "hop-arrow kb")
      .attr("marker-end", "url(#" + id + "-head-kb)");
    /* where each grasshopper stands on its own slice: a on the horizontal
       line, b on the vertical one. At rest both sit under the point; during a
       step they part along the two hops and meet again as the slices move.
       A circle for a and a square for b, so they differ in more than colour. */
    var markA = gNow.append("circle").attr("class", "stand-mark ka").attr("r", 5.5);
    var markB = gNow.append("rect").attr("class", "stand-mark kb")
      .attr("width", 10).attr("height", 10);
    /* THE POINT IS BOTH GRASSHOPPERS AT ONCE, so it carries both: its left
       half in a's colour, its right half in b's, ringed in ink, and it sits
       where a's horizontal slice crosses b's vertical one */
    var now = gNow.append("g");
    now.append("path").attr("class", "now-half ka").attr("d", "M 0 -8.5 A 8.5 8.5 0 0 0 0 8.5 Z");
    now.append("path").attr("class", "now-half kb").attr("d", "M 0 -8.5 A 8.5 8.5 0 0 1 0 8.5 Z");
    now.append("circle").attr("class", "now-ring").attr("r", 8.5);

    /* state = { path: [[a, b]..], point: [a, b], sliceAt: [a, b] (the a of
                 b's vertical slice, the b of a's horizontal one),
                 standA: [a, b], standB: [a, b] (where each grasshopper is),
                 hopA: { from, to, b } | null, hopB: { from, to, a } | null } */
    function render(state) {
      var p = state.path || [];
      pathLine.attr("d", p.length > 1
        ? d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); })(p)
        : null);
      var dots = gPath.selectAll("circle.path-dot").data(p);
      dots.enter().append("circle").attr("class", "path-dot").attr("r", 2.6).merge(dots)
        .attr("cx", function (d) { return x(d[0]); })
        .attr("cy", function (d) { return y(d[1]); });
      dots.exit().remove();

      /* a's slice is the horizontal line at the b it holds, b's slice the
         vertical line at the a it holds */
      var sa = state.sliceAt[0], sb = state.sliceAt[1];
      sliceA.attr("x1", ml).attr("x2", ml + PW).attr("y1", y(sb)).attr("y2", y(sb));
      sliceB.attr("x1", x(sa)).attr("x2", x(sa)).attr("y1", mt).attr("y2", mt + PH);
      tagA.attr("x", ml + PW - 8).attr("y", y(sb) - 8);
      tagB.attr("x", x(sa) + 8).attr("y", mt + 20);

      function arrow(line, x1, y1, x2, y2) {
        var long = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) > 9;
        line.attr("display", long ? null : "none")
          .attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2);
      }
      if (state.hopA) arrow(hopA, x(state.hopA.from), y(state.hopA.b), x(state.hopA.to), y(state.hopA.b));
      else hopA.attr("display", "none");
      if (state.hopB) arrow(hopB, x(state.hopB.a), y(state.hopB.from), x(state.hopB.a), y(state.hopB.to));
      else hopB.attr("display", "none");

      var sa0 = state.standA || state.point, sb0 = state.standB || state.point;
      markA.attr("cx", x(sa0[0])).attr("cy", y(sa0[1]));
      markB.attr("x", x(sb0[0]) - 5).attr("y", y(sb0[1]) - 5);
      now.attr("transform", "translate(" + x(state.point[0]).toFixed(2) + "," +
                            y(state.point[1]).toFixed(2) + ")");
    }

    return { render: render, x: x, y: y, svg: svg };
  }

  return { scatter: scatter, hill: hill, bowl: bowl, tween: tween, ease: ease };
})();
