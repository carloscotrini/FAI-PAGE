/* Square One: small DOM helpers shared by every page. window.UI.
 *
 * No colour is ever written in JavaScript: every fill and stroke comes from
 * a class in css/. Icons are inline SVG that draw in currentColor. */
(function () {
  'use strict';

  var S = window.SquareOne;
  var SVGNS = 'http://www.w3.org/2000/svg';

  var UI = {
    still: false   // set by the "still" dev flag: every tween jumps to its end
  };

  UI.$ = function (sel, root) { return (root || document).querySelector(sel); };
  UI.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  UI.el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html !== undefined) { e.innerHTML = html; }
    return e;
  };

  UI.svg = function (tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) { e.setAttribute(k, attrs[k]); }
      }
    }
    if (parent) { parent.appendChild(e); }
    return e;
  };

  UI.store = {
    get: function (k) {
      try { return window.localStorage.getItem(k); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem(k, v); } catch (e) { /* private window: fine */ }
    },
    del: function (k) {
      try { window.localStorage.removeItem(k); } catch (e) { /* fine */ }
    }
  };

  // ===== motion =====

  UI.ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  // Calls step(value) on every frame from `from` to `to`, then done().
  // Returns a function that cancels it. With UI.still it jumps to the end.
  UI.tween = function (from, to, ms, step, done) {
    var raf = 0;
    var cancelled = false;
    if (UI.still || !(ms > 0) || from === to) {
      step(to);
      if (done) { done(); }
      return function () {};
    }
    var t0 = null;
    function frame(now) {
      if (cancelled) { return; }
      if (t0 === null) { t0 = now; }
      var p = Math.min(1, (now - t0) / ms);
      step(from + (to - from) * UI.ease(p));
      if (p < 1) {
        raf = window.requestAnimationFrame(frame);
      } else if (done) {
        done();
      }
    }
    raf = window.requestAnimationFrame(frame);
    return function () { cancelled = true; window.cancelAnimationFrame(raf); };
  };

  UI.shake = function (node) {
    node.classList.remove('shake');
    void node.offsetWidth;
    node.classList.add('shake');
    window.setTimeout(function () { node.classList.remove('shake'); }, 500);
  };

  // ===== numbers in cells =====

  // HTML for a table number, split at the decimal point so a column of them
  // lines up on the point. fracCh is how many characters of room the
  // fraction gets (the point included).
  UI.numHTML = function (x, dec, opts) {
    var p = S.numParts(x, dec, opts);
    if (p.bad) { return '<span class="i dim">' + p.text + '</span>'; }
    if (p.sci) {
      return '<span class="i sci">' + p.sign + p.mant + '&thinsp;&times;&thinsp;10<sup>' + p.exp + '</sup></span>';
    }
    return '<span class="i">' + p.sign + p.int + '</span><span class="f">' + (p.frac ? '.' + p.frac : '') + '</span>';
  };

  // The same number as one piece of HTML (no decimal alignment), with a
  // proper superscript when it is written as a power of ten.
  UI.numText = function (x, dec, opts) {
    var p = S.numParts(x, dec, opts);
    if (p.bad) { return p.text; }
    if (p.sci) { return p.sign + p.mant + '&thinsp;&times;&thinsp;10<sup>' + p.exp + '</sup>'; }
    return p.sign + p.int + (p.frac ? '.' + p.frac : '');
  };

  // A number whose leading characters that agree with `truth` are lit up.
  UI.matchHTML = function (text, truth) {
    var n = S.commonPrefix(text, truth);
    // only light up once at least the first digit agrees
    if (n === 0) { return '<span class="rest">' + text + '</span>'; }
    return '<span class="ok">' + text.slice(0, n) + '</span><span class="rest">' + text.slice(n) + '</span>';
  };

  // Ticks the number in `node` from 0 up to x.
  UI.tickNum = function (node, x, dec, opts, ms) {
    if (UI.still || !isFinite(x) || Math.abs(x) >= 1e9) {
      node.innerHTML = UI.numHTML(x, dec, opts);
      return;
    }
    UI.tween(0, x, ms || 480, function (v) {
      node.innerHTML = UI.numHTML(v, dec, opts);
    }, function () {
      node.innerHTML = UI.numHTML(x, dec, opts);
    });
  };

  // ===== icons =====

  function icon(body, vb, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="' + (vb || '0 0 24 24') + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  }
  var ST = ' fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" ';

  UI.icon = {
    up: function (cls) { return icon('<path fill="currentColor" d="M12 2.5 L21.5 12.5 H15.5 V21.5 H8.5 V12.5 H2.5 Z"/>', null, cls); },
    down: function (cls) { return icon('<path fill="currentColor" d="M12 21.5 L21.5 11.5 H15.5 V2.5 H8.5 V11.5 H2.5 Z"/>', null, cls); },
    check: function (cls) { return icon('<path' + ST + 'stroke-width="3" d="M4 12.5 L9.5 18 L20.5 6"/>', null, cls); },
    checkCircle: function (cls) {
      return icon('<circle cx="12" cy="12" r="10.5" fill="currentColor"/><path class="tick" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M7 12.5 L10.5 16 L17.5 8.5"/>', null, cls);
    },
    undo: function () { return icon('<path' + ST + 'stroke-width="2.2" d="M9 7 L4.5 11.5 L9 16"/><path' + ST + 'stroke-width="2.2" d="M5 11.5 H14.5 A5 5 0 0 1 14.5 21.5 H11"/>'); },
    reset: function () { return icon('<path' + ST + 'stroke-width="2.2" d="M20 12 A8 8 0 1 1 17.66 6.34"/><path' + ST + 'stroke-width="2.2" d="M20 3.5 V8.5 H15"/>'); },
    play: function (cls) { return icon('<path fill="currentColor" d="M7 4.5 L20 12 L7 19.5 Z"/>', null, cls); },
    pause: function (cls) { return icon('<rect fill="currentColor" x="6" y="4.5" width="4.2" height="15" rx="1"/><rect fill="currentColor" x="13.8" y="4.5" width="4.2" height="15" rx="1"/>', null, cls); },
    step: function () { return icon('<path fill="currentColor" d="M5 5 L15 12 L5 19 Z"/><rect fill="currentColor" x="16.5" y="5" width="3" height="14" rx="1"/>'); },
    end: function () { return icon('<path fill="currentColor" d="M3 5 L11 12 L3 19 Z"/><path fill="currentColor" d="M11 5 L19 12 L11 19 Z"/><rect fill="currentColor" x="19" y="5" width="2.6" height="14" rx="1"/>'); },
    restart: function () { return icon('<path' + ST + 'stroke-width="2.2" d="M4 12 A8 8 0 1 0 6.34 6.34"/><path' + ST + 'stroke-width="2.2" d="M4 3.5 V8.5 H9"/>'); },
    enter: function () { return icon('<path' + ST + 'stroke-width="2.4" d="M19 5 V12 A2 2 0 0 1 17 14 H6"/><path' + ST + 'stroke-width="2.4" d="M9.5 10 L5.5 14 L9.5 18"/>'); },
    sun: function () {
      return icon('<circle cx="12" cy="12" r="4.2"' + ST + 'stroke-width="2"/><path' + ST + 'stroke-width="2" d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7 7 M17 17 L18.7 18.7 M5.3 18.7 L7 17 M17 7 L18.7 5.3"/>');
    },
    moon: function () { return icon('<path' + ST + 'stroke-width="2" d="M20 14.5 A8.5 8.5 0 1 1 9.5 4 A7 7 0 0 0 20 14.5 Z"/>'); },
    full: function () { return icon('<path' + ST + 'stroke-width="2.2" d="M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15"/>'); },
    trash: function () { return icon('<path' + ST + 'stroke-width="2" d="M4.5 6.5 H19.5 M9.5 6.5 V4.5 H14.5 V6.5 M6.5 6.5 L7.5 20 H16.5 L17.5 6.5"/>'); },
    zigzag: function (cls) { return icon('<path' + ST + 'stroke-width="2.6" d="M3 17 L8 8 L12 15 L16 5 L21 13"/>', null, cls); },
    loop: function (cls) { return icon('<path' + ST + 'stroke-width="2.4" d="M7 7 H17 A5 5 0 0 1 17 17 H7 A5 5 0 0 1 7 7 Z"/><path fill="currentColor" d="M15 4.5 L18.5 7 L15 9.5 Z"/>', null, cls); },
    square: function (cls) {
      return icon('<rect x="3" y="3" width="18" height="18" rx="1"' + ST + 'stroke-width="1.8"/><rect x="3" y="9" width="12" height="12" rx="1" fill="currentColor" opacity="0.45"/>', null, cls);
    },
    bars: function (cls) {
      return icon('<rect x="4" y="8" width="6" height="13" rx="1" fill="currentColor" opacity="0.45"/><rect x="14" y="5" width="6" height="16" rx="1"' + ST + 'stroke-width="1.8"/><path' + ST + 'stroke-width="1.5" stroke-dasharray="2 2" d="M2 5 H22"/>', null, cls);
    },
    code: function (cls) {
      return icon('<path' + ST + 'stroke-width="2" d="M8 7 L3 12 L8 17 M16 7 L21 12 L16 17 M13.5 4.5 L10.5 19.5"/>', null, cls);
    },
    logo: function (cls) {
      return icon('<rect x="2" y="2" width="20" height="20" rx="1.5" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="2" y="9" width="13" height="13" rx="1" fill="currentColor" opacity="0.55"/>', null, cls);
    }
  };

  // The hint cell: arrow, TOO LARGE / TOO SMALL / SOLVED, and the size words.
  UI.hintHTML = function (h, pop) {
    var cls = 'hint ' + h.dir + (pop ? ' pop' : '');
    if (h.dir === 'solved') {
      return '<div class="' + cls + '">' + UI.icon.checkCircle('h-arrow') +
        '<div class="h-text"><div class="h-main">SOLVED</div></div></div>';
    }
    var arrow = h.dir === 'up' ? UI.icon.up('h-arrow') : UI.icon.down('h-arrow');
    return '<div class="' + cls + '" style="--t:' + h.t.toFixed(3) + '">' + arrow +
      '<div class="h-text"><div class="h-main">' + h.label + '</div><div class="h-sub">' + h.words + '</div></div></div>';
  };

  // A few gold sparkles around a point in an SVG, gone after a second.
  UI.sparkles = function (svgRoot, cx, cy, r) {
    if (UI.still) { return; }
    var g = UI.svg('g', { 'class': 'sparkles' }, svgRoot);
    var n = 9;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + 0.3;
      var rr = r * (0.75 + 0.35 * ((i * 7) % 5) / 4);
      var x = cx + Math.cos(a) * rr;
      var y = cy + Math.sin(a) * rr;
      var s = 1.2 + ((i * 3) % 4) * 0.45;
      var d = 'M' + x + ' ' + (y - s) + ' Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y +
        ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) + ' Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y +
        ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + ' Z';
      var p = UI.svg('path', { d: d, 'class': 'sparkle' }, g);
      p.style.animationDelay = (i * 0.07).toFixed(2) + 's';
    }
    window.setTimeout(function () { if (g.parentNode) { g.parentNode.removeChild(g); } }, 2200);
  };

  UI.celebrate = function (node) {
    if (UI.still) { return; }
    node.classList.remove('celebrate');
    void node.offsetWidth;
    node.classList.add('celebrate');
    window.setTimeout(function () { node.classList.remove('celebrate'); }, 1700);
  };

  window.UI = UI;
}());
