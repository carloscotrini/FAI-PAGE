/* Square One: a guessing round (pages 1 and 2). window.GuessRound.
 *
 * The host types a guess and presses Enter. A row slides in: the guess, its
 * estimate, the loss, and the hint (TOO SMALL / TOO LARGE, the size in words,
 * the font size growing with the loss). The picture follows the newest guess,
 * or the row under the mouse. The first winning guess gets the flourish and
 * the exact value. Undo takes back the last row; reset clears the round.
 * The table lives in memory, so it is still there when the host comes back.
 */
(function () {
  'use strict';

  var S = window.SquareOne;
  var UI = window.UI;

  // A phone or a tablet: its on-screen keyboard covers half the screen.
  var TOUCH = window.matchMedia ? window.matchMedia('(hover: none) and (pointer: coarse)') : null;
  function onTouchScreen() { return !!(TOUCH && TOUCH.matches); }

  // cfg: {
  //   root        the page's <section>
  //   judge(w)    -> { est, gap, loss, solved, hint }
  //   refuse(w)   -> a nudge string when w is not allowed, else null
  //   estDec(d), lossDec(d)   decimals for the estimate and loss columns,
  //                           given the decimals the host typed
  //   view        a SquareView or a BarsView
  //   viewInfo(row, texts)    -> the info object the view wants
  //   showSolved(rowWins, roundWon)
  //               sets the picture's solved look for the row on show, and
  //               the exact value once the round has been won at all
  //   onSolved(bool)          tells the strip
  // }
  function GuessRound(cfg) {
    var self = this;
    this.cfg = cfg;
    this.root = cfg.root;
    this.rows = [];
    this.won = -1;
    this.shownRow = -1;
    this.form = this.root.querySelector('.guess-bar');
    this.input = this.root.querySelector('.guess-input');
    this.body = this.root.querySelector('.tbl-body');
    this.panel = this.root.querySelector('.view-panel');
    this.nudgeEl = this.root.querySelector('.nudge');
    this.undoBtn = this.root.querySelector('[data-act="undo"]');
    this.resetBtn = this.root.querySelector('[data-act="reset"]');
    this.nudgeTimer = 0;
    this.resetTimer = 0;

    this.form.addEventListener('submit', function (e) {
      e.preventDefault();
      // On a touch screen a guess that was taken puts the keyboard away, so
      // the picture and the new row can be seen.
      if (self.submit(self.input.value, {}) && onTouchScreen()) { self.input.blur(); } else { self.input.focus(); }
    });
    this.input.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && self.input.value === '') {
        e.preventDefault();
        self.undo();
      } else if (e.key === 'Escape') {
        self.input.blur();
      }
    });
    this.undoBtn.addEventListener('click', function () { self.undo(); });
    this.resetBtn.addEventListener('click', function () { self.askReset(); });

    this.hoverRow = -1;
    this.body.addEventListener('mouseover', function (e) {
      var r = e.target.closest ? e.target.closest('.tbl-row') : null;
      if (!r) { return; }
      var i = Number(r.getAttribute('data-i'));
      if (i !== self.hoverRow) { self.hoverRow = i; self.showRow(i, true); }
    });
    this.body.addEventListener('mouseleave', function () {
      self.hoverRow = -1;
      if (!self.body.contains(document.activeElement)) { self.showLatest(); }
    });
    this.body.addEventListener('focusin', function (e) {
      var r = e.target.closest ? e.target.closest('.tbl-row') : null;
      if (r) { self.showRow(Number(r.getAttribute('data-i')), true); }
    });
    this.body.addEventListener('focusout', function (e) {
      if (e.relatedTarget && self.body.contains(e.relatedTarget)) { return; }
      self.showLatest();
    });
    this.body.addEventListener('keydown', function (e) {
      var r = e.target.closest ? e.target.closest('.tbl-row') : null;
      if (!r) { return; }
      // On a phone the rows run newest first (css/phone.css).
      var rev = window.getComputedStyle(self.body).flexDirection === 'column-reverse';
      var sib = null;
      if (e.key === 'ArrowDown') { sib = rev ? r.previousElementSibling : r.nextElementSibling; }
      if (e.key === 'ArrowUp') { sib = rev ? r.nextElementSibling : r.previousElementSibling; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (sib) { sib.focus(); }
      }
    });
    this.refreshButtons();
  }

  GuessRound.prototype.texts = function (row) {
    var c = this.cfg;
    return {
      guess: S.fmt(row.w, row.dec),
      est: S.fmt(row.j.est, c.estDec(row.dec)),
      loss: S.fmt(row.j.loss, c.lossDec(row.dec))
    };
  };

  GuessRound.prototype.reject = function (msg) {
    var self = this;
    UI.shake(this.form);
    if (msg && this.nudgeEl) {
      this.nudgeEl.textContent = msg;
      this.nudgeEl.classList.add('show');
      window.clearTimeout(this.nudgeTimer);
      this.nudgeTimer = window.setTimeout(function () { self.nudgeEl.classList.remove('show'); }, 2200);
    }
  };

  // Returns true when the guess was taken.
  GuessRound.prototype.submit = function (text, opts) {
    opts = opts || {};
    var p = S.parseGuess(text);
    if (!p) { this.reject(''); return false; }
    var msg = this.cfg.refuse(p.value);
    if (msg) { this.reject(msg); return false; }
    if (this.nudgeEl) { this.nudgeEl.classList.remove('show'); }
    var row = { w: p.value, dec: Math.min(p.decimals, 8), j: this.cfg.judge(p.value) };
    this.rows.push(row);
    var i = this.rows.length - 1;
    var animate = !opts.instant && !UI.still;
    this.body.appendChild(this.rowEl(row, i, animate));
    this.body.scrollTop = this.body.scrollHeight;
    this.input.value = '';
    var firstWin = row.j.solved && this.won < 0;
    if (firstWin) { this.won = i; }
    this.showRow(i, false, animate ? 750 : 0);
    if (firstWin) {
      if (animate) {
        var self = this;
        window.setTimeout(function () {
          self.cfg.view.celebrate();
          UI.celebrate(self.panel);
        }, 700);
      }
      this.cfg.onSolved(true);
    }
    this.refreshButtons();
    return true;
  };

  GuessRound.prototype.rowEl = function (row, i, animate) {
    var t = this.texts(row);
    var el = UI.el('div', 'tbl-row dir-' + row.j.hint.dir + (animate ? ' enter' : ''));
    el.setAttribute('data-i', String(i));
    el.setAttribute('tabindex', '0');
    el.innerHTML =
      '<div class="c num c-guess">' + UI.numHTML(row.w, row.dec) + '</div>' +
      '<div class="c num c-est"></div>' +
      '<div class="c num c-loss"></div>' +
      '<div class="c c-upd">' + UI.hintHTML(row.j.hint, animate) + '</div>';
    var est = el.querySelector('.c-est');
    var loss = el.querySelector('.c-loss');
    if (animate) {
      UI.tickNum(est, row.j.est, this.cfg.estDec(row.dec), null, 420);
      UI.tickNum(loss, row.j.loss, this.cfg.lossDec(row.dec), null, 520);
    } else {
      est.innerHTML = UI.numHTML(row.j.est, this.cfg.estDec(row.dec));
      loss.innerHTML = UI.numHTML(row.j.loss, this.cfg.lossDec(row.dec));
    }
    el.setAttribute('aria-label', t.guess + ', ' + row.j.hint.label.toLowerCase() + (row.j.hint.words ? ', ' + row.j.hint.words : ''));
    return el;
  };

  // Shows row i in the picture. hover: it came from the mouse or the keyboard.
  GuessRound.prototype.showRow = function (i, hover, ms) {
    var row = this.rows[i];
    if (!row) { return; }
    UI.$$('.tbl-row.hover', this.body).forEach(function (r) { r.classList.remove('hover'); });
    if (hover) {
      var el = this.body.querySelector('.tbl-row[data-i="' + i + '"]');
      if (el) { el.classList.add('hover'); }
    }
    this.shownRow = i;
    var view = this.cfg.view;
    this.cfg.showSolved(row.j.solved, this.won >= 0);
    var trail = [];
    for (var k = 0; k < this.rows.length; k++) {
      trail.push(k === i ? null : this.rows[k].w);
    }
    view.setTrail(trail, -1);
    view.set(row.w, this.cfg.viewInfo(row, this.texts(row)), { ms: ms === undefined ? 220 : ms });
  };

  GuessRound.prototype.showLatest = function () {
    UI.$$('.tbl-row.hover', this.body).forEach(function (r) { r.classList.remove('hover'); });
    if (this.rows.length) {
      this.showRow(this.rows.length - 1, false, 220);
    } else {
      this.cfg.showSolved(false, this.won >= 0);
      this.cfg.view.setTrail([], -1);
      this.cfg.view.set(null, null, {});
    }
  };

  GuessRound.prototype.undo = function () {
    if (!this.rows.length) { return; }
    var i = this.rows.length - 1;
    this.rows.pop();
    var el = this.body.querySelector('.tbl-row[data-i="' + i + '"]');
    if (el) { el.parentNode.removeChild(el); }
    if (this.won === i) {
      this.won = -1;
      this.cfg.onSolved(false);
    }
    this.showLatest();
    this.refreshButtons();
  };

  GuessRound.prototype.askReset = function () {
    var self = this;
    if (!this.rows.length) { return; }
    if (this.resetBtn.classList.contains('confirm')) {
      window.clearTimeout(this.resetTimer);
      this.resetBtn.classList.remove('confirm');
      this.reset();
      return;
    }
    this.resetBtn.classList.add('confirm');
    this.resetTimer = window.setTimeout(function () { self.resetBtn.classList.remove('confirm'); }, 2600);
  };

  GuessRound.prototype.reset = function () {
    this.rows = [];
    this.body.innerHTML = '';
    if (this.won >= 0) {
      this.won = -1;
      this.cfg.onSolved(false);
    }
    this.showLatest();
    this.refreshButtons();
  };

  GuessRound.prototype.refreshButtons = function () {
    this.undoBtn.disabled = this.rows.length === 0;
    this.resetBtn.disabled = this.rows.length === 0;
  };

  GuessRound.prototype.enter = function () {
    var self = this;
    // On a touch screen the keyboard comes up when the box is tapped.
    if (onTouchScreen()) { return; }
    window.setTimeout(function () {
      try { self.input.focus({ preventScroll: true }); } catch (e) { self.input.focus(); }
    }, 60);
  };

  GuessRound.prototype.leave = function () {
    if (document.activeElement === this.input) { this.input.blur(); }
  };

  window.GuessRound = GuessRound;
}());
