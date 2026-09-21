/* Scene 0. The title card: the shape the rest of the page is about.
 *
 * It shows the data and nothing fitted to it. What a straight line does with
 * it is the next scene, and handing that over here would spend the question
 * before the room has been asked it.
 *
 * Globals used: d3, Plot, Net, window.NNVIZ. */

window.scenes.scene0 = function (root) {
  'use strict';

  var d = window.NNVIZ.data;

  var wrap = document.createElement('div');
  wrap.className = 'title-card';
  root.appendChild(wrap);

  var head = document.createElement('div');
  head.className = 'title-text';
  head.innerHTML =
    '<h1>The curve and the landscape</h1>' +
    '<p class="title-lede">Bikes leave a dock in a shape nobody designed. ' +
    'A straight line cannot follow it. A network with enough units can, and ' +
    'the way it gets there is the grasshopper game from this morning, ' +
    'played on a landscape with more directions than anyone can draw.</p>';
  wrap.appendChild(head);

  var panelBox = document.createElement('div');
  panelBox.className = 'title-panel panel';
  wrap.appendChild(panelBox);

  var title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = 'Bikes taken out of one dock, ' + d.nDays + ' days, every half hour';
  panelBox.appendChild(title);

  var panel = Plot.dayPanel(panelBox, { width: 760, height: 272 });
  Plot.drawDays(panel, { r: 1.5 });
  Plot.drawMeans(panel, { r: 2.6 });

  // Both labels sit in the empty air the day leaves between its two rushes,
  // so neither lands on a dot at any window size.
  panel.layers.top.append('text').attr('class', 'note-text')
    .attr('x', panel.x(9.4)).attr('y', panel.y(196))
    .attr('text-anchor', 'start')
    .text('the morning rush');
  panel.layers.top.append('text').attr('class', 'note-text')
    .attr('x', panel.x(19.4)).attr('y', panel.y(196))
    .attr('text-anchor', 'start')
    .text('the evening rush');

  var foot = document.createElement('div');
  foot.className = 'title-foot small muted';
  var check = Net.selfCheck();
  foot.innerHTML =
    '<span>' + Plot.commas(d.nRows) + ' counts, ' + d.nDays + ' days, ' +
    d.nSlots + ' half hour slots from 05:00 to 23:00. ' +
    '<strong>Synthetic data</strong>, from the seeded generator of the ETH ' +
    'course notebook it is borrowed from; see README.md.</span>' +
    '<span>Every curve on these pages is rebuilt in the browser from the ' +
    'weights of the step being shown: ' + Plot.commas(check.snapshots) +
    ' of them, worst disagreement with the stored loss ' +
    check.worstLossGap.toExponential(0) + '.</span>';
  wrap.appendChild(foot);

  return {};
};
