/* Scene 2. Three ramps make a bump.
 *
 * The hinge of the whole story. One ramp can only climb; three of them make a
 * window of demand that starts, peaks, ends, and then leaves the rest of the
 * day at EXACTLY zero. Not nearly zero: the three slopes cancel, and the
 * readout on the right says so on every drag.
 *
 * Interaction: an internal step engine, three steps, with the handles live at
 * every step. Right arrow adds the next ramp, left arrow takes it away, and
 * the engine only hands the keystroke back to the driver at the ends.
 *
 * The handles carry the four numbers of the notebook's Exercise 2:
 *   handle 1 on the axis   the hour the bump lifts off zero
 *   handle 2 at the apex   the hour of the peak, and its height
 *   handle 3 on the axis   the hour it is back to zero
 * The three slopes follow from those, which is why the reader never has to
 * work one out.
 *
 * Globals used: d3, Plot, UI, ReLU, DATA. */

window.scenes.scene2 = function (root) {
  const D = window.DATA;
  const LOG = D.log;
  const OPEN = D.meta.openingHour, CLOSE = D.meta.closingHour;

  const Y_TOP = 320, Y_BOTTOM = -260;
  const GAP = 0.25;                      // the smallest gap between two kinks
  const STEPS = 3;

  const state = {
    start: D.oneBump.start, peak: D.oneBump.peak,
    end: D.oneBump.end, height: D.oneBump.height,
  };
  let cursor = 0;

  const test = UI.testMode();
  if (test === 'two') cursor = 1;
  if (test === 'bump' || UI.flag('run')) cursor = 2;
  if (test === 'wide') { cursor = 2; state.start = 6.0; state.end = 13.0; state.height = 120; }

  function up() { return state.height / (state.peak - state.start); }
  function down() { return state.height / (state.end - state.peak); }

  /** The sum of however many ramps are switched on right now. */
  function value(h) {
    let total = ReLU.ramp(h, state.start, up());
    if (cursor >= 1) total -= ReLU.ramp(h, state.peak, up() + down());
    if (cursor >= 2) total += ReLU.ramp(h, state.end, down());
    return total;
  }

  /** The value furthest from zero that the sum takes anywhere outside the
   *  bump's own hours, WITH its sign. The sign matters: at two ramps the sum
   *  is far BELOW zero out there, and a readout that printed the magnitude
   *  would say 1,197 beside a chart labelled minus 1,197. */
  function outsideExtreme() {
    let worst = 0;
    for (let h = OPEN; h <= CLOSE + 1e-9; h += 0.01) {
      if (h >= state.start - 1e-9 && h <= state.end + 1e-9) continue;
      const v = value(h);
      if (Math.abs(v) > Math.abs(worst)) worst = v;
    }
    return worst;
  }

  /* ===================================================================== chrome */

  const layout = UI.el('div.scene-layout');
  const vizWrap = UI.el('div.viz-wrap');
  layout.appendChild(UI.el('div.viz-col', vizWrap, UI.syntheticStamp()));

  const textCol = UI.el('div.text-col');
  textCol.appendChild(UI.head('Part two · three ramps', 'Three ramps make a bump.'));

  const story = UI.el('p');
  textCol.appendChild(story);

  const slopeTable = UI.el('table.data-table.s2-slopes');
  textCol.appendChild(slopeTable);

  const peakStat = UI.stat('', 'peak of the sum', 'on-model');
  // Short on purpose: a longer label pushes this stat onto a second row and
  // the column then overflows the fold at 1280x720.
  const outsideStat = UI.stat('', 'the sum outside it', 'on-model');
  textCol.appendChild(UI.el('div.stat-strip', peakStat, outsideStat));

  const closing = UI.el('p.small.muted');
  textCol.appendChild(closing);

  textCol.appendChild(UI.note('the handles',
    UI.el('p.small',
      'The two discs on the axis set the start and the end. The one at the top '
      + 'sets the peak and its height.')));

  layout.appendChild(textCol);
  root.appendChild(layout);

  /* ====================================================================== chart */

  const chart = Plot.mount(vizWrap, function (ctx) {
    const x = d3.scaleLinear([OPEN, CLOSE], [0, ctx.w]);
    const y = d3.scaleLinear([Y_BOTTOM, Y_TOP], [ctx.h, 0]);
    const line = Plot.liner(x, y);

    Plot.axes(ctx.g, { x: x, y: y, w: ctx.w, h: ctx.h, yTickCount: 6,
      xLabel: 'hour of the day', yLabel: 'bike pickups per half hour' });
    Plot.counts(ctx.g, { x: x, y: y, clip: ctx.clip,
      slotHours: LOG.slotHours, counts: LOG.pickups, r: 1.8 });

    const pieces = [0, 1, 2].map(function () {
      return ctx.g.append('path').attr('class', 'series-piece')
        .attr('clip-path', ctx.clip).attr('stroke-width', 1.6).attr('opacity', 0.85);
    });
    const tags = [0, 1, 2].map(function () {
      return ctx.g.append('text').attr('class', 'series-label fill-piece')
        .attr('clip-path', ctx.clip);
    });
    const sum = ctx.g.append('path').attr('class', 'series-model')
      .attr('clip-path', ctx.clip).attr('stroke-width', 3.2);
    const sumTag = ctx.g.append('text').attr('class', 'series-label fill-model')
      .attr('clip-path', ctx.clip);

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    const h1 = Plot.handle(ctx.g, { label: '', labelDy: 22, labelDx: 0,
      labelAnchor: 'middle',
      onDrag: function (px) {
        state.start = clamp(x.invert(px), OPEN, state.peak - GAP);
        refresh();
      } });
    const h2 = Plot.handle(ctx.g, { label: '', labelDy: -16, labelDx: 0,
      labelAnchor: 'middle',
      onDrag: function (px, py) {
        state.peak = clamp(x.invert(px), state.start + GAP, state.end - GAP);
        state.height = clamp(y.invert(py), 10, Y_TOP - 20);
        refresh();
      } });
    const h3 = Plot.handle(ctx.g, { label: '', labelDy: 22, labelDx: 0,
      labelAnchor: 'middle',
      onDrag: function (px) {
        state.end = clamp(x.invert(px), state.peak + GAP, CLOSE);
        refresh();
      } });

    /* Where a ramp leaves the panel, which is where its label goes: the ramps
     * run off the chart within a couple of hours and their sum does not, and
     * that contrast is the picture this scene is making. */
    function exitPoint(kink, slope) {
      if (slope === 0) return null;
      const edge = slope > 0 ? Y_TOP : Y_BOTTOM;
      const hour = kink + edge / slope;
      if (hour > CLOSE) return [CLOSE, slope * (CLOSE - kink)];
      return [hour, edge];
    }

    function drawPiece(index, kink, slope, label) {
      // At the first step the sum IS ramp 1, so drawing the piece under it
      // would put two labels and two lines in the same place.
      const on = index <= cursor && cursor > 0;
      pieces[index].attr('d', on
        ? line(ReLU.sample(function (h) { return ReLU.ramp(h, kink, slope); },
                           OPEN, CLOSE, 0.05))
        : null);
      const spot = on ? exitPoint(kink, slope) : null;
      if (spot) {
        const px = clamp(x(spot[0]), 4, ctx.w - 74);
        const py = clamp(y(spot[1]), 16, ctx.h - 8);
        tags[index].attr('x', px + 6).attr('y', spot[1] > 0 ? py + 14 : py - 6)
          .attr('text-anchor', 'start').text(label);
      } else {
        tags[index].text('');
      }
    }

    function update() {
      drawPiece(0, state.start, up(), 'ramp 1');
      drawPiece(1, state.peak, -(up() + down()), 'ramp 2');
      drawPiece(2, state.end, down(), 'ramp 3');

      sum.attr('d', line(ReLU.sample(value, OPEN, CLOSE, 0.02)));
      const tail = value(CLOSE);
      if (cursor === 2) {
        sumTag.attr('x', x(Math.min(CLOSE - 0.2, state.end + 0.4)))
          .attr('y', y(0) - 10).attr('text-anchor', 'start').text('their sum: flat zero');
      } else if (cursor === 1) {
        sumTag.attr('x', ctx.w - 6).attr('y', ctx.h - 10).attr('text-anchor', 'end')
          .text('two ramps, still falling: ' + ReLU.commas(tail) + ' by 23:00');
      } else {
        sumTag.attr('x', ctx.w - 6).attr('y', 20).attr('text-anchor', 'end')
          .text('one ramp, still climbing: ' + ReLU.commas(tail) + ' by 23:00');
      }

      h1.move(x(state.start), y(0)).setLabel(ReLU.clock(state.start));
      h2.move(x(state.peak), y(state.height))
        .setLabel(ReLU.clock(state.peak) + ', ' + ReLU.pickups(state.height));
      h3.move(x(state.end), y(0)).setLabel(ReLU.clock(state.end));
      h3.attr('opacity', cursor >= 2 ? 1 : 0.35);
    }

    return { update: update };
  }, { margin: { top: 24, right: 26, bottom: 44, left: 62 } });

  /* ==================================================================== refresh */

  const STORY = [
    'One ramp lifts off at the first handle and climbs. On its own it is the '
    + 'neuron of the last scene: it never comes back down.',
    'A second, steeper ramp starts at the peak. Its slope is the first slope '
    + 'plus the fall you want, so the sum turns over and heads down. And it '
    + 'keeps going down, straight through zero.',
    'A third ramp at the end cancels what is left of the fall. Up, down, flat: '
    + 'a window of demand that starts, peaks, and ends, and leaves the whole '
    + 'rest of the day untouched.',
  ];

  function slopeRows() {
    const rows = [
      ['ramp 1, from ' + ReLU.clock(state.start), up()],
      ['ramp 2, from ' + ReLU.clock(state.peak), -(up() + down())],
      ['ramp 3, from ' + ReLU.clock(state.end), down()],
    ].slice(0, cursor + 1);
    let total = 0;
    rows.forEach(function (r) { total += r[1]; });

    slopeTable.innerHTML = '';
    const head = UI.el('tr', UI.el('th', 'ramp'), UI.el('th.num', 'pickups an hour'));
    slopeTable.appendChild(head);
    rows.forEach(function (r) {
      slopeTable.appendChild(UI.el('tr', UI.el('td', r[0]),
        UI.el('td.num', (r[1] > 0 ? '+' : '') + ReLU.commas(r[1]))));
    });
    // Rounding decides whether a cancelled total is +0.0000000000001 or
    // -0.0000000000001, and a sign that flickers on a projector reads as a bug.
    const signed = Math.abs(total) < 1e-9 ? '0' : (total > 0 ? '+' : '') + ReLU.commas(total);
    slopeTable.appendChild(UI.el('tr.is-current',
      UI.el('td', cursor === 2 ? 'they add up to' : 'so far they add up to'),
      UI.el('td.num', signed)));
  }

  function refresh() {
    chart.update();
    slopeRows();
    story.textContent = STORY[cursor];

    const peakValue = value(state.peak);
    peakStat.set(ReLU.commas(peakValue) + ' at ' + ReLU.clock(state.peak));
    const worst = outsideExtreme();
    outsideStat.set(Math.abs(worst) < 1e-9 ? '0' : ReLU.commas(worst));

    closing.textContent = cursor === 2
      ? 'Zero outside the window at every setting of the handles. The slopes do '
        + 'not nearly cancel, they cancel, and that is what makes a bump a piece '
        + 'you can place anywhere and add to anything.'
      : 'Watch the last row of the table. While the slopes still add up to '
        + 'something, the sum is still going somewhere.';
  }

  function setCursor(next) {
    if (next < 0 || next >= STEPS) return false;
    cursor = next;
    refresh();
    return true;
  }

  refresh();

  return {
    onEnter: refresh,
    onNextKey: function () { return setCursor(cursor + 1); },
    onPrevKey: function () { return setCursor(cursor - 1); },
  };
};
