/* Scene 3. The width ladder: what each budget of units ends up drawing.
 *
 * Five panels, revealed one click at a time: the straight line, then the same
 * run at 1, 3, 10 and 50 units. Every curve is the end of a real run, rebuilt
 * here from that run's final weights, and every number under it comes from the
 * payload rather than from this file.
 *
 * Globals used: d3, Plot, Net, window.NNVIZ. */

window.scenes.scene3 = function (root) {
  'use strict';

  var d = window.NNVIZ.data;
  var runs = window.NNVIZ.runs;
  var WIDTHS = Object.keys(runs).map(Number).sort(function (a, b) { return a - b; });

  var head = document.createElement('div');
  head.className = 'scene-head';
  head.innerHTML =
    '<h2>More units, more bends</h2>' +
    '<p class="lede">The same data, the same rule, the same ' +
    Plot.commas(runs[String(WIDTHS[0])].steps) + ' steps. Only the number of ' +
    'units changes.</p>';
  root.appendChild(head);

  var panels = document.createElement('div');
  panels.className = 'panels scene3-panels';
  root.appendChild(panels);

  /** Where a unit bends, in hours, for the units that bend inside the day. */
  function bendsInsideTheDay(theta, p) {
    var n = 0;
    for (var j = 0; j < p; j++) {
      var w = theta[j], b = theta[p + j];
      if (w === 0) continue;
      var hour = (-b / w) * d.hourHalf + d.hourMid;
      if (hour >= 5 && hour <= 23) n++;
    }
    return n;
  }

  var cards = [];

  function card(opts) {
    var box = document.createElement('div');
    box.className = 'panel ladder-card';
    panels.appendChild(box);

    var t = document.createElement('div');
    t.className = 'panel-title';
    t.textContent = opts.title;
    box.appendChild(t);

    var panel = Plot.dayPanel(box, {
      width: 226, height: 222, small: true,
      margin: { top: 8, right: 8, bottom: 20, left: 26 }
    });
    Plot.drawMeans(panel, { r: 1.7 });
    panel.layers.net.append('path')
      .attr('class', opts.isLine ? 'fit-line' : 'fit-net')
      .attr('d', Plot.curvePath(panel, opts.curve));

    var stat = document.createElement('div');
    stat.className = 'ladder-stat';
    stat.innerHTML =
      '<span class="ladder-miss">' + Math.round(opts.miss) + '</span>' +
      '<span class="ladder-unit">pickups off, typically</span>' +
      '<span class="ladder-sub">' + opts.sub + '</span>';
    box.appendChild(stat);

    cards.push(box);
    return box;
  }

  card({
    title: 'A straight line',
    curve: d.line.curve,
    miss: d.line.missPickups,
    isLine: true,
    sub: '2 knobs, no bend'
  });

  WIDTHS.forEach(function (p) {
    var run = runs[String(p)];
    var theta = run.weights[run.weights.length - 1];
    var bends = bendsInsideTheDay(theta, p);
    card({
      title: p === 1 ? '1 unit' : p + ' units',
      curve: Net.curve(theta, p, d.curveHours),
      miss: run.finalMissPickups,
      sub: run.nParams + ' knobs, ' + bends + (bends === 1 ? ' bend' : ' bends') +
        ' inside the day'
    });
  });

  var note = document.createElement('div');
  note.className = 'scene3-note';
  var wide = runs[String(WIDTHS[WIDTHS.length - 1])];
  var one = runs[String(WIDTHS[0])];
  note.innerHTML =
    '<p><strong>One unit is one bend, and one bend is not worth having.</strong> ' +
    'It lands where the straight line already was. Three units spend all three ' +
    'bends on the evening rush and leave the morning to fend for itself. From ' +
    'ten units on, the curve is following the day.</p>' +
    '<p>At ' + WIDTHS[WIDTHS.length - 1] + ' units the worst half hour of the ' +
    'day is out by ' + Math.round(wide.worstResidualPickups) + ' pickups, on a ' +
    'peak of ' + Math.round(d.peakMean) + '. The averages themselves carry about ' +
    Math.round(d.averagingNoisePickups) + ' pickups of noise, so there is a floor ' +
    'under this, and it is not far below.</p>' +
    '<p class="small muted">Nothing here was told where the rushes are. Every bend ' +
    'was found by the same rule: read the slope, take a step downhill, ' +
    Plot.commas(one.steps) + ' times.</p>';
  root.appendChild(note);

  var foot = document.createElement('div');
  foot.className = 'scene-foot';
  foot.textContent =
    'Synthetic data, from the seeded generator of the course notebook. Every curve is ' +
    'the end of one run of full batch gradient descent with step size ' +
    one.alpha + ', from the same seeded start. A wider network that trains longer, or ' +
    'with a cleverer step, gets closer still.';
  root.appendChild(foot);

  var STEPS = cards.length;
  var cursor = 0;

  function render() {
    cards.forEach(function (el, i) { el.classList.toggle('is-on', i <= cursor); });
    note.classList.toggle('is-on', cursor >= STEPS - 1);
  }

  function setCursor(c) {
    if (c < 0 || c >= STEPS) return false;
    cursor = c;
    render();
    return true;
  }

  render();
  if (window.VizFlags && window.VizFlags().run) setCursor(STEPS - 1);

  return {
    onNextKey: function () { return setCursor(cursor + 1); },
    onPrevKey: function () { return setCursor(cursor - 1); }
  };
};
