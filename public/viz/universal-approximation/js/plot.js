/* Shared chart plumbing, so every scene draws in the same language.
 *
 * Two rules this module exists to enforce.
 *
 * 1. NO COLOUR IS WRITTEN HERE. Every mark gets a class out of css/style.css:
 *    .series-model for a sum, .series-piece for one ramp or one bump,
 *    .series-beyond for anything outside the sampled hours, .series-target for
 *    the average day, .mark-data for the counts. verify.sh greps this file for
 *    hex values and fails if one appears.
 *
 * 2. THE SVG IS SIZED IN REAL PIXELS, never left to a flex parent. An <svg>
 *    inside a flex column with the default `align-items: stretch` renders
 *    correctly in the browser and captures as a squashed slice under headless
 *    Chrome, which is the kind of bug that costs a day.
 *
 * Globals used: d3. */

window.Plot = (function () {

  let seq = 0;

  /* Mount a chart into `host`. `build(ctx)` draws it and may return an object
   * with an `update` function; the returned handle exposes `.update()`, which
   * a scene calls on every interaction. On resize and on a theme change the
   * chart is rebuilt from scratch and a fresh `update` replaces the old one,
   * so no scene ever holds a stale closure. */
  function mount(host, build, opts) {
    opts = opts || {};
    const margin = Object.assign({ top: 16, right: 20, bottom: 40, left: 58 }, opts.margin);

    const svg = d3.select(host).append('svg').attr('role', 'img');
    const clipId = 'plot-clip-' + (++seq);
    let state = null;

    function draw() {
      const rect = host.getBoundingClientRect();
      const w = Math.max(200, Math.round(rect.width));
      const h = Math.max(140, Math.round(rect.height));

      svg.selectAll('*').remove();
      svg.attr('width', w).attr('height', h).attr('viewBox', '0 0 ' + w + ' ' + h)
        .style('width', w + 'px').style('height', h + 'px');

      const iw = Math.max(60, w - margin.left - margin.right);
      const ih = Math.max(60, h - margin.top - margin.bottom);

      svg.append('defs').append('clipPath').attr('id', clipId)
        .append('rect').attr('x', -2).attr('y', -margin.top)
        .attr('width', iw + 4).attr('height', ih + margin.top + 2);

      const g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      state = build({ svg: svg, g: g, w: iw, h: ih, clip: 'url(#' + clipId + ')' }) || {};
      if (state.update) state.update();
    }

    draw();

    let frame = null;
    function schedule() {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () { frame = null; draw(); });
    }

    let observer = null;
    if (window.ResizeObserver) {
      observer = new ResizeObserver(schedule);
      observer.observe(host);
    } else {
      window.addEventListener('resize', schedule);
    }
    window.addEventListener('theme-change', schedule);

    return {
      update: function () { if (state && state.update) state.update(); },
      redraw: draw,
      destroy: function () { if (observer) observer.disconnect(); },
    };
  }

  /* =========================================================== axes */

  const HOUR_TICKS = [5, 8, 11, 14, 17, 20, 23];

  /** Axes, grid and labels. `xTicks` defaults to the sampled hours. */
  function axes(g, o) {
    const x = o.x, y = o.y, w = o.w, h = o.h;
    const xTicks = o.xTicks || HOUR_TICKS;
    const yTicks = y.ticks(o.yTickCount || 5);

    const grid = g.append('g').attr('class', 'grid');
    yTicks.forEach(function (v) {
      grid.append('line').attr('x1', 0).attr('x2', w).attr('y1', y(v)).attr('y2', y(v));
    });

    const ax = g.append('g').attr('class', 'axis');
    ax.append('line').attr('x1', 0).attr('x2', w).attr('y1', h).attr('y2', h);
    xTicks.forEach(function (v) {
      if (v < x.domain()[0] - 1e-9 || v > x.domain()[1] + 1e-9) return;
      ax.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', h).attr('y2', h + 5);
      ax.append('text').attr('x', x(v)).attr('y', h + 20).attr('text-anchor', 'middle')
        .text(o.xFormat ? o.xFormat(v) : ReLU.clock(v));
    });
    yTicks.forEach(function (v) {
      ax.append('text').attr('x', -10).attr('y', y(v) + 4).attr('text-anchor', 'end')
        .text(o.yFormat ? o.yFormat(v) : v);
    });

    if (o.xLabel) {
      g.append('text').attr('class', 'axis-label')
        .attr('x', w / 2).attr('y', h + 38).attr('text-anchor', 'middle').text(o.xLabel);
    }
    if (o.yLabel) {
      g.append('text').attr('class', 'axis-label')
        .attr('transform', 'translate(' + (-(o.yLabelOffset || 44)) + ',' + (h / 2) + ') rotate(-90)')
        .attr('text-anchor', 'middle').text(o.yLabel);
    }
    if (y.domain()[0] < 0) {
      g.append('line').attr('class', 'zero-line')
        .attr('x1', 0).attr('x2', w).attr('y1', y(0)).attr('y2', y(0));
    }
    return g;
  }

  /** A d3 line generator over [[hour, value], ...] pairs. */
  function liner(x, y) {
    return d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
  }

  /** The measured counts, one small disc each. Drawn once and never updated. */
  function counts(g, o) {
    const layer = g.append('g').attr('clip-path', o.clip);
    const slots = o.slotHours.length;
    for (let i = 0; i < o.counts.length; i++) {
      layer.append('circle').attr('class', 'mark-data')
        .attr('cx', o.x(o.slotHours[i % slots]))
        .attr('cy', o.y(o.counts[i]))
        .attr('r', o.r || 2.1);
    }
    return layer;
  }

  /** A shaded vertical band, e.g. the hours the data actually covers. */
  function band(g, o) {
    return g.append('rect').attr('class', o.cls || 'band-sampled')
      .attr('x', o.x(o.from)).attr('y', -o.top || 0)
      .attr('width', Math.max(0, o.x(o.to) - o.x(o.from)))
      .attr('height', o.h + (o.top || 0));
  }

  /** A label that sits at the end of its own line, so the line needs no legend. */
  function endLabel(g, o) {
    return g.append('text').attr('class', 'series-label ' + (o.cls || 'fill-model'))
      .attr('x', o.px).attr('y', o.py)
      .attr('text-anchor', o.anchor || 'start')
      .attr('clip-path', o.clip || null)
      .text(o.text);
  }

  /* ======================================================= drag handles */

  /* A handle is a white disc with an ink ring: it reads as "grab me" without
   * spending a colour on it, and it stays legible in both themes. The hit area
   * is a bigger invisible circle, because a 7px target is not draggable on a
   * lectern trackpad. */
  function handle(g, o) {
    const node = g.append('g').attr('class', 'handle-group');
    const hit = node.append('circle').attr('class', 'handle-hit').attr('r', o.hit || 17);
    const disc = node.append('circle').attr('class', 'handle').attr('r', o.r || 7);
    let label = null;
    if (o.label != null) {
      label = node.append('text').attr('class', 'handle-label')
        .attr('x', o.labelDx == null ? 12 : o.labelDx)
        .attr('y', o.labelDy == null ? -11 : o.labelDy)
        .attr('text-anchor', o.labelAnchor || 'start')
        .text(o.label);
    }

    node.move = function (px, py) {
      node.attr('transform', 'translate(' + px + ',' + py + ')');
      return node;
    };
    node.setLabel = function (text) { if (label) label.text(text); return node; };

    const drag = d3.drag()
      .on('start', function () { disc.classed('dragging', true); })
      .on('drag', function (event) {
        const p = d3.pointer(event, g.node());
        o.onDrag(p[0], p[1], event);
      })
      .on('end', function () {
        disc.classed('dragging', false);
        if (o.onEnd) o.onEnd();
      });
    node.call(drag);
    hit.on('mousedown', function (event) { event.preventDefault(); });
    return node;
  }

  return { mount, axes, liner, counts, band, endLabel, handle, HOUR_TICKS };

})();
