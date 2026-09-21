/* Scene 0. The shape nobody can write down.
 *
 * Its job is to put the target on the screen before any machinery appears, and
 * to make one point about it: the cloud is not noise around a formula anybody
 * knows. It is a shape. The rest of the page is about drawing a shape out of
 * straight pieces.
 *
 * The 08:00 marker is here because the floor under every later error readout
 * comes from it: the same slot ranges over eighty pickups across the forty
 * days, so no curve of the hour alone can do better than that scatter allows.
 *
 * Interaction: none. This is the card the lecturer talks over.
 *
 * Globals used: d3, Plot, UI, ReLU, DATA. */

window.scenes.scene0 = function (root) {
  const D = window.DATA;
  const LOG = D.log;
  const SLOTS = LOG.slotHours.length;

  // The spread of one slot, computed here rather than typed in.
  const PROBE = 8.0;
  const probeIndex = LOG.slotHours.indexOf(PROBE);
  let probeLo = Infinity, probeHi = -Infinity;
  for (let i = probeIndex; i < LOG.pickups.length; i += SLOTS) {
    probeLo = Math.min(probeLo, LOG.pickups[i]);
    probeHi = Math.max(probeHi, LOG.pickups[i]);
  }

  const layout = UI.el('div.scene-layout');
  const vizWrap = UI.el('div.viz-wrap');
  layout.appendChild(UI.el('div.viz-col', vizWrap, UI.syntheticStamp()));

  const textCol = UI.el('div.text-col.s0-text');
  textCol.appendChild(UI.el('div.eyebrow', 'Foundations of AI  ·  neural networks'));
  textCol.appendChild(UI.el('h1.s0-title', 'Ramps, bumps, anything.'));
  textCol.appendChild(UI.el('p.s0-hook',
    'One bike dock, forty days. Somebody has to say how many bikes it should '
    + 'hold at each hour of tomorrow.'));
  textCol.appendChild(UI.el('p',
    'There is the answer, and it has no name. Not a straight line, not a bell '
    + 'curve, not anything you could write a formula for. A shape.'));
  textCol.appendChild(UI.el('p',
    'A neural network draws that shape without anyone saying what it is. Five '
    + 'scenes, in the order the pieces go together.'));

  const strip = UI.el('div.stat-strip',
    UI.stat(D.meta.counts.toLocaleString('en-US'), 'counts in the log'),
    UI.stat(probeLo + ' to ' + probeHi, 'the same 08:00 slot'),
    UI.stat(D.floors.allDays.toFixed(0), 'floor under any forecast'));
  textCol.appendChild(strip);
  textCol.appendChild(UI.el('p.small.muted',
    'Forty different Tuesdays are not one Tuesday, so a miss of about '
    + Math.round(D.floors.allDays) + ' pickups is the best any curve of the hour '
    + 'can do here.'));
  layout.appendChild(textCol);
  root.appendChild(layout);

  Plot.mount(vizWrap, function (ctx) {
    const x = d3.scaleLinear([D.meta.openingHour, D.meta.closingHour], [0, ctx.w]);
    const y = d3.scaleLinear([0, 300], [ctx.h, 0]);

    Plot.axes(ctx.g, { x: x, y: y, w: ctx.w, h: ctx.h,
      xLabel: 'hour of the day', yLabel: 'bike pickups per half hour' });

    Plot.counts(ctx.g, { x: x, y: y, clip: ctx.clip,
      slotHours: LOG.slotHours, counts: LOG.pickups });

    // The spread of the 08:00 slot, drawn as the bracket the caption talks about.
    const probe = ctx.g.append('g').attr('clip-path', ctx.clip);
    probe.append('line').attr('class', 'handle-guide')
      .attr('x1', x(PROBE)).attr('x2', x(PROBE))
      .attr('y1', y(probeLo)).attr('y2', y(probeHi)).attr('stroke-width', 1.5);
    [probeLo, probeHi].forEach(function (v) {
      probe.append('line').attr('class', 'handle-guide')
        .attr('x1', x(PROBE) - 7).attr('x2', x(PROBE) + 7)
        .attr('y1', y(v)).attr('y2', y(v)).attr('stroke-width', 1.5);
    });
    probe.append('text').attr('class', 'note-label')
      .attr('x', x(PROBE) + 12).attr('y', y(probeHi) - 8)
      .text('one slot, forty days');

    const line = Plot.liner(x, y);
    const average = D.average.hours.map(function (h, i) { return [h, D.average.values[i]]; });
    ctx.g.append('path').attr('class', 'series-target').attr('clip-path', ctx.clip)
      .attr('stroke-width', 2).attr('d', line(average));

    const LABEL_AT = 13.6;
    const step = D.average.hours[1] - D.average.hours[0];
    const labelValue = D.average.values[Math.round((LABEL_AT - D.average.hours[0]) / step)];
    Plot.endLabel(ctx.g, { px: x(LABEL_AT), py: y(labelValue) - 14, anchor: 'middle',
      cls: 'fill-muted', text: 'the average day' });
  }, { margin: { top: 18, right: 26, bottom: 44, left: 62 } });

  return {};
};
