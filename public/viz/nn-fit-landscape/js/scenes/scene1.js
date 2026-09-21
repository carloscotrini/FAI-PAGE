/* Scene 1. A day, and the best straight line through it.
 *
 * Three steps, one idea each:
 *   1  the forty days, and the average of them at each half hour
 *   2  the best straight line through those averages
 *   3  every miss drawn, and what they add up to
 *
 * The line is the exact least squares line, computed in precompute and not
 * fitted here; the misses on screen are read off the same numbers.
 *
 * Globals used: d3, Plot, window.NNVIZ. */

window.scenes.scene1 = function (root) {
  'use strict';

  var d = window.NNVIZ.data;
  var STEPS = 3;
  var cursor = 0;

  var head = document.createElement('div');
  head.className = 'scene-head';
  head.innerHTML =
    '<h2>A day, and the best straight line through it</h2>' +
    '<p class="lede">Every model on this page is fitted to the same 37 numbers: ' +
    'the average of the ' + d.nDays + ' days at each half hour.</p>';
  root.appendChild(head);

  var panels = document.createElement('div');
  panels.className = 'panels scene1-panels';
  root.appendChild(panels);

  var left = document.createElement('div');
  left.className = 'panel';
  panels.appendChild(left);

  var panelTitle = document.createElement('div');
  panelTitle.className = 'panel-title';
  panelTitle.textContent = 'Pickups at the dock';
  left.appendChild(panelTitle);

  var panel = Plot.dayPanel(left, { width: 700, height: 430 });
  Plot.drawDays(panel, { r: 1.7 });
  Plot.drawMeans(panel);
  // the cloud of single days steps back once the misses are drawn over it,
  // since two dashed sticks per slot and forty dots per slot in one picture is
  // one thing too many
  var dayCloud = panel.layers.days;

  // the exact least squares line, drawn from the precomputed curve
  var linePath = panel.layers.line.append('path')
    .attr('class', 'fit-line')
    .attr('d', Plot.curvePath(panel, d.line.curve))
    .attr('display', 'none');
  var lineLabel = panel.layers.top.append('text')
    .attr('class', 'series-label fit-line-text')
    .attr('x', panel.x(22.6)).attr('y', panel.y(d.line.curve[d.line.curve.length - 1]) - 9)
    .attr('text-anchor', 'end')
    .text('the best straight line')
    .attr('display', 'none');

  // one stick per average, from the average to the line: the misses the loss
  // squares and averages
  var sticks = panel.layers.line.append('g').attr('display', 'none');
  var worst = { miss: 0, hour: 0, at: 0 };
  d.slots.forEach(function (s, i) {
    var fitted = d.line.fitted[i];
    var miss = d.means[i] - fitted;
    if (Math.abs(miss) > Math.abs(worst.miss)) {
      worst = { miss: miss, hour: s, at: fitted };
    }
    sticks.append('line').attr('class', 'miss-stick')
      .attr('x1', panel.x(s)).attr('x2', panel.x(s))
      .attr('y1', panel.y(d.means[i])).attr('y2', panel.y(fitted));
  });
  // the label for the worst miss stands in the empty middle of the afternoon
  // and reaches its own stick with a leader, so it never sits on a dot
  var worstMid = (d.means[d.slots.indexOf(worst.hour)] + worst.at) / 2;
  var worstMark = panel.layers.top.append('g').attr('display', 'none');
  worstMark.append('line').attr('class', 'miss-stick')
    .attr('x1', panel.x(15.6)).attr('x2', panel.x(worst.hour) - 3)
    .attr('y1', panel.y(worstMid)).attr('y2', panel.y(worstMid));
  worstMark.append('text').attr('class', 'note-text')
    .attr('x', panel.x(15.4)).attr('y', panel.y(worstMid) + 4)
    .attr('text-anchor', 'end')
    .text('the worst miss, ' + Math.round(Math.abs(worst.miss)) + ' pickups');

  var right = document.createElement('div');
  right.className = 'scene1-text';
  panels.appendChild(right);

  function fmtHour(h) {
    var hh = Math.floor(h);
    return (hh < 10 ? '0' : '') + hh + ':' + (h - hh >= 0.5 ? '30' : '00');
  }

  var blocks = [
    '<h3>What the dock recorded</h3>' +
    '<p>' + Plot.commas(d.nRows) + ' counts: every half hour from 05:00 to 23:00, on ' +
    // "pale" and "dark" swap over when the theme does, so the dots are named
    // by weight rather than by lightness.
    d.nDays + ' days. Faint dots are single days, solid dots the ' + d.nSlots +
    ' averages. At 08:00 alone the ' + d.nDays + ' days range from ' +
    d.slotMin[d.slots.indexOf(8)] + ' to ' + d.slotMax[d.slots.indexOf(8)] +
    ' pickups, so no model can hope to hit a single day.</p>',

    '<h3>The best straight line</h3>' +
    '<p>Not a line drawn by eye. This is the line with the smallest average ' +
    'squared miss there is, and it has two knobs: where it starts and how ' +
    'steeply it climbs. It runs from about ' + Math.round(d.line.curve[0]) +
    ' pickups at 05:00 to about ' + Math.round(d.line.curve[d.line.curve.length - 1]) +
    ' at 23:00. Demand does not climb steadily all day. It spikes twice.</p>',

    '<h3>What that costs</h3>' +
    '<p>Each dashed stick is one miss. Square them, average them, and that one ' +
    'number, an average squared miss of ' + Plot.commas(d.line.lossPickups2, 0) +
    ', is the height the grasshopper stands on. Its square root says the same ' +
    'thing in pickups.</p>' +
    '<div class="stat-strip">' +
    '<div class="stat"><span class="stat-value">' +
    Plot.commas(d.line.missPickups, 0) + '</span>' +
    '<span class="stat-label">typical miss, pickups</span></div>' +
    '<div class="stat"><span class="stat-value">' +
    Plot.commas(Math.abs(worst.miss), 0) + '</span>' +
    '<span class="stat-label">worst miss, at ' + fmtHour(worst.hour) + '</span></div>' +
    '<div class="stat"><span class="stat-value">2</span>' +
    '<span class="stat-label">knobs</span></div>' +
    '</div>' +
    '<p>The peak is ' + Math.round(d.peakMean) + ' pickups at ' +
    fmtHour(d.peakHour) + '. A typical miss of ' +
    Math.round(d.line.missPickups) + ' is the wrong shape rather than a model ' +
    'that needs tuning: a line has one direction, and the day has four.</p>'
  ];

  var textCards = blocks.map(function (html) {
    var el = document.createElement('div');
    el.className = 'text-card';
    el.innerHTML = html;
    right.appendChild(el);
    return el;
  });

  var foot = document.createElement('div');
  foot.className = 'scene-foot';
  foot.textContent = 'Synthetic data, from the seeded generator of the course notebook. ' +
    'The line is exact least squares, not a run of anything.';
  root.appendChild(foot);

  function render() {
    linePath.attr('display', cursor >= 1 ? null : 'none');
    lineLabel.attr('display', cursor >= 1 ? null : 'none');
    sticks.attr('display', cursor >= 2 ? null : 'none');
    worstMark.attr('display', cursor >= 2 ? null : 'none');
    dayCloud.attr('opacity', cursor >= 2 ? 0.35 : 1);
    textCards.forEach(function (el, i) {
      el.classList.toggle('is-on', i <= cursor);
    });
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
    onEnter: function () { },
    onNextKey: function () { return setCursor(cursor + 1); },
    onPrevKey: function () { return setCursor(cursor - 1); }
  };
};
