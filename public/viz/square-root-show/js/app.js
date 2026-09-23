/* Square One: the show itself. Wires the six pages together.
 *
 *   0 title card     1 round 1: the square     2 round 2: the golden number
 *   3 live coding    4 the code                5 the run
 *
 * Nothing is locked: the strip, the keys and the buttons go anywhere.
 *   PageDown / PageUp (and presenter clickers)  always next / previous
 *   Right / Left arrows   next / previous, when no box or editor is being
 *                         typed in (an empty guess box counts as not typing)
 *   0 to 5                jump to that page, when not typing
 *   t   night or daylight studio        f   full screen
 *   Escape                leave a box or the editor
 *   Rounds: Enter checks a guess, Ctrl+Z (or Cmd+Z) takes the last one back
 *   Page 4: Enter runs.  Page 3: Ctrl+Enter runs.
 *   Page 5: space play or pause, s one step, r restart, e to the end
 *
 * Dev flags ride on the hash (see README.md), for example
 *   #page=1&guesses=100,300,200,205,203,203.2,203.187
 *   #page=5&step=7&hover=4      #page=5&done      #theme=light      #still
 */
(function () {
  'use strict';

  var S = window.SquareOne;
  var UI = window.UI;
  var Views = window.Views;

  var LAST = 5;
  var KEY_THEME = 'squareone.theme.v1';
  var root = document.documentElement;

  // ===== flags =====

  function parseHash() {
    var out = {};
    var h = (window.location.hash || '').replace(/^#/, '');
    h.split('&').forEach(function (kv) {
      if (!kv) { return; }
      var i = kv.indexOf('=');
      try {
        if (i < 0) { out[decodeURIComponent(kv)] = true; } else { out[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); }
      } catch (e) { /* a malformed flag is ignored */ }
    });
    return out;
  }
  var flags = parseHash();
  if (flags.still) {
    UI.still = true;
    root.classList.add('still');
  }

  // ===== icons into their slots =====

  UI.$$('[data-icon]').forEach(function (slot) {
    var name = slot.getAttribute('data-icon');
    var cls = slot.classList.contains('rc-icon-slot') ? 'rc-icon' : '';
    if (UI.icon[name]) { slot.innerHTML = UI.icon[name](cls); }
  });
  UI.$$('.rc-check-slot').forEach(function (slot) { slot.innerHTML = UI.icon.check('rc-check'); });
  UI.$$('.tab-check-slot').forEach(function (slot) { slot.innerHTML = UI.icon.check('tab-check'); });
  UI.$('.brand-logo').innerHTML = UI.icon.logo();

  // ===== theme =====

  var themeBtn = UI.$('#theme-btn');
  function setTheme(t, save) {
    root.setAttribute('data-theme', t);
    themeBtn.innerHTML = t === 'dark' ? UI.icon.sun() : UI.icon.moon();
    if (save) { UI.store.set(KEY_THEME, t); }
  }
  function toggleTheme() {
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  }
  var startTheme = flags.theme === 'light' || flags.theme === 'dark' ? flags.theme : (UI.store.get(KEY_THEME) || 'dark');
  setTheme(startTheme === 'light' ? 'light' : 'dark', false);
  themeBtn.addEventListener('click', toggleTheme);

  function toggleFull() {
    try {
      if (document.fullscreenElement) { document.exitFullscreen(); } else { root.requestFullscreen(); }
    } catch (e) { /* not allowed here: fine */ }
  }
  UI.$('#full-btn').innerHTML = UI.icon.full();
  UI.$('#full-btn').addEventListener('click', toggleFull);

  // ===== round 1: the square =====

  var EXACT1 = S.fmt(Math.sqrt(S.ROUND1.target), 7) + '... km';
  var r1view = new Views.SquareView(UI.$('#round1 .r1-view'), { id: 'r1', target: S.ROUND1.target, question: true });
  var round1 = new window.GuessRound({
    root: UI.$('#round1'),
    judge: function (w) { return S.judgeSquare(w, S.ROUND1.target, S.ROUND1); },
    refuse: function (w) { return w < 0 ? 'Positive numbers only' : null; },
    estDec: function (d) { return Math.min(2 * d, 6); },
    lossDec: function (d) { return Math.min(2 * d, 6); },
    view: r1view,
    viewInfo: function (row, t) { return { lossText: t.loss }; },
    showSolved: function (rowWins, won) {
      r1view.setSolved(rowWins);
      r1view.setSides(won ? EXACT1 : '?', won);
    },
    onSolved: function (on) { markSolved(1, on); }
  });

  // ===== round 2: the golden number =====

  var r2view = new Views.BarsView(UI.$('#round2 .r2-view'), { id: 'r2' });
  var round2 = new window.GuessRound({
    root: UI.$('#round2'),
    judge: function (w) { return S.judgeGolden(w, S.ROUND2); },
    refuse: function (w) { return w > 0 ? null : 'Positive numbers only'; },
    estDec: function () { return 6; },
    lossDec: function () { return 6; },
    view: r2view,
    viewInfo: function (row, t) { return { lossText: t.loss, aText: t.guess, bText: t.est }; },
    showSolved: function (rowWins, won) {
      r2view.setSolved(rowWins);
      r2view.setReveal(won ? '1.6180339887...' : null, 'THE GOLDEN RATIO');
    },
    onSolved: function (on) { markSolved(2, on); }
  });

  function markSolved(n, on) {
    UI.$$('.tab[data-go="' + n + '"], #card-' + n).forEach(function (el) { el.classList.toggle('solved', !!on); });
  }

  // ===== the final =====

  var runPage = new window.RunPage(UI.$('#run'));

  var editor = new window.LiveEditor(UI.$('#editor'), {
    onRun: function () { runFromCode(); }
  });

  (function fillCode() {
    var lines = S.CANONICAL_CODE.split('\n');
    UI.$('#code-card').innerHTML = lines.map(function (line, i) {
      return '<span class="ln" style="animation-delay:' + (0.08 + i * 0.07).toFixed(2) + 's">' +
        (line === '' ? ' ' : window.PyHighlight.highlight(line)) + '</span>';
    }).join('');
  }());

  function runFromCode() {
    go(5);
    runPage.start();
  }
  UI.$('.page-code [data-act="run"]').addEventListener('click', runFromCode);

  // ===== pages =====

  var pages = UI.$$('.page');
  var cur = -1;
  // The first time round 1 comes up, its number ticks up like a scoreboard.
  var bigTicked = false;
  var round1Enter = round1.enter;
  round1.enter = function () {
    round1Enter.call(round1);
    if (bigTicked) { return; }
    bigTicked = true;
    var node = UI.$('#r1-big');
    UI.tween(0, S.ROUND1.target, 1100, function (v) { node.textContent = S.fmt(Math.round(v), 0); });
  };

  var ctl = {
    0: {},
    1: round1,
    2: round2,
    3: { enter: function () { editor.focus(); }, leave: function () { editor.leave(); } },
    4: {},
    5: runPage
  };

  function go(n) {
    n = Math.max(0, Math.min(LAST, n));
    if (n === cur) { return; }
    if (cur >= 0 && ctl[cur].leave) { ctl[cur].leave(); }
    var active = document.activeElement;
    if (active && active !== document.body && active.blur && !pages[n].contains(active)) { active.blur(); }
    pages.forEach(function (p) { p.classList.toggle('on', Number(p.getAttribute('data-page')) === n); });
    cur = n;
    UI.$$('[data-go]', UI.$('#strip')).forEach(function (b) {
      b.classList.toggle('on', Number(b.getAttribute('data-go')) === n);
    });
    if (ctl[n].enter) { ctl[n].enter(); }
    try { window.history.replaceState(null, '', '#page=' + n); } catch (e) { /* file:// quirks: fine */ }
  }

  UI.$$('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { go(Number(b.getAttribute('data-go'))); });
  });

  // ===== keys =====

  function isTyping(el) {
    if (!el || el === document.body) { return false; }
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable === true;
  }

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    var typing = isTyping(t);
    var k = e.key;

    if (k === 'PageDown' || k === 'PageUp') {
      e.preventDefault();
      go(cur + (k === 'PageDown' ? 1 : -1));
      return;
    }
    if (e.defaultPrevented) { return; }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (k === 'z' || k === 'Z') && !typing && (cur === 1 || cur === 2)) {
      e.preventDefault();
      ctl[cur].undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) { return; }

    if (typing) {
      var emptyGuess = t.classList && t.classList.contains('guess-input') && t.value === '';
      if (emptyGuess && (k === 'ArrowRight' || k === 'ArrowLeft')) {
        e.preventDefault();
        go(cur + (k === 'ArrowRight' ? 1 : -1));
      }
      return;
    }

    if (k === 'ArrowRight') { e.preventDefault(); go(cur + 1); return; }
    if (k === 'ArrowLeft') { e.preventDefault(); go(cur - 1); return; }
    if (/^[0-5]$/.test(k)) { e.preventDefault(); go(Number(k)); return; }
    if (k === 'Home') { e.preventDefault(); go(0); return; }
    if (k === 'End') { e.preventDefault(); go(LAST); return; }
    if (k === 't' || k === 'T') { e.preventDefault(); toggleTheme(); return; }
    if (k === 'f' || k === 'F') { e.preventDefault(); toggleFull(); return; }
    if (k === 'Escape') { if (t && t.blur) { t.blur(); } return; }

    if (cur === 4 && k === 'Enter' && t.tagName !== 'BUTTON') {
      e.preventDefault();
      runFromCode();
      return;
    }
    if (cur === 5) {
      if (k === ' ' || k === 'Spacebar') { e.preventDefault(); runPage.toggle(); return; }
      if (k === 's' || k === 'S') { e.preventDefault(); runPage.pause(); runPage.step(true); return; }
      if (k === 'r' || k === 'R') { e.preventDefault(); runPage.restart(); return; }
      if (k === 'e' || k === 'E') { e.preventDefault(); runPage.toEnd(); return; }
    }
  });

  window.addEventListener('hashchange', function () {
    var f = parseHash();
    if (f.page !== undefined) { go(Number(f.page)); }
  });

  // ===== the cursor hides when the mouse rests, for projection =====

  var idleTimer = 0;
  function wake() {
    document.body.classList.remove('idle');
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(function () { document.body.classList.add('idle'); }, 2600);
  }
  document.addEventListener('mousemove', wake);
  document.addEventListener('mousedown', wake);

  // ===== boot, with the dev flags =====

  function seed(round, list) {
    String(list).split(/[,;|]/).forEach(function (g) {
      if (g.trim() !== '') { round.submit(g, { instant: true }); }
    });
  }

  var startPage = flags.page !== undefined ? Number(flags.page) : 0;
  if (!(startPage >= 0 && startPage <= LAST)) { startPage = 0; }

  if (flags.g1) { seed(round1, flags.g1); }
  if (flags.g2) { seed(round2, flags.g2); }
  if (flags.guesses) {
    if (startPage === 2) { seed(round2, flags.guesses); } else { seed(round1, flags.guesses); }
  }

  var p5 = false;
  ['target', 'w', 'alpha'].forEach(function (name) {
    if (flags[name] !== undefined) {
      var v = S.parseGuess(flags[name]);
      if (v) { runPage.params[name] = v.value; p5 = true; }
    }
  });
  if (p5) { runPage.buildCall(); runPage.compute(); runPage.restart(); }
  if (flags.speed) { runPage.setSpeed(Number(flags.speed)); }
  if (flags.code) { editor.setText(S.CANONICAL_CODE, false); }
  if (flags.size !== undefined) { editor.setSizeIndex(Number(flags.size)); }

  go(startPage);

  if (startPage === 5) {
    if (flags.done) {
      runPage.toEnd();
    } else if (flags.step !== undefined) {
      runPage.jumpTo(Number(flags.step));
    }
    if (flags.hover !== undefined) { runPage.setHover(Number(flags.hover)); }
    if (flags.play) { runPage.play(); }
  }
  if ((startPage === 1 || startPage === 2) && ctl[startPage]) {
    var round = ctl[startPage];
    if (flags.hover !== undefined) { round.showRow(Number(flags.hover), true, 0); }
    if (flags['try'] !== undefined) {
      round.input.value = flags['try'];
      round.submit(flags['try'], { instant: true });
      round.input.value = flags['try'];
    }
    if (flags.typed !== undefined) { round.input.value = flags.typed; }
  }

  window.SquareOneShow = { go: go, round1: round1, round2: round2, runPage: runPage, editor: editor };
}());
