/* ===========================================================================
   plot.js : the pictures the two scenes are built from.

     Plot.scatter(host, opts)    ten houses, and a line w * x on top
     Plot.lbarChart(host, opts)  scene 2: l_bar against the round, one point
                                 per round of the run the scene draws
     Plot.tween(a, b, ms, onFrame, onDone)   one eased move, cancellable

   Rules this file obeys, from the house viz method:
     no colour is ever written here, only class names from css/style.css;
     every svg carries explicit width and height attributes AND the same values
     in css, so a flex parent cannot stretch it and the headless renderer sees
     what the browser sees.
   =========================================================================== */

window.Plot = (function () {
  "use strict";

  function reduceMotion() {
    try {
      return !!(window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }

  /* cubic in out */
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

  function svgIn(host, w, h, label) {
    return d3.select(host).append("svg")
      .attr("width", w).attr("height", h)
      .attr("viewBox", "0 0 " + w + " " + h)
      .style("width", w + "px").style("height", h + "px")
      .attr("role", "img").attr("aria-label", label);
  }

  /* ========================================================= the scatter ==== */
  /* opts: { width, height, houses, plot, showIds }

     render(state), state = {
       lines:    [{ w, cls, tag }]   tag: the line's name, set on it
       misses:   [{ w, to, indices, cls, tag }]   the vertical segment from
                 the line at w to each house's dot; tag labels the segment,
                 clear of the line at w and at to, where the round moves it
       visiting: the index of the house to ring and name, or null
     } */
  function scatter(host, opts) {
    var W = opts.width, H = opts.height;
    var houses = opts.houses;
    var areaMax = opts.plot.areaMax, priceMax = opts.plot.priceMax;
    var ml = 70, mr = 20, mt = 14, mb = 42;
    var x = d3.scaleLinear().domain([0, areaMax]).range([ml, W - mr]);
    var y = d3.scaleLinear().domain([0, priceMax]).range([H - mb, mt]);
    var uid = "sc" + Math.floor(Math.random() * 1e9);

    var svg = svgIn(host, W, H, "Ten houses, living area against price");

    svg.append("clipPath").attr("id", uid + "-clip").append("rect")
      .attr("x", ml).attr("y", mt).attr("width", W - ml - mr).attr("height", H - mt - mb);

    var gGrid = svg.append("g");
    var gAxis = svg.append("g");
    var gPlot = svg.append("g").attr("clip-path", "url(#" + uid + "-clip)");
    var gMiss = gPlot.append("g");
    var gLines = gPlot.append("g");
    var gDots = svg.append("g");
    var gInk = svg.append("g");

    /* axes, drawn once */
    y.ticks(5).forEach(function (v) {
      gGrid.append("line").attr("class", "grid-line")
        .attr("x1", ml).attr("x2", W - mr).attr("y1", y(v)).attr("y2", y(v));
      gAxis.append("text").attr("class", "tick-ink")
        .attr("x", ml - 10).attr("y", y(v) + 5).attr("text-anchor", "end")
        .text(v === 0 ? "0" : Fmt.millions(v));
    });
    d3.range(0, areaMax + 1, 30).forEach(function (v) {
      gAxis.append("line").attr("class", "tick-line")
        .attr("x1", x(v)).attr("x2", x(v)).attr("y1", H - mb).attr("y2", H - mb + 5);
      gAxis.append("text").attr("class", "tick-ink")
        .attr("x", x(v)).attr("y", H - mb + 21).attr("text-anchor", "middle").text(v);
    });
    gAxis.append("line").attr("class", "axis-line")
      .attr("x1", ml).attr("x2", W - mr).attr("y1", H - mb).attr("y2", H - mb);
    gAxis.append("line").attr("class", "axis-line")
      .attr("x1", ml).attr("x2", ml).attr("y1", H - mb).attr("y2", mt);
    gAxis.append("text").attr("class", "axis-title")
      .attr("x", W - mr).attr("y", H - 4).attr("text-anchor", "end")
      .text("Living area, square metres");
    /* ROTATED, along the axis it names. Set horizontally above the axis it ran
       off the left edge of the panel, which the first headless capture caught:
       the label read "rice, CHF". */
    gAxis.append("text").attr("class", "axis-title")
      .attr("transform", "translate(16," + ((H - mb + mt) / 2) + ") rotate(-90)")
      .attr("text-anchor", "middle")
      .text("Price, CHF");

    /* Where the line's own name sits: on the line at 40 square metres. No
       house is smaller than 67, so that stretch of the picture is always
       empty. At the far end of the line the name ran into "House 10" whenever
       house 10 was the house visited, and below that end it touched the dot. */
    var LINE_TAG_AT = 40;

    /* The room around an "l" set 20 px left or right of the house at hx, on
       baseline b: the distance from its glyph to the nearest other house's
       dot centre, or -1 when it touches the name above the ring or the line,
       where it stands (d.w) or where this round moves it (d.to). */
    function tagRoom(d, hx, left, b) {
      var x0 = left ? hx - 28 : hx + 21, x1 = left ? hx - 21 : hx + 28;
      var y0 = b - 12, y1 = b + 1;
      var top = y(d.h.price) - 22;
      if (!(x1 < hx - 64 || x0 > hx + 2 || y1 < top - 11 || y0 > top + 3)) return -1;
      var onLine = [d.w, d.to === undefined ? d.w : d.to].some(function (w) {
        var ya = y(w * x.invert(x0)), yb = y(w * x.invert(x1));
        return Math.max(ya, yb) >= y0 - 2 && Math.min(ya, yb) <= y1 + 2;
      });
      if (onLine) return -1;
      var room = Infinity;
      houses.forEach(function (h) {
        if (h === d.h) return;
        var cx = x(h.area), cy = y(h.price);
        var nx = Math.max(x0, Math.min(cx, x1)), ny = Math.max(y0, Math.min(cy, y1));
        room = Math.min(room, Math.sqrt((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy)));
      });
      return room;
    }

    /* The segment's own name, beside the middle of it and clear of the ring,
       so the picture says which number of the code it is. First choice is
       the side the line leans away from: the line rises to the right, so it
       climbs into a label right of a house above it and into one left of a
       house below it. Set always on the right, the "l" sat on the dashed line
       in about one round in three. Then the other side, then both sides 6 and
       12 px up or down: the first spot 14 px clear of every other dot, else
       the roomiest spot off the line. */
    function missTag(d) {
      var hx = x(d.h.area);
      var b = (y(d.w * d.h.area) + y(d.h.price)) / 2 + 5;
      var away = d.h.price > d.w * d.h.area;
      var best = null;
      [0, -6, 6, -12, 12].forEach(function (dy) {
        [away, !away].forEach(function (left) {
          if (best && best.room >= 14) return;
          var t = { left: left, b: b + dy, room: tagRoom(d, hx, left, b + dy) };
          if (t.room >= 0 && (!best || t.room > best.room)) best = t;
        });
      });
      var pick = best || { left: away, b: b };
      return { x: pick.left ? hx - 20 : hx + 20, y: pick.b, anchor: pick.left ? "end" : "start",
               text: d.tag, cls: "var-ink rm" };
    }

    function render(state) {
      state = state || {};
      var lines = state.lines || [];
      var misses = state.misses || [];

      /* the misses first, so a line is drawn over its own segment */
      var segs = [];
      misses.forEach(function (m) {
        (m.indices || []).forEach(function (i) {
          segs.push({ cls: m.cls, h: houses[i], w: m.w, to: m.to, tag: m.tag });
        });
      });
      var seg = gMiss.selectAll("line.miss-line").data(segs);
      seg.enter().append("line").merge(seg)
        .attr("class", function (d) { return "miss-line " + d.cls; })
        .attr("x1", function (d) { return x(d.h.area); })
        .attr("x2", function (d) { return x(d.h.area); })
        .attr("y1", function (d) { return y(d.w * d.h.area); })
        .attr("y2", function (d) { return y(d.h.price); });
      seg.exit().remove();

      var ln = gLines.selectAll("line.fit-line").data(lines);
      ln.enter().append("line").merge(ln)
        .attr("class", function (d) { return "fit-line " + d.cls; })
        .attr("x1", x(0)).attr("y1", y(0))
        .attr("x2", function (d) { return x(areaMax); })
        .attr("y2", function (d) { return y(d.w * areaMax); });
      ln.exit().remove();

      var dot = gDots.selectAll("circle.house-dot").data(houses);
      dot.enter().append("circle").attr("r", 7).merge(dot)
        .attr("class", function (d, i) {
          return "house-dot" + (state.visiting === i ? " is-visiting" : "");
        })
        .attr("cx", function (d) { return x(d.area); })
        .attr("cy", function (d) { return y(d.price); });
      dot.exit().remove();

      /* the ring on the house being visited */
      var marks = [];
      if (state.visiting !== null && state.visiting !== undefined) {
        marks.push(houses[state.visiting]);
      }
      var ring = gInk.selectAll("circle.visit-ring").data(marks);
      ring.enter().append("circle").attr("r", 14).merge(ring)
        .attr("class", "visit-ring")
        .attr("cx", function (d) { return x(d.area); })
        .attr("cy", function (d) { return y(d.price); });
      ring.exit().remove();

      var labels = [];
      if (opts.showIds) {
        /* Houses 1 and 2, 5 and 6, 7 and 8, and 9 and 10 sit within a few
           pixels of one another, so a label always on the same side of the dot
           collides with its neighbour's. Each id sits 16 px from its dot on
           the far side from its nearest neighbour, so every pair reads
           outwards. Odd ids above and even ids below set "1" and "9", the
           lower house of their pairs, beside the other house's dot. */
        houses.forEach(function (h) {
          var hx = x(h.area), hy = y(h.price), ux = 0, uy = -1, near = Infinity;
          houses.forEach(function (o) {
            if (o === h) return;
            var dx = x(o.area) - hx, dy = y(o.price) - hy;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < near) { near = d; ux = -dx / d; uy = -dy / d; }
          });
          labels.push({
            x: hx + 16 * ux, y: hy + 16 * uy + 5,
            anchor: ux < -0.35 ? "end" : (ux > 0.35 ? "start" : "middle"),
            text: String(h.id), cls: "house-label"
          });
        });
      } else if (marks.length) {
        /* ABOVE the ring, ending over its centre. Beside the dot it landed on
           the neighbouring house at one end of the street and ran off the
           right edge of the panel at the other, both caught in a capture.
           Centred over the ring, it had the line, which rises to the right
           through the dot, running through its last letters in about one
           round in three, the last round of the run included. */
        labels.push({ x: x(marks[0].area), y: y(marks[0].price) - 22, anchor: "end",
                      text: "House " + marks[0].id, cls: "miss-ink rm" });
      }
      segs.forEach(function (d) { if (d.tag) labels.push(missTag(d)); });
      /* The line's own name, just above the line, ending where it crosses
         LINE_TAG_AT. */
      lines.forEach(function (d) {
        if (!d.tag) return;
        labels.push({ x: x(LINE_TAG_AT), y: y(d.w * LINE_TAG_AT) - 10,
                      anchor: "end", text: d.tag, cls: "var-ink " + d.cls });
      });

      var lab = gInk.selectAll("text.plot-label").data(labels);
      lab.enter().append("text").merge(lab)
        .attr("class", function (d) { return "plot-label " + d.cls; })
        .attr("text-anchor", function (d) { return d.anchor || "start"; })
        .attr("x", function (d) { return d.x; })
        .attr("y", function (d) { return d.y; })
        .text(function (d) { return d.text; });
      lab.exit().remove();
    }

    return { render: render, x: x, y: y, svg: svg };
  }

  /* ============================================== l_bar, round by round ==== */
  /* opts: { width, height, tol }

     run(rows)       fixes both axes for one run. rows are the scene's own
                     Algo.rmRun rows, rows[k].lBar the verdict after round k,
                     so the chart draws the run the scatter draws and never
                     computes a verdict of its own
     render(state)   state = { upTo, met }: rounds 0 to upTo are drawn and the
                     point of round upTo is ringed; met makes the ring heavy,
                     once the loop has stopped on that point

     A LINEAR axis that holds the start, 1.6 million francs at w = 10 000, so
     the fall reads. The band abs(l_bar) <= tol is drawn TO SCALE: 3 000 francs
     is about 0.2 px either side of zero there, so the band lies inside the
     zero line. Drawn thicker, it would hold the points of rounds 41 and 42 of
     the default run (24 116 and 9 394 francs) while the loop runs on. Every
     dot carries its round and its exact l_bar as data-round and data-lbar,
     which verify.sh reads back and compares with precompute/reference.py. */
  function lbarChart(host, opts) {
    var W = opts.width, H = opts.height, TOL = opts.tol;
    var ml = 70, mr = 20, mt = 30, mb = 26;
    var x = d3.scaleLinear().range([ml, W - mr]);
    var y = d3.scaleLinear().range([H - mb, mt]);
    var uid = "lb" + Math.floor(Math.random() * 1e9);
    var values = [];
    var drawn = null;          /* the state on screen, so a tween frame is free */

    var svg = svgIn(host, W, H, "The average miss l_bar, round by round");
    svg.attr("class", "lbar-chart");

    svg.append("clipPath").attr("id", uid + "-clip").append("rect")
      .attr("x", ml).attr("y", mt).attr("width", W - ml - mr).attr("height", H - mt - mb);

    var gAxis = svg.append("g");
    var gPlot = svg.append("g").attr("clip-path", "url(#" + uid + "-clip)");
    var line = gPlot.append("path").attr("class", "lbar-line");
    var gDots = svg.append("g");
    var gInk = svg.append("g");

    /* The title names the curve; l_bar is set in the code's own face, as the
       readout above the code sets it. */
    var title = svg.append("text").attr("class", "chart-title").attr("x", 4).attr("y", 17);
    title.append("tspan").text("Average miss ");
    title.append("tspan").attr("class", "code-ink").text("l_bar");
    title.append("tspan").text(", round by round");

    function drawAxes() {
      gAxis.selectAll("*").remove();
      var x0 = ml, x1 = W - mr;
      y.ticks(4).forEach(function (v) {
        if (v !== 0) {
          gAxis.append("line").attr("class", "grid-line")
            .attr("x1", x0).attr("x2", x1).attr("y1", y(v)).attr("y2", y(v));
        }
        gAxis.append("text").attr("class", "tick-ink")
          .attr("x", ml - 10).attr("y", y(v) + 5).attr("text-anchor", "end")
          .text(v === 0 ? "0" : Fmt.millions(v));
      });
      x.ticks(6).forEach(function (v) {
        gAxis.append("text").attr("class", "tick-ink")
          .attr("x", x(v)).attr("y", H - 6).attr("text-anchor", "middle").text(v);
      });
      gAxis.append("line").attr("class", "axis-line")
        .attr("x1", ml).attr("x2", ml).attr("y1", H - mb).attr("y2", mt);
      /* the stopping band, to scale, and the zero line over it */
      gAxis.append("rect").attr("class", "tol-band")
        .attr("x", x0).attr("width", x1 - x0)
        .attr("y", y(TOL)).attr("height", y(-TOL) - y(TOL))
        .attr("data-tol", TOL);
      gAxis.append("line").attr("class", "zero-line")
        .attr("x1", x0).attr("x2", x1).attr("y1", y(0)).attr("y2", y(0));
      gAxis.append("text").attr("class", "axis-title")
        .attr("transform", "translate(16," + ((H - mb + mt) / 2) + ") rotate(-90)")
        .attr("text-anchor", "middle")
        .text("CHF");
    }

    function run(rows) {
      values = rows.map(function (r) { return r.lBar; });
      var last = values.length - 1;
      var hi = d3.max(values), lo = Math.min(0, d3.min(values));
      var pad = 0.05 * hi;
      /* Whole tens of rounds, with room after the last point for its ring. */
      x.domain([0, Math.max(10, Math.ceil((last + 1) / 10) * 10)]);
      y.domain([lo - pad, hi + 1.5 * pad]);
      drawAxes();
      drawn = null;
    }

    function render(state) {
      var upTo = Math.max(0, Math.min(state.upTo, values.length - 1));
      var met = !!state.met;
      if (drawn && drawn.upTo === upTo && drawn.met === met) return;
      drawn = { upTo: upTo, met: met };

      var pts = values.slice(0, upTo + 1).map(function (v, k) { return { k: k, v: v }; });
      line.attr("d", d3.line()
        .x(function (d) { return x(d.k); })
        .y(function (d) { return y(d.v); })(pts));

      var dot = gDots.selectAll("circle.lbar-dot").data(pts);
      dot.enter().append("circle").attr("r", 3).merge(dot)
        .attr("class", function (d) { return "lbar-dot" + (d.k === upTo ? " is-now" : ""); })
        .attr("cx", function (d) { return x(d.k); })
        .attr("cy", function (d) { return y(d.v); })
        .attr("data-round", function (d) { return d.k; })
        .attr("data-lbar", function (d) { return d.v; });
      dot.exit().remove();

      var ring = gInk.selectAll("circle.lbar-now").data([pts[pts.length - 1]]);
      ring.enter().append("circle").attr("r", 8).merge(ring)
        .attr("class", "lbar-now" + (met ? " is-met" : ""))
        .attr("cx", function (d) { return x(d.k); })
        .attr("cy", function (d) { return y(d.v); });
      ring.exit().remove();
    }

    return { run: run, render: render, x: x, y: y, svg: svg };
  }

  return { scatter: scatter, lbarChart: lbarChart, tween: tween, ease: ease };
})();
