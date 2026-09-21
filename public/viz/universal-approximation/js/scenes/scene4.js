/* Scene 4. The theorem, in words, with the price list attached.
 *
 * The statement is the one thing on this page that has to be said precisely,
 * so it is said in words and then shown: name an accuracy, and there is a pile
 * of ramps that never leaves that band anywhere on 05:00 to 23:00. The slider
 * names the accuracy, the counter says what it costs, and the cost is the
 * thing the theorem is silent about.
 *
 * The ladder is built in precompute/build_data.py: for each tolerance, the
 * fewest equally spaced knots whose broken line stays inside it, checked on a
 * grid of 3,601 hours, and then rewritten as a constant plus that many ramps
 * and checked again to 1e-9. Nothing here is fitted to the counts; this scene
 * is about representation, not training.
 *
 * Interaction: one slider, five stops.
 *
 * Globals used: d3, Plot, UI, ReLU, DATA. */

window.scenes.scene4 = function (root) {
  const D = window.DATA;
  const OPEN = D.meta.openingHour, CLOSE = D.meta.closingHour;
  const LADDER = D.ladder;

  const Y_TOP = 260, Y_BOTTOM = -20;

  let idx = 0;
  const test = UI.testMode();
  if (test === 'tight' || UI.flag('run')) idx = LADDER.length - 1;
  if (test === 'mid') idx = 2;

  function rung() { return LADDER[idx]; }

  /** "1 pickup", "20 pickups". */
  function pickupWord(n) { return n + (n === 1 ? ' pickup' : ' pickups'); }

  /* ===================================================================== chrome */

  const layout = UI.el('div.scene-layout');
  const vizWrap = UI.el('div.viz-wrap');

  const tolSlider = UI.slider('how close do you want to be', {
    min: 0, max: LADDER.length - 1, step: 1, value: idx, width: 200,
    format: function (v) { return 'within ' + pickupWord(LADDER[v].tolerance); },
    onInput: function (v) { idx = v; refresh(); },
  });
  layout.appendChild(UI.el('div.viz-col', vizWrap,
    UI.el('div.controls-row.s4-controls', tolSlider),
    UI.el('div.synthetic-stamp',
      'The shape being traced is the average day of the synthetic log, and the '
      + 'ramps are placed by hand rather than trained.')));

  const textCol = UI.el('div.text-col');
  textCol.appendChild(UI.head('the theorem', 'Enough ramps, any shape.',
    'Name an accuracy. There is a pile of ramps that never leaves it.'));

  textCol.appendChild(UI.callout('universal approximation',
    UI.el('p.s4-statement',
      'One hidden layer with enough units can approximate any continuous '
      + 'function on a bounded interval as closely as you like.')));

  const rampStat = UI.stat('', 'ramps that buys', 'on-model');
  const worstStat = UI.stat('', 'worst miss anywhere', 'on-model');
  textCol.appendChild(UI.el('div.stat-strip', rampStat, worstStat));

  const caveats = UI.el('div.s4-caveats');
  textCol.appendChild(caveats);

  textCol.appendChild(UI.el('p.tiny.muted.s4-cites',
    'Cybenko 1989, for sigmoid units: Math. Control Signals Systems 2(4) 303. '
    + 'Leshno, Lin, Pinkus and Schocken 1993, for any activation that is not a '
    + 'polynomial, so including ReLU: Neural Networks 6(6) 861.'));

  layout.appendChild(textCol);
  root.appendChild(layout);

  /* ====================================================================== chart */

  const chart = Plot.mount(vizWrap, function (ctx) {
    const x = d3.scaleLinear([OPEN, CLOSE], [0, ctx.w]);
    const y = d3.scaleLinear([Y_BOTTOM, Y_TOP], [ctx.h, 0]);
    const line = Plot.liner(x, y);

    Plot.axes(ctx.g, { x: x, y: y, w: ctx.w, h: ctx.h,
      xLabel: 'hour of the day', yLabel: 'bike pickups per half hour' });

    const bandPath = ctx.g.append('path').attr('class', 'band-tolerance')
      .attr('clip-path', ctx.clip);

    const average = D.average.hours.map(function (h, i) { return [h, D.average.values[i]]; });
    ctx.g.append('path').attr('class', 'series-target').attr('clip-path', ctx.clip)
      .attr('stroke-width', 2).attr('d', line(average));

    const built = ctx.g.append('path').attr('class', 'series-model')
      .attr('clip-path', ctx.clip).attr('stroke-width', 2.6);
    const rug = ctx.g.append('g').attr('clip-path', ctx.clip);
    const rugLabel = ctx.g.append('text').attr('class', 'note-label')
      .attr('text-anchor', 'start');
    const bandLabel = ctx.g.append('text').attr('class', 'series-label fill-model')
      .attr('text-anchor', 'middle');

    const area = d3.area()
      .x(function (d) { return x(d[0]); })
      .y0(function (d) { return y(d[1]); })
      .y1(function (d) { return y(d[2]); });

    function update() {
      const r = rung();
      bandPath.attr('d', area(D.average.hours.map(function (h, i) {
        return [h, D.average.values[i] - r.tolerance, D.average.values[i] + r.tolerance];
      })));
      built.attr('d', line(r.xs.map(function (h, i) { return [h, r.ys[i]]; })));

      rug.selectAll('*').remove();
      r.xs.forEach(function (h, i) {
        // A ramp kinks at every knot except the last: the broken line through
        // n knots is a constant plus n minus 1 ramps, the first of them at
        // 05:00. Skipping the last knot puts every tick on a real kink.
        if (i === r.xs.length - 1) return;
        rug.append('line').attr('class', 'series-piece')
          .attr('stroke-width', 1.2).attr('opacity', 0.75)
          .attr('x1', x(h)).attr('x2', x(h))
          .attr('y1', ctx.h).attr('y2', ctx.h - 9);
      });
      rugLabel.attr('x', 4).attr('y', ctx.h - 14)
        .text('one tick per ramp: ' + r.ramps + ' of them');
      bandLabel.attr('x', x(11.4)).attr('y', y(132))
        .text('never leave a band of ' + pickupWord(r.tolerance));
    }

    return { update: update };
  }, { margin: { top: 22, right: 26, bottom: 44, left: 62 } });

  /* ==================================================================== refresh */

  function refresh() {
    chart.update();
    const r = rung();
    rampStat.set(String(r.ramps));
    worstStat.set(r.worst.toFixed(1));
    tolSlider.setValue(idx);

    const first = LADDER[0], last = LADDER[LADDER.length - 1];
    caveats.innerHTML = '';
    [['It never says how many.',
      'Twenty times closer costs ' + last.ramps + ' ramps here against '
      + first.ramps + '. On another curve, another number.'],
     ['Only on the stretch you name.',
      'Continuous, and a closed interval. Outside 05:00 to 23:00 it promises '
      + 'nothing, which is the last scene.'],
     ['A good setting exists.',
      'It does not say training will find it.'],
    ].forEach(function (pair) {
      caveats.appendChild(UI.el('p.small.s4-caveat',
        UI.el('strong', pair[0]), ' ' + pair[1]));
    });
  }

  refresh();

  return {
    onEnter: refresh,
    onNextKey: function () {
      if (idx >= LADDER.length - 1) return false;
      idx += 1; refresh(); return true;
    },
    onPrevKey: function () {
      if (idx <= 0) return false;
      idx -= 1; refresh(); return true;
    },
  };
};
