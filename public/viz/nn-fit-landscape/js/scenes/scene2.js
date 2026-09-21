/* Scene 2. One network, training. The curve on the left, the landscape on the
 * right, the same run driving both.
 *
 * Left:  the 37 averages, the straight line as a ghost, and the network's own
 *        curve, rebuilt at every frame from the weights of that step.
 * Right: a flat slice of the loss landscape through the weights the run ended
 *        at, with the grasshopper hopping along the run's own path, and the
 *        loss by step underneath.
 *
 * The film is 300 snapshots of one run: every step for the first forty, then
 * geometrically spaced out to step 250,000. At normal speed it takes about
 * twenty seconds.
 *
 * Globals used: d3, Plot, Net, Hopper, window.NNVIZ. */

window.scenes.scene2 = function (root) {
  'use strict';

  var d = window.NNVIZ.data;
  var runs = window.NNVIZ.runs;
  var WIDTHS = Object.keys(runs).map(Number).sort(function (a, b) { return a - b; });
  var FILM_MS = 20000;          // one run, start to finish, at normal speed

  var state = {
    p: WIDTHS.indexOf(10) >= 0 ? 10 : WIDTHS[0],
    i: 0,
    playing: false,
    speed: 1
  };

  /* ================================================================ head */

  var head = document.createElement('div');
  head.className = 'scene-head';
  head.innerHTML =
    '<h2>One network, training</h2>' +
    '<p class="lede">The same game as this morning. Read the slope, take a step ' +
    'downhill, repeat. The only change is how many knobs the step moves at once.</p>';
  root.appendChild(head);

  /* ============================================================ controls */

  var bar = document.createElement('div');
  bar.className = 'controls-row scene2-bar';
  root.appendChild(bar);

  function control(labelText) {
    var c = document.createElement('div');
    c.className = 'control';
    if (labelText) {
      var l = document.createElement('label');
      l.textContent = labelText;
      c.appendChild(l);
    }
    bar.appendChild(c);
    return c;
  }

  var widthBox = control('Units');
  var widthGroup = document.createElement('div');
  widthGroup.className = 'toggle-group';
  widthBox.appendChild(widthGroup);
  var widthButtons = WIDTHS.map(function (p) {
    var b = document.createElement('button');
    b.textContent = String(p);
    b.addEventListener('click', function () { setWidth(p); });
    widthGroup.appendChild(b);
    return b;
  });

  var playBox = control('');
  var playBtn = document.createElement('button');
  playBtn.className = 'btn small primary';
  playBtn.textContent = 'Play';
  playBtn.addEventListener('click', function () { setPlaying(!state.playing); });
  playBox.appendChild(playBtn);

  var stepBtn = document.createElement('button');
  stepBtn.className = 'btn small';
  stepBtn.textContent = 'Step';
  stepBtn.addEventListener('click', function () { setPlaying(false); goToFrame(state.i + 1); });
  playBox.appendChild(stepBtn);

  var resetBtn = document.createElement('button');
  resetBtn.className = 'btn small';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', function () { setPlaying(false); goToFrame(0); });
  playBox.appendChild(resetBtn);

  var speedBox = control('Speed');
  var speedGroup = document.createElement('div');
  speedGroup.className = 'toggle-group';
  speedBox.appendChild(speedGroup);
  var SPEEDS = [0.5, 1, 2];
  var speedButtons = SPEEDS.map(function (s) {
    var b = document.createElement('button');
    b.textContent = s + 'x';
    b.addEventListener('click', function () { setSpeed(s); });
    speedGroup.appendChild(b);
    return b;
  });

  var readBox = document.createElement('div');
  readBox.className = 'scene2-readouts stat-strip';
  bar.appendChild(readBox);
  readBox.innerHTML =
    '<div class="stat"><span class="stat-value" id="r-step">0</span>' +
    '<span class="stat-label">steps taken</span></div>' +
    '<div class="stat"><span class="stat-value" id="r-loss">0</span>' +
    '<span class="stat-label">average squared miss</span></div>' +
    '<div class="stat"><span class="stat-value" id="r-miss">0</span>' +
    '<span class="stat-label">typical miss, pickups</span></div>' +
    '<div class="stat"><span class="stat-value" id="r-knobs">0</span>' +
    '<span class="stat-label">knobs</span></div>';
  var rStep = readBox.querySelector('#r-step');
  var rLoss = readBox.querySelector('#r-loss');
  var rMiss = readBox.querySelector('#r-miss');
  var rKnobs = readBox.querySelector('#r-knobs');

  /* ============================================================== panels */

  var panels = document.createElement('div');
  panels.className = 'panels scene2-panels';
  root.appendChild(panels);

  var left = document.createElement('div');
  left.className = 'panel';
  panels.appendChild(left);
  var leftTitle = document.createElement('div');
  leftTitle.className = 'panel-title';
  leftTitle.textContent = 'What the network says the day looks like';
  left.appendChild(leftTitle);

  var panel = Plot.dayPanel(left, { width: 660, height: 404 });
  Plot.drawMeans(panel);
  panel.layers.line.append('path')
    .attr('class', 'fit-line thin')
    .attr('d', Plot.curvePath(panel, d.line.curve));
  panel.layers.top.append('text')
    .attr('class', 'series-label fit-line-text')
    .attr('x', panel.x(22.8)).attr('y', panel.y(d.line.curve[d.line.curve.length - 1]) - 8)
    .attr('text-anchor', 'end')
    .text('the straight line');
  var netPath = panel.layers.net.append('path').attr('class', 'fit-net');

  var leftNote = document.createElement('div');
  leftNote.className = 'panel-note';
  left.appendChild(leftNote);

  var right = document.createElement('div');
  right.className = 'panel scene2-right';
  panels.appendChild(right);
  var rightTitle = document.createElement('div');
  rightTitle.className = 'panel-title';
  rightTitle.textContent = 'The ground under the run';
  right.appendChild(rightTitle);

  var mapHost = document.createElement('div');
  mapHost.className = 'scene2-map';
  right.appendChild(mapHost);

  var keyHost = document.createElement('div');
  keyHost.className = 'scene2-key';
  right.appendChild(keyHost);

  var lossHost = document.createElement('div');
  lossHost.className = 'scene2-loss';
  right.appendChild(lossHost);

  var rightNote = document.createElement('div');
  rightNote.className = 'panel-note';
  right.appendChild(rightNote);

  var foot = document.createElement('div');
  foot.className = 'scene-foot';
  root.appendChild(foot);

  /* ====================================================== the map, per width */

  var map = null, hopper = null, trailCasing = null, trailLine = null,
    trailDots = null, hopArc = null, lossPlot = null, lossPast = null,
    lossDot = null, px = [], py = [];

  function buildFor(p) {
    var run = runs[String(p)];

    mapHost.innerHTML = '';
    keyHost.innerHTML = '';
    lossHost.innerHTML = '';

    map = Plot.landscapePanel(mapHost, run, { plotSize: 280 });
    Plot.landscapeKey(keyHost, run, { width: 280, height: 20 });

    px = run.a.map(map.x);
    py = run.b.map(map.y);

    // Where the run ends is marked before it gets there, because the map is
    // the slice through that point and saying so is a different thing from
    // saying which way to walk.
    //
    // The label goes UNDER the ring, and the clamp keeps it inside the panel.
    // The grasshopper's own art stands above its feet, so at the end of the
    // film a label beside or above the finish is covered by the glyph.
    var fx = map.x(0), fy = map.y(0);
    var below = fy < map.m.top + map.plot - 26;
    map.layers.marks.append('circle').attr('class', 'finish-casing')
      .attr('cx', fx).attr('cy', fy).attr('r', 6);
    map.layers.marks.append('circle').attr('class', 'finish-ring')
      .attr('cx', fx).attr('cy', fy).attr('r', 6);
    map.layers.marks.append('circle').attr('class', 'finish-dot')
      .attr('cx', fx).attr('cy', fy).attr('r', 1.8);
    map.layers.marks.append('text').attr('class', 'finish-text')
      .attr('x', Math.min(Math.max(fx, map.m.left + 52), map.m.left + map.plot - 52))
      .attr('y', fy + (below ? 27 : -14))
      .attr('text-anchor', 'middle')
      .text('step ' + Plot.commas(run.steps));

    // where it starts, marked from the first frame, so the map has an anchor
    // while the early steps are still moving too little to draw a trail
    var sx = px[0], sy = py[0];
    map.layers.marks.append('circle').attr('class', 'trail-dot')
      .attr('cx', sx).attr('cy', sy).attr('r', 3.4);
    map.layers.marks.append('text').attr('class', 'map-label')
      .attr('x', Math.min(Math.max(sx, map.m.left + 24), map.m.left + map.plot - 24))
      .attr('y', sy + (sy < map.m.top + map.plot - 26 ? 26 : -14))
      .attr('text-anchor', 'middle')
      .text('step 0');

    trailCasing = map.layers.trail.append('path').attr('class', 'trail-casing');
    trailLine = map.layers.trail.append('path').attr('class', 'trail-line');
    trailDots = map.layers.trail.append('g');
    hopArc = map.layers.trail.append('path').attr('class', 'hop-arc');
    hopper = Hopper.create(map.layers.hopper);

    buildLossStrip(run);

    rightNote.textContent =
      'A 2-D slice through a landscape with ' + run.nParams + ' dimensions.';

    // The data has to be named as synthetic in every scene that draws it, not
    // only on the title card, because a deep link opens straight into one.
    // This line has to stay on one line at 1280 by 720, so it is kept short.
    leftNote.textContent =
      'Rebuilt from the ' + run.nParams + ' numbers this step holds. Step size ' +
      run.alpha + ', the same at every step and width. Synthetic data.';

    foot.textContent =
      'The slice is cut through the weights the run ended at, along the two ' +
      'directions it moved in most, which carry ' +
      Math.round((run.varShare[0] + run.varShare[1]) * 100) +
      ' percent of its movement. The loss under the map is the run\'s own, ' +
      'measured in all ' + run.nParams + ' dimensions.';

    rKnobs.textContent = run.nParams;
  }

  var LOSS_W = 322, LOSS_H = 92, LOSS_M = { top: 22, right: 10, bottom: 16, left: 48 };

  function buildLossStrip(run) {
    var svg = Plot.svg(lossHost, LOSS_W, LOSS_H, 'loss-strip');
    svg.attr('aria-label', 'The loss at every step of the run');
    var n = run.snapLoss.length;
    var lo = d3.min(run.snapLoss) * d.yScale * d.yScale;
    var hi = d3.max(run.snapLoss) * d.yScale * d.yScale;
    var x = d3.scaleLinear().domain([0, n - 1]).range([LOSS_M.left, LOSS_W - LOSS_M.right]);
    var y = d3.scaleLog().domain([lo * 0.75, hi * 1.3])
      .range([LOSS_H - LOSS_M.bottom, LOSS_M.top]);

    svg.append('text').attr('class', 'note-text')
      .attr('x', LOSS_M.left - 2).attr('y', 10)
      .attr('text-anchor', 'start').text('average squared miss, step by step');

    // the step count is squeezed the way the film is: every step at the start,
    // then geometrically. The ticks say where the round numbers fell.
    [10, 1000, 100000].forEach(function (step) {
      var idx = -1;
      for (var k = 0; k < run.snapshotSteps.length; k++) {
        if (run.snapshotSteps[k] >= step) { idx = k; break; }
      }
      if (idx < 0) return;
      svg.append('text').attr('class', 'tick-text')
        .attr('x', x(idx)).attr('y', LOSS_H - 4)
        .attr('text-anchor', 'middle').text(Plot.stepLabel(step) + ' steps');
    });

    var pow = Math.pow(10, Math.ceil(Math.log10(lo * 0.75)));
    for (var v = pow; v <= hi * 1.3; v *= 10) {
      svg.append('line').attr('class', 'grid-line')
        .attr('x1', LOSS_M.left).attr('x2', LOSS_W - LOSS_M.right)
        .attr('y1', y(v)).attr('y2', y(v));
      svg.append('text').attr('class', 'tick-text')
        .attr('x', LOSS_M.left - 6).attr('y', y(v) + 4)
        .attr('text-anchor', 'end').text(Plot.commas(v));
    }

    var lineLoss = d3.line()
      .x(function (v, i) { return x(i); })
      .y(function (v) { return y(v * d.yScale * d.yScale); });

    var lineRef = d.line.lossPickups2;
    if (lineRef > lo * 0.75 && lineRef < hi * 1.3) {
      svg.append('line').attr('class', 'loss-ref')
        .attr('x1', LOSS_M.left).attr('x2', LOSS_W - LOSS_M.right)
        .attr('y1', y(lineRef)).attr('y2', y(lineRef));
      svg.append('text').attr('class', 'note-text')
        .attr('x', LOSS_W - LOSS_M.right).attr('y', y(lineRef) - 4)
        .attr('text-anchor', 'end').text('the straight line');
    }

    svg.append('path').attr('class', 'loss-line').attr('d', lineLoss(run.snapLoss));
    lossPast = svg.append('path').attr('class', 'loss-line-past');
    lossDot = svg.append('circle').attr('class', 'loss-dot').attr('r', 3.4);

    lossPlot = { x: x, y: y, line: lineLoss, n: n };
  }

  /* ============================================================ rendering */

  function frameAt(i) {
    var run = runs[String(state.p)];
    return Math.max(0, Math.min(run.snapLoss.length - 1, i));
  }

  function renderFrame(u) {
    var run = runs[String(state.p)];
    var i = state.i;
    var theta = run.weights[i];

    netPath.attr('d', Plot.curvePath(panel, Net.curve(theta, state.p, d.curveHours)));

    var pts = [];
    for (var k = 0; k <= i; k++) pts.push([px[k], py[k]]);
    var pathD = d3.line()(pts);
    trailCasing.attr('d', pathD);
    trailLine.attr('d', pathD);

    var dots = trailDots.selectAll('circle').data(pts.filter(function (p, k) {
      return k % 15 === 0 || k === i;
    }));
    dots.exit().remove();
    dots.enter().append('circle').attr('class', 'trail-dot').attr('r', 1.8)
      .merge(dots)
      .attr('cx', function (p) { return p[0]; })
      .attr('cy', function (p) { return p[1]; });

    // the hop in progress, if the film is between two steps
    var hasNext = i < px.length - 1;
    var pos;
    if (u > 0 && hasNext) {
      pos = hopper.hopPoint(px[i], py[i], px[i + 1], py[i + 1], u);
      hopArc.attr('d', Hopper.hopArc(px[i], py[i], px[i + 1], py[i + 1]));
      hopper.face(px[i + 1] - px[i]);
    } else {
      pos = { x: px[i], y: py[i], lift: 0 };
      hopArc.attr('d', null);
      if (hasNext) hopper.face(px[i + 1] - px[i]);
    }
    hopper.place(pos.x, pos.y, pos.lift);

    lossPast.attr('d', lossPlot.line(run.snapLoss.slice(0, i + 1)));
    lossDot.attr('cx', lossPlot.x(i))
      .attr('cy', lossPlot.y(run.snapLoss[i] * d.yScale * d.yScale));

    rStep.textContent = Plot.commas(run.snapshotSteps[i]);
    rLoss.textContent = Plot.commas(run.snapLoss[i] * d.yScale * d.yScale,
      run.snapLoss[i] * d.yScale * d.yScale < 100 ? 1 : 0);
    rMiss.textContent = Plot.commas(Net.missPickups(run.snapLoss[i]), 1);
  }

  function goToFrame(i) {
    state.i = frameAt(i);
    renderFrame(0);
    if (state.i >= runs[String(state.p)].snapLoss.length - 1) setPlaying(false);
  }

  function setWidth(p) {
    state.p = p;
    widthButtons.forEach(function (b, k) { b.classList.toggle('active', WIDTHS[k] === p); });
    buildFor(p);
    goToFrame(state.i);
  }

  function setSpeed(s) {
    state.speed = s;
    speedButtons.forEach(function (b, k) { b.classList.toggle('active', SPEEDS[k] === s); });
  }

  function setPlaying(on) {
    var run = runs[String(state.p)];
    if (on && state.i >= run.snapLoss.length - 1) state.i = 0;
    state.playing = on;
    playBtn.textContent = on ? 'Pause' : 'Play';
    if (on) start(); else stop();
  }

  /* ============================================================ the film */

  var raf = 0, lastTs = 0, acc = 0;

  function interval() {
    var run = runs[String(state.p)];
    return FILM_MS / (run.snapLoss.length - 1) / state.speed;
  }

  function tick(ts) {
    if (!state.playing) { raf = 0; return; }
    if (!lastTs) lastTs = ts;
    var dt = Math.min(200, ts - lastTs);
    lastTs = ts;
    acc += dt;
    var step = interval();
    while (acc >= step) {
      acc -= step;
      state.i = frameAt(state.i + 1);
      if (state.i >= runs[String(state.p)].snapLoss.length - 1) {
        renderFrame(0);
        setPlaying(false);
        return;
      }
    }
    renderFrame(Math.max(0, Math.min(1, acc / step)));
    raf = requestAnimationFrame(tick);
  }

  function start() {
    lastTs = 0; acc = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* =============================================================== start */

  setWidth(state.p);
  setSpeed(1);
  goToFrame(0);

  var f = window.VizFlags ? window.VizFlags() : { run: false, test: null };
  if (f.test === 'mid') goToFrame(Math.round(runs[String(state.p)].snapLoss.length * 0.55));
  // one frame frozen half way through its own hop, which is the one state a
  // screenshot cannot otherwise reach: headless never runs the animation
  if (f.test === 'hop') {
    goToFrame(Math.round(runs[String(state.p)].snapLoss.length * 0.35));
    renderFrame(0.5);
  }
  if (f.test === 'end') goToFrame(runs[String(state.p)].snapLoss.length - 1);
  if (f.test === 'wide') { setWidth(50); goToFrame(runs['50'].snapLoss.length - 1); }
  if (f.test === 'narrow') { setWidth(1); goToFrame(runs['1'].snapLoss.length - 1); }
  if (f.run) setPlaying(true);

  function onKey(e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName || '')) return;
    // The listener lives on window for as long as the page does, so space
    // pressed on the ladder used to start this film behind it and leave the
    // scene mid run when the lecturer came back.
    if (window.SceneEngine && window.SceneEngine.current() !== 2) return;
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      setPlaying(!state.playing);
    }
  }
  window.addEventListener('keydown', onKey);

  return {
    onEnter: function () { },
    onLeave: function () { setPlaying(false); }
  };
};
