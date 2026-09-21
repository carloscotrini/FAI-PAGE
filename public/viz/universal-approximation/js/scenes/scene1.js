/* Scene 1. One neuron is a ramp, and a ramp cannot come back down.
 *
 * The two knobs of a ReLU neuron are on the chart itself rather than in a
 * slider box: the kink is dragged along the bottom, the line is grabbed and
 * tilted. That is the whole of Part 1 of the notebook, and the failure at the
 * end of the day is the reason the next scene exists.
 *
 * Interaction: direct, single state. No step engine.
 *
 * Globals used: d3, Plot, UI, ReLU, DATA. */

window.scenes.scene1 = function (root) {
  const D = window.DATA;
  const LOG = D.log;
  const OPEN = D.meta.openingHour, CLOSE = D.meta.closingHour;
  const SLOTS = LOG.slotHours.length;

  const Y_TOP = 300, Y_BOTTOM = -20;
  const MIN_SLOPE = 0, MAX_SLOPE = 260;

  const state = { start: D.oneNeuron.start, slope: D.oneNeuron.slope };
  const test = UI.testMode();
  if (test === 'tilted') { state.start = 9.4; state.slope = 215; }
  if (test === 'flat') { state.start = 12.0; state.slope = 18; }

  // The counts of the morning window, the only ones this scene scores against.
  const morning = [];
  for (let i = 0; i < LOG.pickups.length; i++) {
    const h = LOG.slotHours[i % SLOTS];
    if (h <= 8.0) morning.push([h, LOG.pickups[i]]);
  }

  function value(h) { return ReLU.ramp(h, state.start, state.slope); }

  function morningMiss() {
    let total = 0;
    for (let i = 0; i < morning.length; i++) {
      const d = morning[i][1] - value(morning[i][0]);
      total += d * d;
    }
    return Math.sqrt(total / morning.length);
  }

  /* =============================================================== chrome */

  const layout = UI.el('div.scene-layout');
  const vizWrap = UI.el('div.viz-wrap');
  layout.appendChild(UI.el('div.viz-col', vizWrap, UI.syntheticStamp()));

  const textCol = UI.el('div.text-col');
  textCol.appendChild(UI.head('Part one · one neuron', 'A neuron is a ramp.'));
  textCol.appendChild(UI.el('p',
    'A neuron takes the hour, multiplies it by a weight, adds a bias, and keeps '
    + 'the answer only if it is positive. Read as a picture, that is a ramp: '
    + 'flat at zero until one hour, then a straight line for ever.'));
  textCol.appendChild(UI.el('p.s1-knobs',
    'Two knobs, and no others. Where it starts, and how steeply it climbs.'));

  const missStat = UI.stat('', 'typical miss, 05:00 to 08:00', 'on-model');
  const at15Stat = UI.stat('', 'it says at 15:00', 'on-beyond');
  const at23Stat = UI.stat('', 'it says at 23:00', 'on-beyond');
  textCol.appendChild(UI.el('div.stat-strip', missStat, at15Stat));
  textCol.appendChild(UI.el('div.stat-strip', at23Stat));

  const verdict = UI.el('p.small.muted');
  textCol.appendChild(verdict);

  textCol.appendChild(UI.note('the knobs',
    UI.el('p.small',
      'Drag the disc on the axis to move the start. Grab the line to tilt it.')));

  layout.appendChild(textCol);
  root.appendChild(layout);

  /* =============================================================== chart */

  const chart = Plot.mount(vizWrap, function (ctx) {
    const x = d3.scaleLinear([OPEN, CLOSE], [0, ctx.w]);
    const y = d3.scaleLinear([Y_BOTTOM, Y_TOP], [ctx.h, 0]);
    const line = Plot.liner(x, y);

    Plot.axes(ctx.g, { x: x, y: y, w: ctx.w, h: ctx.h,
      xLabel: 'hour of the day', yLabel: 'bike pickups per half hour' });
    Plot.counts(ctx.g, { x: x, y: y, clip: ctx.clip,
      slotHours: LOG.slotHours, counts: LOG.pickups });

    const average = D.average.hours.map(function (h, i) { return [h, D.average.values[i]]; });
    ctx.g.append('path').attr('class', 'series-target').attr('clip-path', ctx.clip)
      .attr('stroke-width', 2).attr('d', line(average));

    const ramp = ctx.g.append('path').attr('class', 'series-model')
      .attr('clip-path', ctx.clip).attr('stroke-width', 3);
    const exitLabel = ctx.g.append('text').attr('class', 'series-label fill-model')
      .attr('text-anchor', 'start');

    function clampStart(h) { return Math.max(OPEN, Math.min(CLOSE - 0.5, h)); }

    const kink = Plot.handle(ctx.g, {
      label: '', labelDy: 22, labelDx: 0, labelAnchor: 'middle',
      onDrag: function (px) {
        state.start = clampStart(x.invert(px));
        refresh();
      },
    });

    const tilt = Plot.handle(ctx.g, {
      label: '', labelDx: 13, labelDy: -12,
      onDrag: function (px, py) {
        const h = x.invert(px);
        const v = y.invert(py);
        if (h > state.start + 0.25) {
          state.slope = Math.max(MIN_SLOPE, Math.min(MAX_SLOPE, v / (h - state.start)));
        }
        refresh();
      },
    });

    function update() {
      ramp.attr('d', line(ReLU.sample(value, OPEN, CLOSE, 0.05)));

      kink.move(x(state.start), y(0));
      kink.setLabel(ReLU.clock(state.start));

      // The tilt handle sits on the line, two hours past the kink, or wherever
      // the line leaves the top of the panel if that comes first.
      const exitHour = state.slope > 0
        ? state.start + (Y_TOP - 6) / state.slope : CLOSE;
      const handleHour = Math.min(state.start + 2, exitHour, CLOSE - 0.3);
      tilt.move(x(handleHour), y(value(handleHour)));
      tilt.setLabel(Math.round(state.slope) + ' an hour');

      if (exitHour < CLOSE) {
        exitLabel.attr('x', Math.min(ctx.w - 150, x(exitHour) + 10)).attr('y', 18)
          .text('off the top, ' + ReLU.commas(value(CLOSE)) + ' by 23:00');
      } else {
        exitLabel.text('');
      }
    }

    return { update: update };
  }, { margin: { top: 22, right: 26, bottom: 44, left: 62 } });

  /* ============================================================== refresh */

  function refresh() {
    chart.update();
    const miss = morningMiss();
    missStat.set(miss.toFixed(1));
    at15Stat.set(ReLU.commas(value(15)));
    at23Stat.set(ReLU.commas(value(23)));

    const runaway = value(23) > 400;
    verdict.textContent = runaway
      ? 'The average day at 15:00 is ' + Math.round(D.oneNeuron.trueAt15) + ' pickups, '
        + 'and at 23:00 it is back near ' + Math.round(D.average.values[D.average.values.length - 1])
        + '. One ramp starts once and then climbs for ever. Send the vans out on '
        + 'that forecast and there are not enough bikes in the city by dinner.'
      : 'Flat, then a straight line. There is nothing else a single neuron can '
        + 'do, and nothing in it that ever bends back down.';
  }

  refresh();

  return { onEnter: refresh };
};
