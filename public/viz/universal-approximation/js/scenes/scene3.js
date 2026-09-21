/* Scene 3. The whole day, by hand.
 *
 * The bump of scene 2, four times over, on a dawn shelf. Every piece is added
 * one at a time and the typical miss is recomputed against all 1,480 counts on
 * every frame, so the error is something the room watches fall rather than a
 * number in a caption.
 *
 * The four bumps and the shelf are the notebook's own nineteen numbers, read
 * off the scatter by eye. Nothing here is trained, and the scene says so: this
 * is what a person can do with a pencil before any optimiser is involved.
 *
 * The piece that was added last keeps its handles, so the reader can nudge it
 * and watch the error move. Giving all five sets of handles at once turns the
 * chart into a pincushion, and the lesson is the falling number rather than the
 * dragging.
 *
 * Interaction: an internal step engine, six steps, plus live handles.
 *
 * Globals used: d3, Plot, UI, ReLU, DATA. */

window.scenes.scene3 = function (root) {
  const D = window.DATA;
  const LOG = D.log;
  const OPEN = D.meta.openingHour, CLOSE = D.meta.closingHour;
  const GAP = 0.25;

  const Y_TOP = 300, Y_BOTTOM = -20;

  /* The nineteen numbers, copied out of the payload so the reader can move them
   * without editing the record of what the notebook chose. */
  const shelf = {
    kind: 'shelf', name: 'dawn baseline', ramps: 2, numbers: 3,
    start: D.hand.baseline.start, level: D.hand.baseline.level,
    height: D.hand.baseline.height,
  };
  const structures = [shelf].concat(D.hand.bumps.map(function (b) {
    return { kind: 'bump', name: b.name, ramps: 3, numbers: 4,
             start: b.start, peak: b.peak, end: b.end, height: b.height };
  }));
  const LAST = structures.length;

  let cursor = 0;
  const test = UI.testMode();
  if (test === 'all' || UI.flag('run')) cursor = LAST;
  if (test === 'two') cursor = 2;

  function pieceValue(s, h) {
    return s.kind === 'shelf'
      ? ReLU.shelf(h, s.start, s.level, s.height)
      : ReLU.bump(h, s.start, s.peak, s.end, s.height);
  }

  function value(h) {
    let total = 0;
    for (let i = 0; i < cursor; i++) total += pieceValue(structures[i], h);
    return total;
  }

  function miss() {
    return ReLU.rmseAgainstLog(LOG.slotHours, LOG.pickups, value);
  }

  function used() {
    let ramps = 0, numbers = 0;
    for (let i = 0; i < cursor; i++) {
      ramps += structures[i].ramps;
      numbers += structures[i].numbers;
    }
    return { ramps: ramps, numbers: numbers };
  }

  /* ===================================================================== chrome */

  const layout = UI.el('div.scene-layout');
  const vizWrap = UI.el('div.viz-wrap');
  const addBtn = UI.button('Add the next piece', function () { setCursor(cursor + 1); },
                           'primary');
  const backBtn = UI.button('Take one away', function () { setCursor(cursor - 1); });
  const controls = UI.el('div.controls-row.s3-controls', addBtn, backBtn,
    UI.el('span.small.muted.s3-hint', ''));
  layout.appendChild(UI.el('div.viz-col', vizWrap, controls, UI.syntheticStamp()));

  const textCol = UI.el('div.text-col');
  textCol.appendChild(UI.head('Part two · the day by hand', 'Bumps make anything.'));
  const story = UI.el('p');
  textCol.appendChild(story);

  const missStat = UI.stat('', 'typical miss, all 1,480 counts', 'on-model');
  const rampStat = UI.stat('', 'ramps used');
  const numberStat = UI.stat('', 'numbers chosen by eye');
  textCol.appendChild(UI.el('div.stat-strip', missStat));
  textCol.appendChild(UI.el('div.stat-strip', rampStat, numberStat));

  const ledger = UI.el('table.data-table.s3-ledger');
  textCol.appendChild(ledger);

  const closing = UI.el('p.small.muted');
  textCol.appendChild(closing);
  layout.appendChild(textCol);
  root.appendChild(layout);

  /* ====================================================================== chart */

  const chart = Plot.mount(vizWrap, function (ctx) {
    const x = d3.scaleLinear([OPEN, CLOSE], [0, ctx.w]);
    const y = d3.scaleLinear([Y_BOTTOM, Y_TOP], [ctx.h, 0]);
    const line = Plot.liner(x, y);

    Plot.axes(ctx.g, { x: x, y: y, w: ctx.w, h: ctx.h,
      xLabel: 'hour of the day', yLabel: 'bike pickups per half hour' });
    Plot.counts(ctx.g, { x: x, y: y, clip: ctx.clip,
      slotHours: LOG.slotHours, counts: LOG.pickups, r: 1.9 });

    const average = D.average.hours.map(function (h, i) { return [h, D.average.values[i]]; });
    ctx.g.append('path').attr('class', 'series-target').attr('clip-path', ctx.clip)
      .attr('stroke-width', 2).attr('d', line(average));

    const pieceLayer = ctx.g.append('g').attr('clip-path', ctx.clip);
    const paths = structures.map(function () {
      return pieceLayer.append('path').attr('class', 'series-piece')
        .attr('stroke-width', 1.8).attr('opacity', 0.9);
    });
    const names = structures.map(function () {
      return pieceLayer.append('text').attr('class', 'note-label fill-piece')
        .attr('text-anchor', 'middle');
    });
    const sum = ctx.g.append('path').attr('class', 'series-model')
      .attr('clip-path', ctx.clip).attr('stroke-width', 3.2);

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    /* Handles belong to the piece that was added last. */
    const hStart = Plot.handle(ctx.g, { label: '', labelDy: 20, labelDx: 0,
      labelAnchor: 'middle',
      onDrag: function (px) {
        const s = structures[cursor - 1];
        const limit = (s.kind === 'shelf' ? s.level : s.peak) - GAP;
        s.start = clamp(x.invert(px), OPEN - 1, limit);
        refresh();
      } });
    const hTop = Plot.handle(ctx.g, { label: '', labelDy: -15, labelDx: 0,
      labelAnchor: 'middle',
      onDrag: function (px, py) {
        const s = structures[cursor - 1];
        const upper = s.kind === 'shelf' ? CLOSE : s.end - GAP;
        if (s.kind === 'shelf') s.level = clamp(x.invert(px), s.start + GAP, upper);
        else s.peak = clamp(x.invert(px), s.start + GAP, upper);
        s.height = clamp(y.invert(py), 5, Y_TOP - 15);
        refresh();
      } });
    const hEnd = Plot.handle(ctx.g, { label: '', labelDy: 20, labelDx: 0,
      labelAnchor: 'middle',
      onDrag: function (px) {
        const s = structures[cursor - 1];
        if (s.kind !== 'bump') return;
        s.end = clamp(x.invert(px), s.peak + GAP, CLOSE + 1);
        refresh();
      } });

    function update() {
      structures.forEach(function (s, i) {
        const on = i < cursor;
        paths[i].attr('d', on
          ? line(ReLU.sample(function (h) { return pieceValue(s, h); }, OPEN, CLOSE, 0.05))
          : null);
        // The live piece already carries its numbers on its own handle, so a
        // name at the same point would sit on top of them.
        if (on && i !== cursor - 1) {
          const shelfLabel = s.kind === 'shelf';
          const at = shelfLabel ? 15.0 : s.peak;
          names[i].attr('x', clamp(x(at), 40, ctx.w - 40))
            .attr('y', clamp(y(s.height) + (shelfLabel ? 17 : -9), 12, ctx.h - 4))
            .text(s.name);
        } else {
          names[i].text('');
        }
      });

      sum.attr('d', cursor > 0 ? line(ReLU.sample(value, OPEN, CLOSE, 0.02)) : null);

      const live = cursor > 0 ? structures[cursor - 1] : null;
      [hStart, hTop, hEnd].forEach(function (h) { h.attr('display', live ? null : 'none'); });
      if (!live) return;
      function px(hour) { return clamp(x(hour), 0, ctx.w); }
      hStart.move(px(live.start), y(0)).setLabel(ReLU.clock(live.start));
      if (live.kind === 'shelf') {
        hTop.move(px(live.level), y(live.height))
          .setLabel(ReLU.clock(live.level) + ', ' + ReLU.pickups(live.height));
        hEnd.attr('display', 'none');
      } else {
        hTop.move(px(live.peak), y(live.height))
          .setLabel(ReLU.clock(live.peak) + ', ' + ReLU.pickups(live.height));
        hEnd.move(px(live.end), y(0)).setLabel(ReLU.clock(live.end));
      }
    }

    return { update: update };
  }, { margin: { top: 22, right: 26, bottom: 44, left: 62 } });

  /* ==================================================================== refresh */

  const STORY = [
    'Nothing yet. A flat forecast of zero misses every count in the log by the '
    + 'whole of the count.',
    'A shelf first, not a bump: two ramps, one to climb at dawn and one to '
    + 'cancel the climb, so the level holds for the rest of the day.',
    'Three ramps for the morning rush, placed by eye off the scatter.',
    'The lunch lift is small, and the error barely moves. Squared error is '
    + 'dominated by the tallest thing you are still getting wrong.',
    'The evening rush is the tallest structure of the day, and the error knows it.',
    'The evening drift, and the day is traced. Fourteen ramps, nineteen numbers, '
    + 'nothing trained, nothing optimised.',
  ];

  function refresh() {
    chart.update();
    const counts = used();
    const m = miss();
    missStat.set(m.toFixed(1));
    rampStat.set(String(counts.ramps));
    numberStat.set(String(counts.numbers));
    story.textContent = STORY[cursor];

    ledger.innerHTML = '';
    ledger.appendChild(UI.el('tr', UI.el('th', 'piece added'), UI.el('th.num', 'ramps'),
      UI.el('th.num', 'typical miss')));
    D.hand.stages.forEach(function (stage, i) {
      const done = i < cursor;
      const row = UI.el('tr' + (i === cursor - 1 ? '.is-current' : ''),
        UI.el('td', stage.label),
        UI.el('td.num', done ? String(stage.ramps) : ''),
        UI.el('td.num', done ? stage.rmseCounts.toFixed(1) : ''));
      if (!done) row.style.opacity = '0.35';
      ledger.appendChild(row);
    });

    closing.textContent = cursor === LAST
      // One decimal, not two: prose rounds on a projector, and the notebook
      // this comes from says "about 3.6" in the same place.
      ? 'Nineteen numbers, chosen by looking. The curve sits about '
        + D.hand.stages[LAST - 1].rmseAverage.toFixed(1) + ' pickups from the average day, '
        + 'and the counts themselves scatter by about ' + Math.round(D.floors.allDays)
        + ', so the miss cannot fall much further. The corners are the giveaway: '
        + 'every piece of this is straight.'
      : 'The ledger holds the notebook\'s own figures. Your handles move the '
        + 'live piece, so the number above it is yours.';

    addBtn.disabled = cursor >= LAST;
    backBtn.disabled = cursor <= 0;
    addBtn.textContent = cursor >= LAST ? 'The day is traced' : 'Add the next piece';
    controls.lastChild.textContent = cursor > 0
      ? 'handles on the ' + structures[cursor - 1].name : '';
  }

  function setCursor(next) {
    if (next < 0 || next > LAST) return false;
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
