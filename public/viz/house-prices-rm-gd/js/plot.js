/* ===========================================================================
   plot.js : the two pictures every scene is built from.

     Plot.scatter(host, opts)    ten houses, and a line y_hat = w x on top
     Plot.lossCurve(host, opts)  L(w), the average squared miss, as the hillside
     Plot.tween(a, b, ms, onFrame, onDone)   one eased move, cancellable

   Rules this file obeys, from the house viz method:
     no colour is ever written here, only class names from css/style.css;
     every svg carries explicit width and height attributes AND the same values
     in css, so a flex parent cannot stretch it and the headless renderer sees
     what the browser sees.
   =========================================================================== */

window.Plot = (function () {
  "use strict";

  var EASE_DUR = 520;   /* ms for one step, at speed 1 */

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

  function svgIn(host, w, h, label) {
    return d3.select(host).append("svg")
      .attr("width", w).attr("height", h)
      .attr("viewBox", "0 0 " + w + " " + h)
      .style("width", w + "px").style("height", h + "px")
      .attr("role", "img").attr("aria-label", label);
  }

  /* ========================================================= the scatter ==== */
  /* opts: { width, height, houses, plot, showIds } */
  function scatter(host, opts) {
    var W = opts.width, H = opts.height;
    var houses = opts.houses;
    var ml = 66, mr = 20, mt = 14, mb = 38;
    var x = d3.scaleLinear().domain([0, opts.plot.areaMax]).range([ml, W - mr]);
    var y = d3.scaleLinear().domain([0, opts.plot.priceMax]).range([H - mb, mt]);
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
        .attr("x", ml - 10).attr("y", y(v) + 4).attr("text-anchor", "end")
        .text(v === 0 ? "0" : Fmt.millions(v));
    });
    d3.range(0, opts.plot.areaMax + 1, 30).forEach(function (v) {
      gAxis.append("line").attr("class", "tick-line")
        .attr("x1", x(v)).attr("x2", x(v)).attr("y1", H - mb).attr("y2", H - mb + 5);
      gAxis.append("text").attr("class", "tick-ink")
        .attr("x", x(v)).attr("y", H - mb + 20).attr("text-anchor", "middle").text(v);
    });
    gAxis.append("line").attr("class", "axis-line")
      .attr("x1", ml).attr("x2", W - mr).attr("y1", H - mb).attr("y2", H - mb);
    gAxis.append("line").attr("class", "axis-line")
      .attr("x1", ml).attr("x2", ml).attr("y1", H - mb).attr("y2", mt);
    gAxis.append("text").attr("class", "axis-title")
      .attr("x", W - mr).attr("y", H - 6).attr("text-anchor", "end")
      .text("Living area, square metres");
    /* ROTATED, along the axis it names. Set horizontally above the axis it ran
       off the left edge of the panel, which the first headless capture caught:
       the label read "rice, CHF". */
    gAxis.append("text").attr("class", "axis-title")
      .attr("transform", "translate(14," + ((H - mb + mt) / 2) + ") rotate(-90)")
      .attr("text-anchor", "middle")
      .text("Price, CHF");

    function lineEnds(w) {
      /* the clip rectangle takes care of the rest, so both ends can sit
         outside the drawn window */
      return [{ ax: 0, p: 0 }, { ax: opts.plot.areaMax, p: w * opts.plot.areaMax }];
    }

    function render(state) {
      state = state || {};
      var lines = state.lines || [];
      var misses = state.misses || [];

      /* the misses first, so a line is drawn over its own segments */
      var segs = [];
      misses.forEach(function (m) {
        (m.indices || []).forEach(function (i) {
          var h = houses[i];
          segs.push({ cls: m.cls, h: h, w: m.w });
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
        .attr("x1", function (d) { return x(lineEnds(d.w)[0].ax); })
        .attr("y1", function (d) { return y(lineEnds(d.w)[0].p); })
        .attr("x2", function (d) { return x(lineEnds(d.w)[1].ax); })
        .attr("y2", function (d) { return y(lineEnds(d.w)[1].p); });
      ln.exit().remove();

      var dot = gDots.selectAll("circle.house-dot").data(houses);
      dot.enter().append("circle").attr("r", 6.5).merge(dot)
        .attr("class", function (d, i) {
          return "house-dot" + (state.visiting === i ? " is-visiting" : "");
        })
        .attr("cx", function (d) { return x(d.area); })
        .attr("cy", function (d) { return y(d.price); });
      dot.exit().remove();

      /* the ring on the house being visited, and the labels */
      var marks = [];
      if (state.visiting !== null && state.visiting !== undefined) {
        marks.push(houses[state.visiting]);
      }
      var ring = gInk.selectAll("circle.visit-ring").data(marks);
      ring.enter().append("circle").attr("r", 13).merge(ring)
        .attr("class", "visit-ring")
        .attr("cx", function (d) { return x(d.area); })
        .attr("cy", function (d) { return y(d.price); });
      ring.exit().remove();

      var labels = [];
      if (opts.showIds) {
        /* Houses 1 and 2, 5 and 6, and 9 and 10 sit within a few pixels of one
           another, so a label always on the same side of the dot collides with
           its neighbour's. Odd ids take the upper side and even ids the lower,
           which separates all three pairs. */
        houses.forEach(function (h) {
          labels.push({
            h: h, text: String(h.id), cls: "house-label",
            dx: 10, dy: (h.id % 2 === 1) ? -9 : 17
          });
        });
      } else if (marks.length) {
        /* ABOVE the ring and centred on it. Beside the dot it landed on the
           neighbouring house at one end of the street and ran off the right
           edge of the panel at the other, both caught in a capture. */
        labels.push({ h: marks[0], text: "House " + marks[0].id, cls: "miss-ink rm",
                      dx: 0, dy: -20, anchor: "middle" });
      }
      var lab = gInk.selectAll("text.plot-label").data(labels);
      lab.enter().append("text").merge(lab)
        .attr("class", function (d) { return "plot-label " + d.cls; })
        .attr("text-anchor", function (d) { return d.anchor || "start"; })
        .attr("x", function (d) { return x(d.h.area) + d.dx; })
        .attr("y", function (d) { return y(d.h.price) + d.dy; })
        .text(function (d) { return d.text; });
      lab.exit().remove();

      /* THE KEY SITS IN THE TOP LEFT CORNER, which on this data is the one
         part of the panel nothing is ever drawn in: the houses climb from the
         bottom left to the top right. At the right hand end of the two lines,
         where it started, the two names printed on top of one another and on
         top of the ring around the house being visited, which two captures
         caught. Each row carries its own line's dash pattern, so the key reads
         in greyscale as well. */
      var tags = lines.filter(function (d) { return d.label; });
      var key = gInk.selectAll("g.fit-key").data(tags);
      var keyIn = key.enter().append("g").attr("class", "fit-key");
      keyIn.append("line");
      keyIn.append("text");
      var keyAll = keyIn.merge(key);
      keyAll.attr("transform", function (d, i) {
        return "translate(" + (ml + 14) + "," + (mt + 20 + i * 21) + ")";
      });
      keyAll.select("line")
        .attr("class", function (d) { return "fit-line " + d.cls; })
        .attr("x1", 0).attr("x2", 26).attr("y1", -4).attr("y2", -4);
      keyAll.select("text")
        .attr("class", function (d) { return "fit-label " + d.cls; })
        .attr("x", 33).attr("y", 0)
        .text(function (d) { return d.label; });
      key.exit().remove();
    }

    return { render: render, x: x, y: y, svg: svg };
  }

  /* ======================================================= the loss curve ==== */
  /* opts: { width, height, houses, plot, stats, hopper } */
  function lossCurve(host, opts) {
    var W = opts.width, H = opts.height;
    var houses = opts.houses;
    var ml = 46, mr = 22, mt = 16, mb = 40;
    var wMin = opts.plot.wMin, wMax = opts.plot.wMax;
    var Lmax = Math.max(Algo.loss(wMin, houses), Algo.loss(wMax, houses)) * 1.03;
    var x = d3.scaleLinear().domain([wMin, wMax]).range([ml, W - mr]);
    /* A little air under the bowl. With the domain starting at zero the lowest
       point of the curve sat within half a pixel of the axis line, and the
       grasshopper standing there overlapped the tick label under it. The
       vertical axis carries no numbers, so the offset costs nothing and the
       block 2 deck draws L the same way. */
    var y = d3.scaleLinear().domain([-0.045 * Lmax, Lmax]).range([H - mb, mt]);
    var uid = "lc" + Math.floor(Math.random() * 1e9);

    var svg = svgIn(host, W, H, "The average squared miss as a function of w");

    svg.append("clipPath").attr("id", uid + "-clip").append("rect")
      .attr("x", ml).attr("y", mt - 6).attr("width", W - ml - mr).attr("height", H - mt - mb + 6);

    svg.append("rect").attr("class", "sky")
      .attr("x", ml).attr("y", mt - 6).attr("width", W - ml - mr).attr("height", H - mt - mb + 6);

    var pts = [];
    for (var k = 0; k <= 240; k++) {
      var wv = wMin + (wMax - wMin) * k / 240;
      pts.push({ w: wv, L: Algo.loss(wv, houses) });
    }
    var area = d3.area().x(function (d) { return x(d.w); })
      .y0(H - mb).y1(function (d) { return y(d.L); });
    var line = d3.line().x(function (d) { return x(d.w); })
      .y(function (d) { return y(d.L); });

    var gPlot = svg.append("g").attr("clip-path", "url(#" + uid + "-clip)");
    gPlot.append("path").attr("class", "ground").attr("d", area(pts));
    gPlot.append("path").attr("class", "loss-curve").attr("d", line(pts));

    var gTrail = gPlot.append("g");
    var gTangent = gPlot.append("g");
    var gActor = gPlot.append("g");
    var gAxis = svg.append("g");
    var gInk = svg.append("g");

    d3.range(wMin, wMax + 1, 12000).forEach(function (v) {
      gAxis.append("line").attr("class", "tick-line")
        .attr("x1", x(v)).attr("x2", x(v)).attr("y1", H - mb).attr("y2", H - mb + 5);
      gAxis.append("text").attr("class", "tick-ink")
        .attr("x", x(v)).attr("y", H - mb + 20).attr("text-anchor", "middle")
        .text(Fmt.axisRate(v));
    });
    gAxis.append("line").attr("class", "axis-line")
      .attr("x1", ml).attr("x2", W - mr).attr("y1", H - mb).attr("y2", H - mb);
    gAxis.append("line").attr("class", "axis-line")
      .attr("x1", ml).attr("x2", ml).attr("y1", H - mb).attr("y2", mt - 6);
    gAxis.append("text").attr("class", "axis-title")
      .attr("x", W - mr).attr("y", H - 6).attr("text-anchor", "end")
      .text("w, francs per square metre");
    gAxis.append("text").attr("class", "axis-title")
      .attr("transform", "translate(14," + ((H - mb + mt) / 2) + ") rotate(-90)")
      .attr("text-anchor", "middle")
      .text("L(w), the average squared miss");

    var hopper = opts.hopper ? Hopper.create(gActor, 1.25) : null;
    var nowDot = gActor.append("circle").attr("class", "now-dot").attr("r", 6)
      .attr("display", "none");

    /* screen slope of the curve at w, which is the tilt the grasshopper stands
       at and the line the tangent is drawn along */
    function screenSlope(w) {
      var g = Algo.grad(w, houses);
      return -g * (y(0) - y(1)) / ((x(1) - x(0)));
    }

    function tanAngle(w) { return Math.atan(screenSlope(w)); }

    function inside(w) { return w >= wMin && w <= wMax; }

    function arcPath(w1, w2) {
      var x1 = x(w1), y1 = y(Algo.loss(w1, houses));
      var x2 = x(w2), y2 = y(Algo.loss(w2, houses));
      var top = Math.min(y1, y2);
      for (var s = 1; s < 20; s++) {
        top = Math.min(top, y(Algo.loss(w1 + (w2 - w1) * s / 20, houses)));
      }
      var chord = (y1 + y2) / 2;
      var apex = Math.min(chord, top) - 18;
      return "M " + x1 + " " + y1 + " Q " + ((x1 + x2) / 2) + " " + (2 * apex - chord) +
             " " + x2 + " " + y2;
    }

    /* state = { trails: [{cls, ws:[...]}], current: {w, cls}, tangent: bool,
                 lift: px, note: string } */
    function render(state) {
      state = state || {};
      var trails = state.trails || [];

      var arcs = [];
      var dots = [];
      trails.forEach(function (t) {
        for (var i = 0; i < t.ws.length; i++) {
          if (inside(t.ws[i])) dots.push({ cls: t.cls, w: t.ws[i] });
          if (i > 0 && inside(t.ws[i]) && inside(t.ws[i - 1])) {
            arcs.push({ cls: t.cls, a: t.ws[i - 1], b: t.ws[i] });
          }
        }
      });

      var arc = gTrail.selectAll("path.hop-arc").data(arcs);
      arc.enter().append("path").merge(arc)
        .attr("class", function (d) { return "hop-arc " + d.cls; })
        .attr("d", function (d) { return arcPath(d.a, d.b); });
      arc.exit().remove();

      /* A SHAPE PER RULE, so the two walks stay apart in greyscale and where
         they cross: a circle for gradient descent, a triangle for
         Robbins-Monro. */
      var dot = gTrail.selectAll("path.trail-dot").data(dots);
      dot.enter().append("path").merge(dot)
        .attr("class", function (d) { return "trail-dot " + d.cls; })
        .attr("d", function (d) {
          return d3.symbol()
            .type(d.cls === "rm" ? d3.symbolTriangle : d3.symbolCircle)
            .size(d.cls === "rm" ? 52 : 42)();
        })
        .attr("transform", function (d) {
          return "translate(" + x(d.w) + "," + y(Algo.loss(d.w, houses)) + ")";
        });
      dot.exit().remove();

      var cur = state.current;
      var tanData = (cur && state.tangent && inside(cur.w)) ? [cur] : [];
      /* A SHORT tangent of a FIXED LENGTH. Held to a fixed horizontal reach it
         would be 280px tall on the steep part of this parabola, where the
         screen slope passes 2, and it would then read as a second curve. */
      var tan = gTangent.selectAll("line.tangent").data(tanData);
      tan.enter().append("line").merge(tan)
        .attr("class", "tangent")
        .attr("x1", function (d) { return x(d.w) - 52 * Math.cos(tanAngle(d.w)); })
        .attr("y1", function (d) {
          return y(Algo.loss(d.w, houses)) - 52 * Math.sin(tanAngle(d.w));
        })
        .attr("x2", function (d) { return x(d.w) + 52 * Math.cos(tanAngle(d.w)); })
        .attr("y2", function (d) {
          return y(Algo.loss(d.w, houses)) + 52 * Math.sin(tanAngle(d.w));
        });
      tan.exit().remove();

      var lift = state.lift || 0;
      if (cur && inside(cur.w)) {
        var cx = x(cur.w), cy = y(Algo.loss(cur.w, houses)) - lift;
        if (hopper) {
          hopper.place(cx, cy, Math.atan(screenSlope(cur.w)) * 180 / Math.PI,
                       cur.facing === undefined ? 1 : cur.facing);
          hopper.show(true);
          nowDot.attr("display", "none");
        } else {
          nowDot.attr("display", null)
            .attr("class", "now-dot " + (cur.cls || ""))
            .attr("cx", cx).attr("cy", cy);
        }
      } else {
        if (hopper) hopper.show(false);
        nowDot.attr("display", "none");
      }

      var notes = state.note ? [state.note] : [];
      var note = gInk.selectAll("text.off-picture").data(notes);
      note.enter().append("text").merge(note)
        .attr("class", "off-picture")
        .attr("text-anchor", "middle")
        .attr("x", (ml + W - mr) / 2).attr("y", mt + 18)
        .text(function (d) { return d; });
      note.exit().remove();
    }

    return {
      render: render,
      x: x,
      y: y,
      inside: inside,
      screenSlope: screenSlope,
      svg: svg
    };
  }

  return { scatter: scatter, lossCurve: lossCurve, tween: tween, ease: ease, EASE_DUR: EASE_DUR };
})();
