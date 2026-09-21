/* Shared drawing. Two panels appear in more than one scene, so they are built
 * here once: the day panel (hours across, pickups up) and the landscape panel
 * (a flat slice of the loss, seen from above).
 *
 * NO COLOUR IS WRITTEN HERE. Every mark carries a class from css/style.css.
 *
 * Globals used: d3, window.NNVIZ. */

window.Plot = (function () {
  'use strict';

  var D = function () { return window.NNVIZ.data; };
  var clipSeq = 0;

  /** A fixed size svg with a viewBox, so it scales without reflowing. */
  function svg(host, w, h, cls) {
    return d3.select(host).append('svg')
      .attr('class', cls || '')
      .attr('viewBox', '0 0 ' + w + ' ' + h)
      .attr('width', w).attr('height', h)
      .attr('role', 'img');
  }

  function round(v, dp) {
    var f = Math.pow(10, dp || 0);
    return Math.round(v * f) / f;
  }

  /** 1234.5 becomes "1,235". Rounded numbers only, never a wall of digits. */
  function commas(v, dp) {
    var s = round(v, dp || 0).toFixed(dp || 0);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function stepLabel(n) {
    if (n >= 1000000) return round(n / 1000000, 1) + 'm';
    if (n >= 1000) return round(n / 1000, n >= 10000 ? 0 : 1) + 'k';
    return String(n);
  }

  /* ====================================================== the day panel */

  /**
   * Hours across, pickups up. Returns the scales and the layers to draw into,
   * in back to front order.
   */
  function dayPanel(host, opts) {
    opts = opts || {};
    var w = opts.width || 700;
    var h = opts.height || 470;
    var m = opts.margin || { top: 10, right: 14, bottom: 30, left: 48 };
    var yMax = opts.yMax || 240;
    var small = !!opts.small;

    var root = svg(host, w, h, 'day-panel');
    root.attr('aria-label', 'Bike pickups at the dock, hour by hour');

    // The floor sits below zero on purpose. A network fitted to a day that
    // starts at nothing will dip under zero at 05:00, and that is worth
    // seeing; what it may not do is escape the panel and land on the prose,
    // which is what the clip below is for.
    var yMin = opts.yMin != null ? opts.yMin : -22;
    var x = d3.scaleLinear().domain([5, 23]).range([m.left, w - m.right]);
    var y = d3.scaleLinear().domain([yMin, yMax]).range([h - m.bottom, m.top]);

    var uid = 'day-clip-' + (++clipSeq);
    root.append('defs').append('clipPath').attr('id', uid)
      .append('rect')
      .attr('x', m.left - 1).attr('y', m.top - 1)
      .attr('width', w - m.left - m.right + 2)
      .attr('height', h - m.top - m.bottom + 2);

    var gGrid = root.append('g');
    var gAxis = root.append('g');
    var layers = {
      days: root.append('g').attr('clip-path', 'url(#' + uid + ')'),
      line: root.append('g').attr('clip-path', 'url(#' + uid + ')'),
      net: root.append('g').attr('clip-path', 'url(#' + uid + ')'),
      dots: root.append('g').attr('clip-path', 'url(#' + uid + ')'),
      top: root.append('g')
    };

    var yTicks = opts.yTicks || (small ? [0, 100, 200] : [0, 50, 100, 150, 200]);
    yTicks.forEach(function (v) {
      gGrid.append('line').attr('class', 'grid-line')
        .attr('x1', m.left).attr('x2', w - m.right)
        .attr('y1', y(v)).attr('y2', y(v));
      gAxis.append('text').attr('class', 'tick-text')
        .attr('x', m.left - 7).attr('y', y(v) + 4)
        .attr('text-anchor', 'end').text(v);
    });

    var xTicks = opts.xTicks || (small ? [6, 12, 18] : [6, 9, 12, 15, 18, 21]);
    xTicks.forEach(function (v) {
      gAxis.append('line').attr('class', 'tick-line')
        .attr('x1', x(v)).attr('x2', x(v))
        .attr('y1', y(0)).attr('y2', y(0) + 4);
      gAxis.append('text').attr('class', 'tick-text')
        .attr('x', x(v)).attr('y', y(0) + 16)
        .attr('text-anchor', 'middle').text(v);
    });

    gAxis.append('line').attr('class', 'axis-line')
      .attr('x1', m.left).attr('x2', w - m.right)
      .attr('y1', y(0)).attr('y2', y(0));

    if (!small) {
      gAxis.append('text').attr('class', 'axis-title')
        .attr('x', (m.left + w - m.right) / 2).attr('y', h - 4)
        .attr('text-anchor', 'middle').text('hour of the day');
      gAxis.append('text').attr('class', 'axis-title')
        .attr('transform', 'translate(12,' + ((m.top + h - m.bottom) / 2) + ') rotate(-90)')
        .attr('text-anchor', 'middle').text('pickups in a half hour');
    }

    return { svg: root, x: x, y: y, w: w, h: h, m: m, layers: layers };
  }

  /** The forty single days behind the averages. */
  function drawDays(panel, opts) {
    var d = D();
    var g = panel.layers.days;
    var r = (opts && opts.r) || 1.6;
    var pts = [];
    for (var day = 0; day < d.nDays; day++) {
      for (var s = 0; s < d.nSlots; s++) {
        pts.push([d.slots[s], d.counts[day * d.nSlots + s]]);
      }
    }
    g.selectAll('circle').data(pts).enter().append('circle')
      .attr('class', 'dot-day')
      .attr('cx', function (p) { return panel.x(p[0]); })
      .attr('cy', function (p) { return panel.y(p[1]); })
      .attr('r', r);
    return pts.length;
  }

  /** The 37 averages, which are what every model here is fitted to. */
  function drawMeans(panel, opts) {
    var d = D();
    var r = (opts && opts.r) || 3.1;
    panel.layers.dots.selectAll('circle')
      .data(d.slots.map(function (s, i) { return [s, d.means[i]]; }))
      .enter().append('circle')
      .attr('class', 'dot-mean')
      .attr('cx', function (p) { return panel.x(p[0]); })
      .attr('cy', function (p) { return panel.y(p[1]); })
      .attr('r', r);
  }

  /** A curve given as pickups at data.curveHours. */
  function curvePath(panel, values) {
    var d = D();
    var line = d3.line()
      .x(function (v, i) { return panel.x(d.curveHours[i]); })
      .y(function (v) { return panel.y(v); });
    return line(values);
  }

  /* ================================================ the landscape panel */

  /**
   * A flat slice of the loss landscape, seen from above: filled bands, low
   * ground pale and high ground deep. Both axes are drawn at the same scale,
   * so a step of the same length looks the same length whichever way it goes.
   */
  function landscapePanel(host, run, opts) {
    opts = opts || {};
    var plot = opts.plotSize || 330;
    var m = opts.margin || { top: 8, right: 10, bottom: 26, left: 32 };
    var w = plot + m.left + m.right;
    var h = plot + m.top + m.bottom;

    var root = svg(host, w, h, 'land-panel');
    root.attr('aria-label', 'The loss landscape on a flat slice, seen from above');

    var ga = run.grid.a, gb = run.grid.b, gz = run.grid.z;
    var nx = ga.length, ny = gb.length;
    var x = d3.scaleLinear().domain([ga[0], ga[nx - 1]]).range([m.left, m.left + plot]);
    var y = d3.scaleLinear().domain([gb[0], gb[ny - 1]]).range([m.top + plot, m.top]);

    var gLand = root.append('g');
    var layers = {
      trail: root.append('g'),
      marks: root.append('g'),
      hopper: root.append('g'),
      top: root.append('g')
    };

    // The lowest band is the panel's own ground; every threshold above it is
    // painted on top, smallest region last.
    gLand.append('rect').attr('class', 'land-0')
      .attr('x', m.left).attr('y', m.top)
      .attr('width', plot).attr('height', plot);

    var flat = [];
    for (var i = 0; i < ny; i++) {
      for (var j = 0; j < nx; j++) flat.push(gz[i][j]);
    }
    var levels = run.grid.levels;
    var kx = plot / (nx - 1), ky = plot / (ny - 1);
    var tr = d3.geoTransform({
      point: function (px, py) {
        this.stream.point(m.left + px * kx, m.top + plot - py * ky);
      }
    });
    var geo = d3.geoPath(tr);
    var bands = d3.contours().size([nx, ny]).thresholds(levels)(flat);
    bands.forEach(function (band, k) {
      gLand.append('path')
        .attr('class', 'land-' + Math.min(15, k + 1))
        .attr('d', geo(band));
      gLand.append('path')
        .attr('class', 'land-edge')
        .attr('d', geo(band));
    });

    // the frame, and the two axes, which are directions and carry no units
    root.append('rect').attr('class', 'panel-frame')
      .attr('x', m.left).attr('y', m.top)
      .attr('width', plot).attr('height', plot);

    var share = run.varShare;
    root.append('text').attr('class', 'axis-title')
      .attr('x', m.left + plot / 2).attr('y', h - 8)
      .attr('text-anchor', 'middle')
      .text('direction 1, ' + Math.round(share[0] * 100) + ' percent of the path');
    root.append('text').attr('class', 'axis-title')
      .attr('transform', 'translate(12,' + (m.top + plot / 2) + ') rotate(-90)')
      .attr('text-anchor', 'middle')
      .text('direction 2, ' + Math.round(share[1] * 100) + ' percent');

    return { svg: root, x: x, y: y, w: w, h: h, m: m, plot: plot, layers: layers };
  }

  /** The low to high key for the landscape, as a row of blocks. */
  function landscapeKey(host, run, opts) {
    opts = opts || {};
    var w = opts.width || 330, h = opts.height || 22;
    var root = svg(host, w, h, 'land-key');
    // One block per fill the map actually uses: the land-0 ground plus one
    // band per contour level. A sixteenth block would promise a shade of
    // ground that is nowhere on the map.
    var n = Math.min(16, (run.grid.levels ? run.grid.levels.length : 14) + 1);
    var bar = Math.round(w * 0.42);
    var bw = bar / n;
    var x0 = (w - bar) / 2;
    for (var k = 0; k < n; k++) {
      root.append('rect').attr('class', 'land-' + k)
        .attr('x', x0 + k * bw).attr('y', 3)
        .attr('width', bw + 0.5).attr('height', 9);
    }
    root.append('rect').attr('class', 'panel-frame')
      .attr('x', x0).attr('y', 3).attr('width', bar).attr('height', 9);
    root.append('text').attr('class', 'note-text')
      .attr('x', x0 - 6).attr('y', 11).attr('text-anchor', 'end')
      .text('a good fit');
    root.append('text').attr('class', 'note-text')
      .attr('x', x0 + bar + 6).attr('y', 11).attr('text-anchor', 'start')
      .text('a bad one');
    return root;
  }

  return {
    svg: svg,
    round: round,
    commas: commas,
    stepLabel: stepLabel,
    dayPanel: dayPanel,
    drawDays: drawDays,
    drawMeans: drawMeans,
    curvePath: curvePath,
    landscapePanel: landscapePanel,
    landscapeKey: landscapeKey
  };
})();
