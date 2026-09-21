/* Scene 6. Beyond the data.
 *
 * The clause in the theorem that costs money: "on a bounded interval". The
 * slider opens the window past the hours the counter ever recorded, and the
 * same weights keep answering. The y scale is deliberately allowed to follow,
 * so the day the whole page has been building shrinks into a wiggle while the
 * extrapolation runs off the bottom of the panel. That is the proportion of the
 * thing, and a fixed scale would hide it.
 *
 * Two readings sit on top of each other here, and both matter:
 *   the honest failure   every night hour comes back negative, which anybody
 *                        would catch
 *   the dangerous one    encode midnight as hour 24 rather than hour 0 and the
 *                        same model answers a perfectly plausible number
 *
 * The five networks are the same architecture trained from five random starts.
 * Inside the sampled hours they are interchangeable; outside they disagree by
 * hundreds. Colour does not distinguish them on purpose: which one is which is
 * not the point, the fan is.
 *
 * Interaction: one slider, one toggle.
 *
 * Globals used: d3, Plot, UI, ReLU, DATA. */

window.scenes.scene6 = function (root) {
  const D = window.DATA;
  const LOG = D.log;
  const OPEN = D.meta.openingHour, CLOSE = D.meta.closingHour;
  const SEEDS = D.seedNets;
  const MAIN = SEEDS.find(function (n) { return n.seed === D.meta.seed; }) || SEEDS[0];
  const SPREAD = D.seedSpread;

  const FAR_LO = D.wide.lo, FAR_HI = D.wide.hi;

  let reach = 0;                 // 0 is the sampled hours, 1 is 00:00 to 30:00
  let showAll = false;

  const test = UI.testMode();
  if (test === 'night' || UI.flag('run')) reach = 1;
  if (test === 'five') { reach = 1; showAll = true; }
  if (test === 'half') reach = 0.5;

  function lo() { return OPEN + (FAR_LO - OPEN) * reach; }
  function hi() { return CLOSE + (FAR_HI - CLOSE) * reach; }

  function nets() { return showAll ? SEEDS : [MAIN]; }

  /* ===================================================================== chrome */

  const layout = UI.el('div.scene-layout');
  const vizWrap = UI.el('div.viz-wrap');

  const reachSlider = UI.slider('ask beyond the data', {
    min: 0, max: 1, step: 0.02, value: reach, width: 190,
    format: function (v) {
      const l = OPEN + (FAR_LO - OPEN) * v, h = CLOSE + (FAR_HI - CLOSE) * v;
      return ReLU.clock(l) + ' to ' + ReLU.clock(h);
    },
    onInput: function (v) { reach = v; refresh(); },
  });
  const modelToggle = UI.toggleGroup(
    [{ label: 'one model', value: 'one' }, { label: 'five equally good', value: 'five' }],
    { value: showAll ? 'five' : 'one',
      onChange: function (v) { showAll = (v === 'five'); refresh(); } });

  layout.appendChild(UI.el('div.viz-col', vizWrap,
    UI.el('div.controls-row.s6-controls', reachSlider,
      UI.el('div.control', UI.el('label', 'models'), modelToggle)),
    UI.syntheticStamp()));

  const textCol = UI.el('div.text-col');
  textCol.appendChild(UI.head('part five · the limits',
    'Outside the data, nothing is promised.'));
  textCol.appendChild(UI.el('p',
    'Every scene so far lived between 05:00 and 23:00, because that is where the '
    + 'counter ever recorded anything. Open the window wider. The same weights '
    + 'answer, in the same confident voice.'));

  const nightStat = UI.stat('', 'it answers for 02:00', 'on-beyond');
  const spreadStat = UI.stat('', 'the five at midnight', 'on-beyond');
  textCol.appendChild(UI.el('div.stat-strip', nightStat, spreadStat));

  const closing = UI.el('p.small');
  textCol.appendChild(closing);

  textCol.appendChild(UI.callout('the one that gets past you',
    UI.el('p.small',
      'Negative demand is easy to catch. Now write midnight as hour 24 instead '
      + 'of hour 0, which is how a clock column often arrives. The same model '
      + 'answers ' + ReLU.pickups(MAIN.after[0]) + ' pickups, and 02:00 comes '
      + 'back as ' + ReLU.pickups(MAIN.after[2]) + '. Both look like bike '
      + 'demand. Neither is supported by a single observation.')));

  layout.appendChild(textCol);
  root.appendChild(layout);

  /* ====================================================================== chart */

  const chart = Plot.mount(vizWrap, function (ctx) {
    const clip = ctx.clip;
    const layers = {};
    layers.band = ctx.g.append('rect').attr('class', 'band-sampled');
    layers.bandLabel = ctx.g.append('text').attr('class', 'note-label')
      .attr('text-anchor', 'middle');
    layers.axis = ctx.g.append('g');
    layers.dots = ctx.g.append('g').attr('clip-path', clip);
    layers.ghosts = ctx.g.append('g').attr('clip-path', clip);
    layers.inside = ctx.g.append('path').attr('class', 'series-model')
      .attr('clip-path', clip).attr('stroke-width', 3);
    layers.left = ctx.g.append('path').attr('class', 'series-beyond')
      .attr('clip-path', clip).attr('stroke-width', 3);
    layers.right = ctx.g.append('path').attr('class', 'series-beyond')
      .attr('clip-path', clip).attr('stroke-width', 3);
    layers.marks = ctx.g.append('g').attr('clip-path', clip);
    layers.note = ctx.g.append('text').attr('class', 'series-label fill-beyond')
      .attr('text-anchor', 'start');

    function update() {
      const l = lo(), h = hi();
      const x = d3.scaleLinear([l, h], [0, ctx.w]);

      // The vertical window follows whatever the shown models actually answer,
      // so the day shrinks as the extrapolation takes over the panel.
      let top = 300, bottom = -20;
      nets().forEach(function (n) {
        for (let t = l; t <= h + 1e-9; t += 0.2) {
          const v = ReLU.netValue(n, t);
          top = Math.max(top, v);
          bottom = Math.min(bottom, v);
        }
      });
      const pad = 0.06 * (top - bottom);
      const y = d3.scaleLinear([bottom - pad, top + pad], [ctx.h, 0]);
      const line = Plot.liner(x, y);

      layers.axis.selectAll('*').remove();
      Plot.axes(layers.axis, { x: x, y: y, w: ctx.w, h: ctx.h,
        xTicks: d3.range(Math.ceil(l / 3) * 3, h + 1e-9, 3),
        xFormat: function (v) { return ReLU.clock(v).slice(0, 2); },
        yLabel: 'pickups per half hour' });

      // With the window closed there is no outside, so the tint would just be
      // a wash over the whole panel.
      const showBand = reach > 0.08;
      layers.band.attr('x', x(OPEN)).attr('y', 0)
        .attr('width', showBand ? Math.max(0, x(CLOSE) - x(OPEN)) : 0)
        .attr('height', ctx.h);
      layers.bandLabel.attr('x', (x(OPEN) + x(CLOSE)) / 2).attr('y', 14)
        .text(reach > 0.08 ? 'the hours the counter ever saw' : '');

      layers.dots.selectAll('*').remove();
      Plot.counts(layers.dots, { x: x, y: y, clip: clip,
        slotHours: LOG.slotHours, counts: LOG.pickups, r: 1.6 });

      layers.ghosts.selectAll('*').remove();
      if (showAll) {
        let lowest = Infinity;
        SEEDS.forEach(function (n) {
          if (n === MAIN) return;
          layers.ghosts.append('path').attr('class', 'series-ghost')
            .attr('stroke-width', 1.8)
            .attr('d', line(ReLU.sample(function (t) { return ReLU.netValue(n, t); },
                                        l, h, 0.05)));
          lowest = Math.min(lowest, ReLU.netValue(n, l));
        });
        // One label for the fan. Which curve is which is not the lesson, and
        // four labels at the same edge sit on top of each other.
        if (isFinite(lowest)) {
          layers.ghosts.append('text').attr('class', 'note-label')
            .attr('x', 8).attr('y', y(lowest) - 10)
            .text('four more of the same, trained from other random starts');
        }
      }

      const value = function (t) { return ReLU.netValue(MAIN, t); };
      layers.inside.attr('d', line(ReLU.sample(value, OPEN, CLOSE, 0.02)));
      layers.left.attr('d', l < OPEN - 1e-9
        ? line(ReLU.sample(value, l, OPEN, 0.02)) : null);
      layers.right.attr('d', h > CLOSE + 1e-9
        ? line(ReLU.sample(value, CLOSE, h, 0.02)) : null);

      layers.marks.selectAll('*').remove();
      if (reach > 0.3) {
        D.nightHours.forEach(function (t, i) {
          if (t < l - 1e-9) return;
          layers.marks.append('path').attr('class', 'fill-beyond')
            .attr('d', d3.symbol().type(d3.symbolTriangle).size(62)())
            .attr('transform', 'translate(' + x(t) + ',' + y(MAIN.night[i])
                  + ') rotate(180)');
        });
        layers.note.attr('x', x(Math.max(l, 0)) + 10)
          .attr('y', y(MAIN.night[0]) + 26)
          .text('the hours the vans actually run');
      } else {
        layers.note.text('');
      }
    }

    return { update: update };
  }, { margin: { top: 20, right: 26, bottom: 36, left: 62 } });

  /* ==================================================================== refresh */

  function refresh() {
    chart.update();
    reachSlider.setValue(reach);
    nightStat.set(ReLU.pickups(MAIN.night[2]));
    spreadStat.set(ReLU.commas(SPREAD.midnightLo) + ' to ' + ReLU.commas(SPREAD.midnightHi));

    closing.textContent = showAll
      ? 'Five networks, one architecture, five random starts, each a defensible '
        + 'fit missing by ' + SPREAD.holdoutLo.toFixed(1) + ' to '
        + SPREAD.holdoutHi.toFixed(1) + '. At midnight they are '
        + ReLU.commas(SPREAD.midnight) + ' pickups apart. Nothing in the data '
        + 'says which is right, because nothing in the data is there.'
      : 'A ReLU network ends in a straight line, so outside the data it keeps '
        + 'going in the direction it happened to be going. Every hour of the '
        + 'night shift comes back negative here. The fix is not a better '
        + 'network: it is refusing the question outside the hours you sampled.';
  }

  refresh();

  return {
    onEnter: refresh,
    onNextKey: function () {
      if (reach < 1) { reach = 1; refresh(); return true; }
      if (!showAll) { showAll = true; modelToggle.select('five'); refresh(); return true; }
      return false;
    },
    onPrevKey: function () {
      if (showAll) { showAll = false; modelToggle.select('one'); refresh(); return true; }
      if (reach > 0) { reach = 0; refresh(); return true; }
      return false;
    },
  };
};
