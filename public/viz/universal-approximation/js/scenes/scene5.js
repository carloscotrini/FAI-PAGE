/* Scene 5. Letting the machine place the ramps.
 *
 * Same picture as scene 3, with nobody choosing the numbers. The slider walks
 * the six trained networks, each drawn as the sum of its own ramps, with those
 * ramps faint underneath on a strip of their own.
 *
 * The strip needs its own scale and the caption says why: the machine's pieces
 * are nothing like the tidy local bumps a person places. They are huge, they
 * run off in both directions, and they cancel to within a few pickups. Same
 * curve, same kind of arithmetic, completely different pieces. That is worth a
 * sentence out loud in the lecture.
 *
 * Every number here is trained in precompute/build_data.py on days 1 to 30 and
 * scored on days 31 to 40, with the notebook's own recipe. Nothing is fitted in
 * the browser, and nothing about the training itself is shown: this page is
 * about the shape. The optimiser is the other visualization's subject.
 *
 * Interaction: one slider, six stops.
 *
 * Globals used: d3, Plot, UI, ReLU, DATA. */

window.scenes.scene5 = function (root) {
  const D = window.DATA;
  const LOG = D.log;
  const NETS = D.nets;
  const OPEN = D.meta.openingHour, CLOSE = D.meta.closingHour;

  const Y_TOP = 300, Y_BOTTOM = -20;

  let idx = NETS.findIndex(function (n) { return n.width === 1; });
  if (idx < 0) idx = 0;
  const test = UI.testMode();
  if (test === 'elbow' || UI.flag('run')) {
    idx = NETS.findIndex(function (n) { return n.width === D.elbow; });
  }
  if (test === 'widest') idx = NETS.length - 1;
  if (test === 'eight') idx = NETS.findIndex(function (n) { return n.width === 8; });

  function net() { return NETS[idx]; }
  function value(h) { return ReLU.netValue(net(), h); }

  /* ===================================================================== chrome */

  const layout = UI.el('div.scene-layout');
  const vizWrap = UI.el('div.viz-wrap');
  const stripWrap = UI.el('div.viz-wrap.s5-strip');

  const widthSlider = UI.slider('neurons', {
    min: 0, max: NETS.length - 1, step: 1, value: idx, width: 190,
    format: function (v) { return String(NETS[v].width); },
    onInput: function (v) { idx = v; refresh(); },
  });
  const stripCaption = UI.el('span.small.muted.s5-caption', '');
  layout.appendChild(UI.el('div.viz-col', vizWrap, stripWrap,
    UI.el('div.controls-row.s5-controls', widthSlider, stripCaption),
    UI.syntheticStamp()));

  const textCol = UI.el('div.text-col');
  textCol.appendChild(UI.head('part three · the machine',
    'The machine places them.'));
  textCol.appendChild(UI.el('p',
    'Nineteen numbers by eye worked for one dock. A city has hundreds. So the '
    + 'machine turns the knobs: same ramps, same sum, the positions and the '
    + 'slopes found by training rather than by looking.'));

  const errStat = UI.stat('', 'miss on the 10 days it never saw', 'on-model');
  const cornerStat = UI.stat('', 'corners inside the day');
  textCol.appendChild(UI.el('div.stat-strip', errStat, cornerStat));

  const table = UI.el('table.data-table.s5-table');
  textCol.appendChild(table);

  const closing = UI.el('p.small.muted');
  textCol.appendChild(closing);
  layout.appendChild(textCol);
  root.appendChild(layout);

  /* ================================================================ main chart */

  const chart = Plot.mount(vizWrap, function (ctx) {
    const x = d3.scaleLinear([OPEN, CLOSE], [0, ctx.w]);
    const y = d3.scaleLinear([Y_BOTTOM, Y_TOP], [ctx.h, 0]);
    const line = Plot.liner(x, y);

    Plot.axes(ctx.g, { x: x, y: y, w: ctx.w, h: ctx.h, xFormat: function (v) {
      return ReLU.clock(v).slice(0, 2); }, yLabel: 'pickups per half hour' });
    Plot.counts(ctx.g, { x: x, y: y, clip: ctx.clip,
      slotHours: LOG.slotHours, counts: LOG.pickups, r: 1.8 });

    const average = D.average.hours.map(function (h, i) { return [h, D.average.values[i]]; });
    ctx.g.append('path').attr('class', 'series-target').attr('clip-path', ctx.clip)
      .attr('stroke-width', 1.8).attr('d', line(average));

    const fit = ctx.g.append('path').attr('class', 'series-model')
      .attr('clip-path', ctx.clip).attr('stroke-width', 3);
    const corners = ctx.g.append('g').attr('clip-path', ctx.clip);
    const tag = ctx.g.append('text').attr('class', 'series-label fill-model')
      .attr('text-anchor', 'end');

    function update() {
      fit.attr('d', line(ReLU.sample(value, OPEN, CLOSE, 0.02)));
      corners.selectAll('*').remove();
      net().ramps.forEach(function (r) {
        if (r.kink <= OPEN || r.kink >= CLOSE) return;
        corners.append('circle').attr('class', 'fill-model')
          .attr('cx', x(r.kink)).attr('cy', y(value(r.kink))).attr('r', 3.2)
          .attr('opacity', 0.85);
      });
      tag.attr('x', ctx.w - 6).attr('y', 18)
        .text(net().width + (net().width === 1 ? ' neuron' : ' neurons'));
    }

    return { update: update };
  }, { margin: { top: 20, right: 26, bottom: 32, left: 58 } });

  /* =============================================================== ramp strip */

  const strip = Plot.mount(stripWrap, function (ctx) {
    const x = d3.scaleLinear([OPEN, CLOSE], [0, ctx.w]);
    let y = d3.scaleLinear([-1, 1], [ctx.h, 0]);
    const axisLayer = ctx.g.append('g');
    const pieceLayer = ctx.g.append('g').attr('clip-path', ctx.clip);
    const label = ctx.g.append('text').attr('class', 'note-label')
      .attr('text-anchor', 'start');
    let biggest = 1;

    function update() {
      // The pieces of a trained network are enormous and cancel. Scaling the
      // strip to the largest of them flattens every other one into the axis, so
      // it is scaled to keep the kinks visible and CLIPPED, with the real reach
      // of the biggest piece printed in the caption.
      let reach = 0;
      net().ramps.forEach(function (r) {
        [OPEN, CLOSE].forEach(function (h) {
          reach = Math.max(reach, Math.abs(ReLU.facingRamp(h, r.kink, r.amp, r.facing)));
        });
      });
      biggest = reach;
      // The floor of 100 is the scale, not the measurement: the one neuron of
      // the narrowest network kinks at 24:48 and so never switches on inside
      // the day, and a strip scaled to zero would have no axis at all.
      const rounded = Math.max(100, Math.min(Math.ceil(reach / 100) * 100, 600));
      y = d3.scaleLinear([-rounded, rounded], [ctx.h, 0]);
      const liner = Plot.liner(x, y);

      axisLayer.selectAll('*').remove();
      axisLayer.append('line').attr('class', 'zero-line')
        .attr('x1', 0).attr('x2', ctx.w).attr('y1', y(0)).attr('y2', y(0));
      [rounded, -rounded].forEach(function (v) {
        axisLayer.append('text').attr('class', 'axis-label')
          .attr('x', -8).attr('y', y(v) + (v > 0 ? 10 : -3)).attr('text-anchor', 'end')
          .text(ReLU.commas(v));
      });

      pieceLayer.selectAll('*').remove();
      net().ramps.forEach(function (r) {
        pieceLayer.append('path').attr('class', 'series-piece')
          .attr('stroke-width', 1.4).attr('opacity', 0.65)
          .attr('d', liner(ReLU.sample(function (h) {
            return ReLU.facingRamp(h, r.kink, r.amp, r.facing);
          }, OPEN, CLOSE, 0.05)));
      });
      const count = net().ramps.length;
      label.attr('x', 4).attr('y', 13)
        .text('the ' + count + (count === 1 ? ' piece, its own scale' : ' pieces, their own scale')
              + (reach > rounded ? ', clipped at ' + ReLU.commas(rounded) : ''));
      stripCaption.textContent = biggest < 0.5
        ? 'no piece switches on inside these hours, so the fit is the constant alone'
        : (count === 1
          ? 'its one piece reaches ' + ReLU.commas(biggest) + ' pickups'
          : 'the biggest piece reaches ' + ReLU.commas(biggest) + ' pickups, and they cancel');
    }

    return { update: update };
  }, { margin: { top: 6, right: 26, bottom: 8, left: 58 } });

  /* ==================================================================== refresh */

  function refresh() {
    chart.update();
    strip.update();
    widthSlider.setValue(idx);

    const n = net();
    errStat.set(n.holdoutRmse.toFixed(1));
    cornerStat.set(n.kinksInside + ' of ' + n.width);

    table.innerHTML = '';
    table.appendChild(UI.el('tr', UI.el('th', 'neurons'),
      UI.el('th.num', 'numbers learned'), UI.el('th.num', 'held out miss')));
    NETS.forEach(function (row, i) {
      table.appendChild(UI.el('tr' + (i === idx ? '.is-current' : ''),
        UI.el('td', String(row.width)),
        UI.el('td.num', String(row.parameters)),
        UI.el('td.num', row.holdoutRmse.toFixed(1))));
    });

    const best = NETS.reduce(function (a, b) {
      return b.holdoutRmse < a.holdoutRmse ? b : a; });

    if (n.width === 1) {
      closing.textContent = 'One neuron is the ramp of scene one, fitted. It cannot '
        + 'come back down, so it settles for a line that is wrong all day.';
    } else if (n.width < D.elbow) {
      closing.textContent = 'Wider, and the corners multiply: ' + n.kinksInside
        + ' inside the day, each one a neuron switching on. The miss is falling '
        + 'and is still well above the ' + D.floors.heldOut.toFixed(1)
        + ' the scatter alone costs.';
    } else if (n.width === D.elbow) {
      closing.textContent = 'The miss is ' + n.holdoutRmse.toFixed(1)
        + ' against a floor of ' + D.floors.heldOut.toFixed(1) + '. The day built '
        + 'by hand took 14 ramps for the same curve.';
    } else {
      closing.textContent = 'Twice the neurons, and the miss goes up, from '
        + best.holdoutRmse.toFixed(1) + ' to ' + n.holdoutRmse.toFixed(1)
        + '. Past the floor there is nothing left to learn but the weather.';
    }
  }

  refresh();

  return {
    onEnter: refresh,
    onNextKey: function () {
      if (idx >= NETS.length - 1) return false;
      idx += 1; refresh(); return true;
    },
    onPrevKey: function () {
      if (idx <= 0) return false;
      idx -= 1; refresh(); return true;
    },
  };
};
