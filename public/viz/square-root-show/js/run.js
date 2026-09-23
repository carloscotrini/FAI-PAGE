/* Square One: the machine runs (page 5). window.RunPage.
 *
 * The call line at the top is code, and its three numbers can be clicked and
 * retyped (Enter keeps, Escape cancels). The page runs the canonical code of
 * page 4 with those numbers (SquareOne.runMachine) and plays the rows back one
 * at a time: step | w | w * w | l | alpha * l. The square beside the table
 * grows toward the target; earlier guesses stay as faint outlines. Hovering or
 * focusing a row shows that row in the picture with all of its numbers. At the
 * end the machine's answer stands beside the true square root with the digits
 * they share lit up; a run that blows up or never settles ends as such.
 */
(function () {
  'use strict';

  var S = window.SquareOne;
  var UI = window.UI;
  var Views = window.Views;

  var LIMITS = {
    target: function (v) { return v > 0 && v <= 1e12; },
    w: function (v) { return isFinite(v) && Math.abs(v) <= 1e6; },
    alpha: function (v) { return isFinite(v) && Math.abs(v) <= 10; }
  };

  // Decimals per column. A run that blows up drops them once the numbers are
  // too big for decimals to matter, so a row still fits its columns.
  var FMT = {
    w: [6, {}],
    sq: [4, {}],
    l: [4, { plus: true, sig: 2, maxDec: 6 }],
    upd: [6, { plus: true, sig: 2, maxDec: 8 }]
  };

  function decFor(kind, x) {
    var a = Math.abs(x);
    if (a >= 1e6) { return 0; }
    if (kind === 'w' && a >= 1e4) { return 2; }
    return FMT[kind][0];
  }
  function cell(kind, x) { return UI.numHTML(x, decFor(kind, x), FMT[kind][1]); }
  function text(kind, x) { return UI.numText(x, decFor(kind, x), FMT[kind][1]); }
  function plain(kind, x) { return S.fmt(x, decFor(kind, x), FMT[kind][1]); }

  function RunPage(root, opts) {
    var self = this;
    this.root = root;
    this.opts = opts || {};
    this.params = { target: S.MACHINE.target, w: S.MACHINE.w, alpha: S.MACHINE.alpha };
    this.speed = 1;
    this.shown = 0;
    this.playing = false;
    this.finished = false;
    this.timer = 0;
    this.lastTick = 0;
    this.finishTimer = 0;
    this.hover = -1;
    this.editing = null;

    this.callEl = root.querySelector('.call');
    this.body = root.querySelector('.tbl-body');
    this.info = root.querySelector('.info-card');
    this.panel = root.querySelector('.view-panel');
    this.playBtn = root.querySelector('[data-act="play"]');
    this.view = new Views.SquareView(root.querySelector('.run-view'), {
      id: 'run',
      target: this.params.target,
      geo: { vw: 116, vh: 100, x0: 12, y0: 92, S: 66, lx: 99, ly: 18, lr: 15 }
    });

    this.playBtn.addEventListener('click', function () { self.toggle(); });
    root.querySelector('[data-act="step"]').addEventListener('click', function () { self.pause(); self.step(true); });
    root.querySelector('[data-act="restart"]').addEventListener('click', function () { self.restart(); });
    root.querySelector('[data-act="end"]').addEventListener('click', function () { self.toEnd(); });
    UI.$$('.speed button', root).forEach(function (b) {
      b.addEventListener('click', function () { self.setSpeed(Number(b.getAttribute('data-speed'))); });
    });

    this.body.addEventListener('mouseover', function (e) {
      var r = e.target.closest ? e.target.closest('.tbl-row') : null;
      if (r) {
        var i = Number(r.getAttribute('data-i'));
        if (i !== self.hover) { self.setHover(i); }
      }
    });
    this.body.addEventListener('mouseleave', function () {
      if (!self.body.contains(document.activeElement)) { self.setHover(-1); }
    });
    this.body.addEventListener('focusin', function (e) {
      var r = e.target.closest ? e.target.closest('.tbl-row') : null;
      if (r) { self.setHover(Number(r.getAttribute('data-i'))); }
    });
    this.body.addEventListener('focusout', function (e) {
      if (e.relatedTarget && self.body.contains(e.relatedTarget)) { return; }
      self.setHover(-1);
    });
    this.body.addEventListener('keydown', function (e) {
      var r = e.target.closest ? e.target.closest('.tbl-row') : null;
      if (!r) { return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        var sib = e.key === 'ArrowDown' ? r.nextElementSibling : r.previousElementSibling;
        if (sib) { sib.focus(); }
      }
    });

    this.buildCall();
    this.compute();
    this.restart();
  }

  // ===== the call line =====

  RunPage.prototype.argText = function (name) {
    return String(this.params[name]);
  };

  RunPage.prototype.buildCall = function () {
    var self = this;
    function arg(name) {
      return '<button type="button" class="arg" data-arg="' + name + '" title="Click to change">' + self.argText(name) + '</button>';
    }
    this.callEl.innerHTML =
      '<span class="tk-f">root</span><span class="tk-o">(</span>' + arg('target') +
      '<span class="tk-o">,</span>&nbsp;' + arg('w') +
      '<span class="tk-o">,</span>&nbsp;' + arg('alpha') + '<span class="tk-o">)</span>';
    UI.$$('.arg', this.callEl).forEach(function (b) {
      b.addEventListener('click', function () { self.editArg(b); });
    });
  };

  RunPage.prototype.editArg = function (btn) {
    var self = this;
    var name = btn.getAttribute('data-arg');
    var input = document.createElement('input');
    input.className = 'arg-input';
    input.value = this.argText(name);
    input.setAttribute('inputmode', 'decimal');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-label', name);
    input.style.width = Math.max(3, input.value.length + 1) + 'ch';
    btn.parentNode.replaceChild(input, btn);
    this.editing = input;
    var closed = false;
    function close(commit) {
      if (closed) { return true; }
      if (commit) {
        var p = S.parseGuess(input.value);
        if (!p || !LIMITS[name](p.value)) {
          UI.shake(input);
          return false;
        }
        closed = true;
        var changed = p.value !== self.params[name];
        self.params[name] = p.value;
        self.editing = null;
        self.buildCall();
        if (changed) {
          var b = self.callEl.querySelector('[data-arg="' + name + '"]');
          if (b && !UI.still) { b.classList.add('flash'); }
          self.compute();
          self.restart();
        }
        return true;
      }
      closed = true;
      self.editing = null;
      self.buildCall();
      return true;
    }
    input.addEventListener('input', function () {
      input.style.width = Math.max(3, input.value.length + 1) + 'ch';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); close(true); }
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
    });
    input.addEventListener('blur', function () {
      if (!close(true)) { close(false); }
    });
    input.focus();
    input.select();
  };

  // ===== the run =====

  RunPage.prototype.compute = function () {
    var p = this.params;
    this.run = S.runMachine(p.target, p.w, p.alpha);
    this.truth = Math.sqrt(p.target);
    this.truthStr = S.fmt(this.truth, 7, { keepZeros: true });
    this.view.setTarget(p.target);
    this.lo = S.MACHINE.tol;
    this.hi = Math.max(p.target, this.lo * 100);
  };

  RunPage.prototype.stepMs = function () { return 1000 / this.speed; };

  RunPage.prototype.setSpeed = function (v) {
    var self = this;
    this.speed = v;
    UI.$$('.speed button', this.root).forEach(function (b) {
      b.classList.toggle('on', Number(b.getAttribute('data-speed')) === v);
    });
    // While playing, the step already waiting is re-timed at the new speed,
    // so going from 0.5x to 4x is felt at once rather than a step later.
    if (this.playing) {
      window.clearTimeout(this.timer);
      var left = Math.max(0, this.stepMs() - (Date.now() - this.lastTick));
      this.timer = window.setTimeout(function () { self.tick(); }, left);
    }
  };

  RunPage.prototype.dirOf = function (row) {
    return row.l > 0 ? 'up' : 'down';
  };

  RunPage.prototype.isLast = function (i) { return i === this.run.rows.length - 1; };

  RunPage.prototype.updCell = function (row, i) {
    if (row.upd !== undefined) {
      var t = S.scaleT(Math.abs(row.l), this.lo, this.hi);
      var dir = this.dirOf(row);
      return '<span class="upd ' + dir + '" style="--t:' + t.toFixed(3) + '">' +
        (dir === 'up' ? UI.icon.up() : UI.icon.down()) +
        '<span class="num">' + text('upd', row.upd) + '</span></span>';
    }
    if (this.isLast(i)) {
      if (this.run.status === 'converged') { return '<span class="upd done">' + UI.icon.check() + 'DONE</span>'; }
      // Both ways of failing read DIVERGED: blown up (zigzag) or still
      // bouncing after 1000 steps (loop).
      if (this.run.status === 'diverged') { return '<span class="upd bad">' + UI.icon.zigzag() + 'DIVERGED</span>'; }
      return '<span class="upd bad">' + UI.icon.loop() + 'DIVERGED</span>';
    }
    return '';
  };

  RunPage.prototype.wHTML = function (w) {
    var p = S.numParts(w, decFor('w', w), FMT.w[1]);
    if (p.bad || p.sci) { return cell('w', w); }
    var str = p.sign + p.int + (p.frac ? '.' + p.frac : '');
    var n = S.commonPrefix(str, this.truthStr);
    var intLen = (p.sign + p.int).length;
    // A digit counts as settled only once the whole part before the point
    // agrees, so a lone matching first digit (a 2 in 235.8) stays unlit.
    if (n <= intLen) { n = 0; }
    // light up the digits that already agree with the true root
    function part(str, from) {
      var out = '';
      for (var k = 0; k < str.length; k++) {
        var ch = str.charAt(k);
        out += (from + k < n) ? '<span class="ok">' + ch + '</span>' : ch;
      }
      return out;
    }
    var ip = part(p.sign + p.int, 0);
    var fp = p.frac ? part('.' + p.frac, intLen) : '';
    return '<span class="i">' + ip + '</span><span class="f">' + fp + '</span>';
  };

  RunPage.prototype.rowEl = function (i, animate) {
    var row = this.run.rows[i];
    var last = this.isLast(i);
    var dir = row.upd !== undefined ? this.dirOf(row) : (last && this.run.status === 'converged' ? 'solved' : 'none');
    var el = UI.el('div', 'tbl-row dir-' + dir + (animate ? ' enter' : ''));
    el.setAttribute('data-i', String(i));
    el.setAttribute('tabindex', '0');
    el.innerHTML =
      '<div class="c c-step">' + row.k + '</div>' +
      '<div class="c num c-w">' + this.wHTML(row.w) + '</div>' +
      '<div class="c num c-sq">' + cell('sq', row.sq) + '</div>' +
      '<div class="c num c-l">' + cell('l', row.l) + '</div>' +
      '<div class="c c-upd">' + this.updCell(row, i) + '</div>';
    return el;
  };

  RunPage.prototype.lossText = function (row) {
    return plain('l', row.l);
  };

  RunPage.prototype.restart = function () {
    this.pause();
    window.clearTimeout(this.finishTimer);
    this.shown = 0;
    this.finished = false;
    this.hover = -1;
    this.body.innerHTML = '<button type="button" class="run-empty" data-act="play-empty" title="Play (space)">' + UI.icon.play() + '</button>';
    var self = this;
    this.body.querySelector('.run-empty').addEventListener('click', function () { self.play(); });
    this.view.setSolved(false);
    this.view.clearTrail();
    this.view.set(null, null, {});
    this.showInfo();
  };

  // Reveals the next row. Returns false when there is none left.
  RunPage.prototype.step = function (animate) {
    if (this.shown >= this.run.rows.length) { return false; }
    var i = this.shown;
    var anim = animate && !UI.still;
    this.shown += 1;
    var prev = this.body.querySelector('.tbl-row.cur');
    if (prev) { prev.classList.remove('cur'); }
    var empty = this.body.querySelector('.run-empty');
    if (empty) { empty.parentNode.removeChild(empty); }
    var el = this.rowEl(i, anim);
    el.classList.add('cur');
    this.body.appendChild(el);
    this.body.scrollTop = this.body.scrollHeight;
    var ms = anim ? Math.min(700, this.stepMs() * 0.7) : 0;
    var self = this;
    if (this.hover < 0) {
      this.showRowInView(i, ms);
      this.showInfo();
    }
    // The last row: the result comes once its square has landed. A timer of
    // its own, so a hover in the meantime cannot swallow it.
    if (this.shown >= this.run.rows.length) {
      window.clearTimeout(this.finishTimer);
      if (ms > 0) {
        this.finishTimer = window.setTimeout(function () { self.finish(anim); }, ms);
      } else {
        this.finish(anim);
      }
    }
    return true;
  };

  RunPage.prototype.showRowInView = function (i, ms, done) {
    var row = this.run.rows[i];
    var trail = [];
    var from = Math.max(0, this.shown - 80);
    for (var k = from; k < this.shown; k++) { trail.push(k === i ? null : this.run.rows[k].w); }
    this.view.setTrail(trail, -1);
    var solved = this.finished && this.isLast(i) && this.run.status === 'converged';
    this.view.setSolved(solved);
    this.view.set(row.w, { lossText: this.lossText(row) }, { ms: ms, done: done });
  };

  RunPage.prototype.finish = function (animate) {
    if (this.finished) { return; }
    this.finished = true;
    this.pause();
    if (this.hover < 0) {
      this.showRowInView(this.run.rows.length - 1, 0);
      this.showInfo(animate);
    }
    if (animate && this.run.status === 'converged') {
      this.view.celebrate();
      UI.celebrate(this.info);
      UI.celebrate(this.panel);
    }
  };

  RunPage.prototype.toEnd = function () {
    this.pause();
    if (this.shown >= this.run.rows.length) {
      if (!this.finished) { window.clearTimeout(this.finishTimer); this.finish(!UI.still); }
      return;
    }
    var frag = document.createDocumentFragment();
    var prev = this.body.querySelector('.tbl-row.cur');
    if (prev) { prev.classList.remove('cur'); }
    var empty = this.body.querySelector('.run-empty');
    if (empty) { empty.parentNode.removeChild(empty); }
    for (var i = this.shown; i < this.run.rows.length; i++) {
      frag.appendChild(this.rowEl(i, false));
    }
    this.shown = this.run.rows.length;
    this.body.appendChild(frag);
    var lastEl = this.body.lastElementChild;
    if (lastEl) { lastEl.classList.add('cur'); }
    this.body.scrollTop = this.body.scrollHeight;
    this.finish(!UI.still);
  };

  RunPage.prototype.play = function () {
    if (this.shown >= this.run.rows.length) { this.restart(); }
    this.playing = true;
    this.playBtn.classList.add('playing');
    this.tick(true);
  };

  RunPage.prototype.tick = function () {
    var self = this;
    if (!this.playing) { return; }
    if (!this.step(true) || this.shown >= this.run.rows.length) {
      this.playing = false;
      this.playBtn.classList.remove('playing');
      return;
    }
    this.lastTick = Date.now();
    this.timer = window.setTimeout(function () { self.tick(); }, this.stepMs());
  };

  RunPage.prototype.pause = function () {
    this.playing = false;
    window.clearTimeout(this.timer);
    this.playBtn.classList.remove('playing');
  };

  RunPage.prototype.toggle = function () {
    if (this.playing) { this.pause(); } else { this.play(); }
  };

  // ===== hover =====

  RunPage.prototype.setHover = function (i) {
    UI.$$('.tbl-row.hover', this.body).forEach(function (r) { r.classList.remove('hover'); });
    if (i >= this.shown) { i = -1; }
    this.hover = i;
    if (i >= 0) {
      var el = this.body.querySelector('.tbl-row[data-i="' + i + '"]');
      if (el) { el.classList.add('hover'); }
      this.showRowInView(i, 160);
    } else if (this.shown > 0) {
      this.showRowInView(this.shown - 1, 160);
    }
    this.showInfo();
  };

  // ===== the card under the picture =====

  RunPage.prototype.showInfo = function (pop) {
    if (this.hover >= 0) { this.info.innerHTML = this.readoutHTML(this.hover); return; }
    if (this.shown === 0) {
      this.info.innerHTML = '<div class="teaser"><span>&radic;</span><span>' + S.fmt(this.params.target, 4) +
        '</span><span>=</span><span class="q">?</span></div>';
      return;
    }
    if (this.finished) { this.info.innerHTML = this.resultHTML(pop); return; }
    this.info.innerHTML = this.readoutHTML(this.shown - 1);
  };

  RunPage.prototype.readoutHTML = function (i) {
    var row = this.run.rows[i];
    var last = this.isLast(i);
    var html = '<div class="readout">';
    html += '<div class="rhead"><span>step ' + row.k + '</span></div>';
    html += '<span class="rk">w</span><span class="rv">' + text('w', row.w) + '</span>';
    html += '<span class="rk">w * w</span><span class="rv">' + text('sq', row.sq) + '</span>';
    html += '<span class="rk">l</span><span class="rv">' + text('l', row.l) + '</span>';
    if (row.upd !== undefined) {
      var dir = this.dirOf(row);
      html += '<span class="rk">alpha * l</span><span class="rv ' + dir + '">' +
        (dir === 'up' ? UI.icon.up() : UI.icon.down()) + text('upd', row.upd) + '</span>';
      html += '<span class="rk">next w</span><span class="rv">' + text('w', row.next) + '</span>';
    } else if (last && this.run.status === 'converged') {
      html += '<span class="rk">alpha * l</span><span class="rv gold">' + UI.icon.check() + 'stop</span>';
      html += '<span class="rk">return w</span><span class="rv gold">' + text('w', row.w) + '</span>';
    } else if (last) {
      html += '<span class="rk">alpha * l</span><span class="rv down">' +
        (this.run.status === 'diverged' ? UI.icon.zigzag() : UI.icon.loop()) + 'diverged</span>';
    }
    html += '</div>';
    return html;
  };

  RunPage.prototype.resultHTML = function (pop) {
    var r = this.run;
    var html = '<div class="result' + (pop && !UI.still ? ' pop' : '') + '">';
    var target = S.fmt(this.params.target, 4);
    if (r.status === 'converged') {
      var cmp = S.compareToRoot(r.result, this.params.target);
      html += '<span class="res-k">root(...)</span><span class="res-v">' + UI.matchHTML(cmp.machine, cmp.truth) + '</span>';
      html += '<span class="res-k rad">&radic;' + target + '</span><span class="res-v">' + UI.matchHTML(cmp.truth, cmp.machine) + '</span>';
      html += '<span class="badge good">' + UI.icon.check() + 'Match<span class="steps">' + r.steps + ' steps</span></span>';
    } else {
      html += '<span class="res-k">root(...)</span><span class="res-v"><span class="rest">?</span></span>';
      html += '<span class="res-k rad">&radic;' + target + '</span><span class="res-v">' + S.fmt(this.truth, 7, { keepZeros: true }) + '</span>';
      if (r.status === 'diverged') {
        html += '<span class="badge bad">' + UI.icon.zigzag() + 'Diverged<span class="steps">' + r.steps + ' steps</span></span>';
      } else {
        html += '<span class="badge bad">' + UI.icon.loop() + 'Diverged<span class="steps">' + r.steps + ' steps</span></span>';
      }
    }
    html += '</div>';
    return html;
  };

  // ===== page life =====

  RunPage.prototype.enter = function () {};

  RunPage.prototype.leave = function () {
    this.pause();
    if (this.editing) { this.editing.blur(); }
  };

  // Pressing Run on page 3 or 4: the call printed on page 4, from the top,
  // playing. A number changed earlier on the call line goes back.
  RunPage.prototype.start = function () {
    var m = S.MACHINE;
    var p = this.params;
    if (p.target !== m.target || p.w !== m.w || p.alpha !== m.alpha) {
      this.params = { target: m.target, w: m.w, alpha: m.alpha };
      this.buildCall();
      this.compute();
    }
    this.restart();
    this.play();
  };

  // Dev flags: show the first k+1 rows at once, hover a row, or jump to the end.
  RunPage.prototype.jumpTo = function (k) {
    this.restart();
    var n = Math.min(Math.max(0, k), this.run.rows.length - 1);
    for (var i = 0; i <= n; i++) { this.step(false); }
  };

  window.RunPage = RunPage;
}());
