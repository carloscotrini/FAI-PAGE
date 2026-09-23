/* Square One: the two pictures. window.Views.
 *
 * SquareView: the target square, fixed, with a guess square drawn from the
 *   same corner at the same scale. The gap (guess too small) is shaded blue
 *   with dots, the overhang (guess too large) vermillion with hatching, and
 *   the shaded area IS the loss |target - w*w|. A thin arrow runs from the
 *   guess's corner to the target's corner: the correction still to make.
 *   Used by round 1 and by the run page.
 *
 * BarsView: round 2. Two bars side by side, w and 1 + 1/w, that meet when
 *   w = 1 + 1/w. Moving w up pulls 1 + 1/w down, so they close in from both
 *   sides.
 *
 * Both draw in a viewBox about 100 units high (the run page's square view is
 * a little wider) and take every colour from css/round.css.
 */
(function () {
  'use strict';

  var UI = window.UI;
  var SO = window.SquareOne;

  function patterns(svg, id) {
    var defs = UI.svg('defs', null, svg);
    var dots = UI.svg('pattern', { id: id + '-dots', width: 2.4, height: 2.4, patternUnits: 'userSpaceOnUse' }, defs);
    UI.svg('circle', { cx: 1.2, cy: 1.2, r: 0.42, 'class': 'pat-dot' }, dots);
    var hatch = UI.svg('pattern', {
      id: id + '-hatch', width: 2.4, height: 2.4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'
    }, defs);
    UI.svg('line', { x1: 0, y1: 0, x2: 0, y2: 2.4, 'class': 'pat-line' }, hatch);
  }

  // Writes a number into an SVG <text>. A power of ten written by
  // SquareOne.fmt as "2.4 x 10^19" gets a real times sign and a raised exponent.
  function setNumText(el, text) {
    while (el.firstChild) { el.removeChild(el.firstChild); }
    var i = text.indexOf('^');
    if (i < 0) { el.textContent = text; return; }
    el.appendChild(document.createTextNode(text.slice(0, i).replace(' x ', ' ' + '\u00D7' + ' ')));
    var sup = UI.svg('tspan', { 'baseline-shift': 'super', 'font-size': '70%' }, el);
    sup.textContent = text.slice(i + 1);
  }

  function arrowPath(x1, y1, x2, y2, head) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) { return ''; }
    var ux = dx / len;
    var uy = dy / len;
    var hx = x2 - ux * head;
    var hy = y2 - uy * head;
    var px = -uy * head * 0.6;
    var py = ux * head * 0.6;
    return 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 +
      ' M' + (hx + px) + ' ' + (hy + py) + ' L' + x2 + ' ' + y2 + ' L' + (hx - px) + ' ' + (hy - py);
  }

  // ===== SquareView =====

  // opts: { id, target, question (label the sides "?"),
  //         geo: { vw, vh, x0, y0, S, lx, ly, lr } }
  // x0, y0 is the shared bottom-left corner, S the target's side, and
  // lx, ly, lr place the corner magnifier.
  function SquareView(svg, opts) {
    this.svg = svg;
    this.opts = opts || {};
    this.id = this.opts.id || 'sq';
    var geo = this.opts.geo || { vw: 100, vh: 100, x0: 11, y0: 90, S: 58, lx: 84, ly: 15, lr: 13.5 };
    this.geo = geo;
    this.x0 = geo.x0;
    this.y0 = geo.y0;
    this.S = geo.S;
    this.cur = null;       // the side (in viewBox units) currently drawn
    this.cancel = null;
    this.info = null;
    this.solved = false;
    svg.setAttribute('viewBox', '0 0 ' + geo.vw + ' ' + geo.vh);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    patterns(svg, this.id);
    var x0 = this.x0;
    var y0 = this.y0;
    var S = this.S;
    this.gFloor = UI.svg('rect', { x: x0, y: y0 - S, width: S, height: S, 'class': 'sq-floor' }, svg);
    this.gTrail = UI.svg('g', { 'class': 'sq-trail' }, svg);
    this.gGuess = UI.svg('rect', { 'class': 'sq-guess', x: x0, y: y0, width: 0, height: 0 }, svg);
    this.gDiff = UI.svg('g', { 'class': 'sq-diff' }, svg);
    this.gDiffFill = UI.svg('path', { 'class': 'fill', d: '' }, this.gDiff);
    this.gDiffPat = UI.svg('path', { 'class': 'pat', d: '' }, this.gDiff);
    this.gTarget = UI.svg('rect', { x: x0, y: y0 - S, width: S, height: S, 'class': 'sq-target thick' }, svg);
    this.gArrow = UI.svg('path', { 'class': 'sq-arrow', d: '' }, svg);
    this.gLoss = UI.svg('text', { 'class': 'sq-label loss', x: 0, y: 0 }, svg);
    this.gSideB = UI.svg('text', { 'class': 'sq-side', x: x0 + S / 2, y: y0 + 4.6 }, svg);
    this.gSideL = UI.svg('text', { 'class': 'sq-side', x: x0 - 4.6, y: y0 - S / 2 }, svg);
    this.buildLoupe();
    this.gBadge = null;
    this.setTarget(this.opts.target || 1);
    this.setSides(this.opts.question ? '?' : '', false);
    this.draw(null);
  }

  // The corner magnifier: when the gap is too thin to see, a round lens
  // beside the target's corner shows that corner blown up by a power of ten.
  SquareView.prototype.buildLoupe = function () {
    var geo = this.geo;
    var cid = this.id + '-lens';
    var defs = this.svg.querySelector('defs');
    var clip = UI.svg('clipPath', { id: cid }, defs);
    UI.svg('circle', { cx: geo.lx, cy: geo.ly, r: geo.lr }, clip);
    this.gLoupe = UI.svg('g', { 'class': 'loupe', visibility: 'hidden' }, this.svg);
    this.gLead = UI.svg('line', { 'class': 'loupe-lead', x1: 0, y1: 0, x2: 0, y2: 0 }, this.gLoupe);
    UI.svg('circle', { 'class': 'loupe-bg', cx: geo.lx, cy: geo.ly, r: geo.lr }, this.gLoupe);
    var inner = UI.svg('g', { 'clip-path': 'url(#' + cid + ')' }, this.gLoupe);
    this.gLDiff = UI.svg('g', { 'class': 'sq-diff' }, inner);
    this.gLDiffFill = UI.svg('path', { 'class': 'fill', d: '' }, this.gLDiff);
    this.gLDiffPat = UI.svg('path', { 'class': 'pat', d: '' }, this.gLDiff);
    this.gLGuess = UI.svg('path', { 'class': 'loupe-guess', d: '' }, inner);
    this.gLTarget = UI.svg('path', { 'class': 'loupe-target', d: '' }, inner);
    UI.svg('circle', { 'class': 'loupe-ring', cx: geo.lx, cy: geo.ly, r: geo.lr }, this.gLoupe);
    this.gLText = UI.svg('text', { 'class': 'loupe-x', x: geo.lx, y: geo.ly + geo.lr + 4.2 }, this.gLoupe);
  };

  SquareView.prototype.drawLoupe = function (g, show) {
    var geo = this.geo;
    var gap = g === null ? 0 : g - this.S;
    var mag = Math.abs(gap);
    if (!show || this.solved || g === null || !(mag > 1e-12) || mag >= 1.2) {
      this.gLoupe.setAttribute('visibility', 'hidden');
      return;
    }
    var k = Math.ceil(Math.log(1.2 / mag) / Math.LN10);
    var m = Math.pow(10, k);
    var d = gap * m;          // the corner's offset inside the lens
    var cx = geo.lx;
    var cy = geo.ly;
    var r = geo.lr + 1;
    var dir = gap < 0 ? 'up' : 'down';
    this.gLTarget.setAttribute('d', 'M' + (cx - r) + ' ' + cy + ' H' + cx + ' V' + (cy + r));
    this.gLGuess.setAttribute('d', 'M' + (cx - r) + ' ' + (cy - d) + ' H' + (cx + d) + ' V' + (cy + r));
    var poly = 'M' + (cx - r) + ' ' + cy + ' H' + cx + ' V' + (cy + r) + ' H' + (cx + d) +
      ' V' + (cy - d) + ' H' + (cx - r) + ' Z';
    this.gLDiffFill.setAttribute('d', poly);
    this.gLDiffPat.setAttribute('d', poly);
    this.gLDiffPat.setAttribute('fill', 'url(#' + this.id + (dir === 'up' ? '-dots' : '-hatch') + ')');
    this.gLDiff.setAttribute('class', 'sq-diff ' + dir);
    // a thin line from the lens to the corner it magnifies
    var tx = this.x0 + this.S;
    var ty = this.y0 - this.S;
    var vx = tx - cx;
    var vy = ty - cy;
    var len = Math.sqrt(vx * vx + vy * vy) || 1;
    this.gLead.setAttribute('x1', cx + vx / len * geo.lr);
    this.gLead.setAttribute('y1', cy + vy / len * geo.lr);
    this.gLead.setAttribute('x2', tx);
    this.gLead.setAttribute('y2', ty);
    this.gLText.textContent = '\u00D7' + SO.fmt(m, 0);
    this.gLoupe.setAttribute('visibility', 'visible');
  };

  SquareView.prototype.setTarget = function (target) {
    this.target = target;
    this.rootT = Math.sqrt(Math.max(target, 0));
    this.clearTrail();
  };

  SquareView.prototype.side = function (w) {
    if (w === null || w === undefined || !isFinite(w) || !(this.rootT > 0)) { return null; }
    return Math.abs(w) / this.rootT * this.S;
  };

  // The labels on the target's sides: "?" until the round is won, then the
  // exact side length in gold along the bottom.
  SquareView.prototype.setSides = function (text, gold) {
    this.gSideB.textContent = text;
    this.gSideL.textContent = gold ? '' : text;
    this.gSideB.setAttribute('class', 'sq-side' + (gold ? ' solved' : ''));
    this.gSideL.setAttribute('class', 'sq-side' + (gold ? ' solved' : ''));
  };

  // Draws a guess square of side g (viewBox units, null for none).
  SquareView.prototype.draw = function (g, showLabel) {
    var x0 = this.x0;
    var y0 = this.y0;
    var S = this.S;
    var geo = this.geo;
    this.drawLoupe(g, showLabel);
    if (g === null) {
      this.gGuess.setAttribute('width', 0);
      this.gGuess.setAttribute('height', 0);
      this.gDiffFill.setAttribute('d', '');
      this.gDiffPat.setAttribute('d', '');
      this.gArrow.setAttribute('d', '');
      this.gLoss.textContent = '';
      return;
    }
    var gd = Math.min(g, 1000);
    this.gGuess.setAttribute('x', x0);
    this.gGuess.setAttribute('y', y0 - gd);
    this.gGuess.setAttribute('width', gd);
    this.gGuess.setAttribute('height', gd);
    var a = Math.min(gd, S);
    var b = Math.max(gd, S);
    var d = 'M' + x0 + ' ' + (y0 - b) + ' H' + (x0 + b) + ' V' + y0 + ' H' + (x0 + a) + ' V' + (y0 - a) + ' H' + x0 + ' Z';
    var dir = gd < S ? 'up' : 'down';
    var thick = b - a;
    if (this.solved || thick < 0.05) { d = ''; }
    this.gDiffFill.setAttribute('d', d);
    this.gDiffPat.setAttribute('d', d);
    this.gDiffPat.setAttribute('fill', 'url(#' + this.id + (dir === 'up' ? '-dots' : '-hatch') + ')');
    this.gDiff.setAttribute('class', 'sq-diff ' + dir);
    // the correction still to make: from the guess's corner to the target's
    if (!this.solved && thick >= 5) {
      var off = 1.6;
      var sgn = dir === 'up' ? 1 : -1;
      var sx = x0 + gd + sgn * off;
      var sy = y0 - gd - sgn * off;
      var ex = x0 + S - sgn * off;
      var ey = y0 - S + sgn * off;
      this.gArrow.setAttribute('d', arrowPath(sx, sy, ex, ey, 2.4));
      this.gArrow.setAttribute('class', 'sq-arrow ' + dir);
    } else {
      this.gArrow.setAttribute('d', '');
    }
    // the loss, written in its own shaded band when the band is thick enough
    if (showLabel && this.info && this.info.lossText && !this.solved && thick >= 7.5) {
      var top = y0 - b;
      var cy = Math.max(top + thick / 2, 4);
      var cx = x0 + (dir === 'up' ? S : Math.min(gd, geo.vw - x0)) * 0.32;
      this.gLoss.setAttribute('x', cx);
      this.gLoss.setAttribute('y', cy);
      this.gLoss.setAttribute('class', 'sq-label loss ' + dir);
      setNumText(this.gLoss, this.info.lossText);
    } else {
      this.gLoss.textContent = '';
    }
  };

  // info: { lossText } or null. opts.ms animates from the drawn size.
  SquareView.prototype.set = function (w, info, opts) {
    opts = opts || {};
    var self = this;
    var g = this.side(w);
    this.info = info || null;
    if (this.cancel) { this.cancel(); this.cancel = null; }
    this.gGuess.setAttribute('class', 'sq-guess' + (this.solved ? ' solved' : ''));
    if (g === null) {
      this.cur = null;
      this.draw(null);
      return;
    }
    var from = this.cur === null ? 0 : this.cur;
    var ms = opts.ms || 0;
    this.cancel = UI.tween(from, g, ms, function (v) {
      self.cur = v;
      self.draw(v, false);
    }, function () {
      self.cur = g;
      self.draw(g, true);
      self.cancel = null;
      if (opts.done) { opts.done(); }
    });
  };

  SquareView.prototype.clearTrail = function () {
    while (this.gTrail.firstChild) { this.gTrail.removeChild(this.gTrail.firstChild); }
  };

  // Faint outlines of earlier guesses. hi: index to emphasise, or -1.
  SquareView.prototype.setTrail = function (ws, hi) {
    this.clearTrail();
    var drawn = [];
    for (var i = 0; i < ws.length; i++) {
      var g = this.side(ws[i]);
      if (g === null || g < 0.2) { continue; }
      g = Math.min(g, 1000);
      // One outline per size: a run that bounces between two values would
      // otherwise stack dozens of faint outlines into two solid ones.
      var seen = false;
      for (var k = 0; k < drawn.length; k++) {
        if (Math.abs(drawn[k] - g) < 0.05) { seen = true; break; }
      }
      if (seen && i !== hi) { continue; }
      drawn.push(g);
      UI.svg('rect', {
        x: this.x0, y: this.y0 - g, width: g, height: g, 'class': i === hi ? 'hi' : ''
      }, this.gTrail);
    }
  };

  // The gold look and the check badge, for a winning guess on show.
  SquareView.prototype.setSolved = function (on) {
    on = !!on;
    if (on === this.solved) { return; }
    this.solved = on;
    this.gGuess.setAttribute('class', 'sq-guess' + (on ? ' solved' : ''));
    if (this.gBadge) { this.gBadge.parentNode.removeChild(this.gBadge); this.gBadge = null; }
    if (on) {
      var cx = this.x0 + this.S / 2;
      var cy = this.y0 - this.S / 2;
      this.gBadge = UI.svg('g', { 'class': 'sq-badge' }, this.svg);
      UI.svg('circle', { cx: cx, cy: cy, r: 6.2 }, this.gBadge);
      UI.svg('path', { d: 'M' + (cx - 2.8) + ' ' + (cy + 0.2) + ' L' + (cx - 0.7) + ' ' + (cy + 2.4) + ' L' + (cx + 3.1) + ' ' + (cy - 2.3) }, this.gBadge);
    }
    this.draw(this.cur, true);
  };

  SquareView.prototype.celebrate = function () {
    UI.sparkles(this.svg, this.x0 + this.S / 2, this.y0 - this.S / 2, this.S * 0.62);
  };

  // ===== BarsView =====

  function BarsView(svg, opts) {
    this.svg = svg;
    this.opts = opts || {};
    this.id = this.opts.id || 'bars';
    this.base = 86;
    this.unit = 23;
    this.ax = [20, 42];
    this.bx = [58, 80];
    this.cur = null;       // [w, 1 + 1/w] currently drawn
    this.cancel = null;
    this.info = null;
    this.solved = false;
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    patterns(svg, this.id);
    UI.svg('line', { x1: 8, x2: 92, y1: this.base, y2: this.base, 'class': 'bar-base' }, svg);
    this.gA = UI.svg('rect', { 'class': 'bar-guess', x: this.ax[0], width: this.ax[1] - this.ax[0], y: this.base, height: 0 }, svg);
    this.gB = UI.svg('rect', { 'class': 'bar-target', x: this.bx[0], width: this.bx[1] - this.bx[0], y: this.base, height: 0 }, svg);
    this.gDiff = UI.svg('g', { 'class': 'sq-diff' }, svg);
    this.gDiffFill = UI.svg('rect', { 'class': 'fill', x: this.ax[0], width: this.ax[1] - this.ax[0], y: 0, height: 0 }, this.gDiff);
    this.gDiffPat = UI.svg('rect', { 'class': 'pat', x: this.ax[0], width: this.ax[1] - this.ax[0], y: 0, height: 0 }, this.gDiff);
    this.gLevel = UI.svg('line', { 'class': 'bar-level', x1: 12, x2: 88, y1: 0, y2: 0 }, svg);
    this.gArrow = UI.svg('path', { 'class': 'sq-arrow', d: '' }, svg);
    this.gLoss = UI.svg('text', { 'class': 'sq-label loss', x: 10.5, y: 0 }, svg);
    this.gValA = UI.svg('text', { 'class': 'bar-val', x: (this.ax[0] + this.ax[1]) / 2, y: 0 }, svg);
    this.gValB = UI.svg('text', { 'class': 'bar-val', x: (this.bx[0] + this.bx[1]) / 2, y: 0 }, svg);
    this.gEq = UI.svg('text', { 'class': 'bar-eq', x: 50, y: 0 }, svg);
    var nameA = UI.svg('text', { 'class': 'bar-name', x: (this.ax[0] + this.ax[1]) / 2, y: this.base + 5.5 }, svg);
    nameA.textContent = 'w';
    var nameB = UI.svg('text', { 'class': 'bar-name', x: (this.bx[0] + this.bx[1]) / 2, y: this.base + 5.5 }, svg);
    nameB.textContent = '1 + 1/w';
    this.gReveal = null;
    this.draw(null);
  }

  BarsView.prototype.y = function (v) { return this.base - v * this.unit; };

  BarsView.prototype.draw = function (pair, showLabel) {
    var ax = this.ax;
    if (pair === null) {
      this.gA.setAttribute('height', 0);
      this.gB.setAttribute('height', 0);
      this.gDiffFill.setAttribute('height', 0);
      this.gDiffPat.setAttribute('height', 0);
      this.gLevel.setAttribute('visibility', 'hidden');
      this.gArrow.setAttribute('d', '');
      this.gLoss.textContent = '';
      this.gValA.textContent = '';
      this.gValB.textContent = '';
      this.gEq.textContent = '';
      return;
    }
    var a = Math.max(0, Math.min(pair[0], 4.5));
    var b = Math.max(0, Math.min(pair[1], 4.5));
    var ya = this.y(a);
    var yb = this.y(b);
    this.gA.setAttribute('y', ya);
    this.gA.setAttribute('height', this.base - ya);
    this.gB.setAttribute('y', yb);
    this.gB.setAttribute('height', this.base - yb);
    this.gA.setAttribute('class', 'bar-guess' + (this.solved ? ' solved' : ''));
    this.gB.setAttribute('class', 'bar-target' + (this.solved ? ' solved' : ''));
    this.gLevel.setAttribute('visibility', 'visible');
    this.gLevel.setAttribute('y1', yb);
    this.gLevel.setAttribute('y2', yb);
    var top = Math.min(ya, yb);
    var h = Math.abs(ya - yb);
    var dir = a < b ? 'up' : 'down';
    if (this.solved || h < 0.05) { h = 0; }
    this.gDiffFill.setAttribute('y', top);
    this.gDiffFill.setAttribute('height', h);
    this.gDiffPat.setAttribute('y', top);
    this.gDiffPat.setAttribute('height', h);
    this.gDiffPat.setAttribute('fill', 'url(#' + this.id + (dir === 'up' ? '-dots' : '-hatch') + ')');
    this.gDiff.setAttribute('class', 'sq-diff ' + dir);
    var mid = (ax[0] + ax[1]) / 2;
    if (!this.solved && h >= 6) {
      var y1 = dir === 'up' ? ya - 1.4 : ya + 1.4;
      var y2 = dir === 'up' ? yb + 1.4 : yb - 1.4;
      this.gArrow.setAttribute('d', arrowPath(mid, y1, mid, y2, 2.4));
      this.gArrow.setAttribute('class', 'sq-arrow ' + dir);
    } else {
      this.gArrow.setAttribute('d', '');
    }
    var info = this.info;
    if (showLabel && info && info.lossText && !this.solved && h >= 3) {
      this.gLoss.setAttribute('y', top + h / 2);
      this.gLoss.setAttribute('class', 'sq-label loss ' + dir);
      this.gLoss.textContent = info.lossText;
    } else {
      this.gLoss.textContent = '';
    }
    if (showLabel && info) {
      // When w is too small its gap (and the arrow) sit right on top of the
      // w bar, so w is written just inside the bar's top instead of above it.
      var ay = ya - 2.2;
      var inside = false;
      if (!this.solved && dir === 'up' && h >= 2.2) {
        if (this.base - ya >= 7) { ay = ya + 4.4; inside = true; } else { ay = top - 2.2; }
      }
      this.gValA.setAttribute('y', Math.max(ay, 4));
      this.gValA.setAttribute('class', 'bar-val' + (inside ? ' in' : ''));
      this.gValB.setAttribute('y', Math.max(yb - 2.2, 4));
      this.gValA.textContent = info.aText || '';
      this.gValB.textContent = info.bText || '';
    } else {
      this.gValA.textContent = '';
      this.gValB.textContent = '';
    }
    if (this.solved) {
      this.gEq.setAttribute('y', (ya + this.base) / 2);
      this.gEq.textContent = '=';
    } else {
      this.gEq.textContent = '';
    }
  };

  BarsView.prototype.pairOf = function (w) {
    if (w === null || w === undefined || !(w > 0)) { return null; }
    return [w, 1 + 1 / w];
  };

  BarsView.prototype.set = function (w, info, opts) {
    opts = opts || {};
    var self = this;
    var p = this.pairOf(w);
    this.info = info || null;
    if (this.cancel) { this.cancel(); this.cancel = null; }
    if (p === null) {
      this.cur = null;
      this.draw(null);
      return;
    }
    var from = this.cur || [0, 0];
    var ms = opts.ms || 0;
    this.cancel = UI.tween(0, 1, ms, function (k) {
      self.cur = [from[0] + (p[0] - from[0]) * k, from[1] + (p[1] - from[1]) * k];
      self.draw(self.cur, false);
    }, function () {
      self.cur = p;
      self.draw(p, true);
      self.cancel = null;
      if (opts.done) { opts.done(); }
    });
  };

  BarsView.prototype.setTrail = function () { /* the bars keep no trail */ };

  // Both bars gold and an equals sign between them, for a winning guess.
  BarsView.prototype.setSolved = function (on) {
    on = !!on;
    if (on === this.solved) { return; }
    this.solved = on;
    this.draw(this.cur, true);
  };

  // The exact value above the bars, once the round has been won at all.
  BarsView.prototype.setReveal = function (big, small) {
    if (!big) {
      if (this.gReveal) { this.gReveal.parentNode.removeChild(this.gReveal); this.gReveal = null; }
      return;
    }
    if (this.gReveal) { return; }
    this.gReveal = UI.svg('g', { 'class': 'reveal' }, this.svg);
    var t1 = UI.svg('text', { 'class': 'reveal-big', x: 50, y: 11 }, this.gReveal);
    t1.textContent = big;
    var t2 = UI.svg('text', { 'class': 'reveal-small', x: 50, y: 20 }, this.gReveal);
    t2.textContent = small || '';
  };

  BarsView.prototype.celebrate = function () {
    UI.sparkles(this.svg, 50, this.y(1.618) - 2, 30);
  };

  window.Views = { SquareView: SquareView, BarsView: BarsView };
}());
