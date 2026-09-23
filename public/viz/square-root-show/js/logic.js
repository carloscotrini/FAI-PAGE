/* Square One: the pure logic of the show.
 *
 * No DOM in this file. It runs in the page (as window.SquareOne) and under
 * node (require('./js/logic.js')), which is how tests/logic.test.js checks it.
 *
 * What lives here: reading a typed guess, writing a number, the hint (which
 * way and how far), the two rounds' scoring, and the machine's run, which is
 * the canonical Python of page 4 written again in JavaScript, operation for
 * operation, so the floating point results are the same bits.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SquareOne = api;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var THIN = '\u2009';   // thin space, the thousands separator on screen
  var MINUS = '\u2212';  // the typographic minus sign

  // ===== The show's fixed numbers =====

  // Round 1. Switzerland is 41 285 km2. A guess wins when |41 285 - w*w| < 0.5,
  // so 203.187 wins and 203.19 does not. The hint sizes run on a log scale
  // from a loss of 1 (smallest type) to 50 000 (largest type).
  var ROUND1 = { target: 41285, win: 0.5, lo: 1, hi: 50000 };

  // Round 2. w = 1 + 1/w. A guess wins when |w - (1 + 1/w)| < 0.001, so
  // 1.618 wins and 1.62 does not.
  var ROUND2 = { win: 0.001, lo: 0.002, hi: 1 };

  // The final. The call printed on page 4, and the guards that stop a run
  // that will never settle.
  var MACHINE = { target: 41285, w: 1, alpha: 0.002, tol: 0.001, maxSteps: 1000, blowUp: 1e7 };

  // Where "a tiny bit" becomes "a bit" and "a bit" becomes "by a lot", on
  // the 0..1 log scale that also sets the font size.
  var BUCKETS = { lot: 0.75, bit: 0.45 };

  var PHI = (1 + Math.sqrt(5)) / 2;

  // Page 4 prints exactly this. It follows the block 1 deck's frame "The
  // algorithm": no step budget, the test in the while condition, no comments.
  // tests/logic.test.js checks it character for character and runs it in
  // Python when python3 is on the machine.
  var CANONICAL_CODE = [
    'def root(target, w, alpha):',
    '    l = target - w * w',
    '    while abs(l) > 0.001:',
    '        w = w + alpha * l',
    '        l = target - w * w',
    '    return w',
    '',
    'root(41285, 1, 0.002)'
  ].join('\n');

  var WORDS = {
    up: { lot: 'increase by a lot', bit: 'increase a bit', tiny: 'increase a tiny bit' },
    down: { lot: 'decrease by a lot', bit: 'decrease a bit', tiny: 'decrease a tiny bit' }
  };

  // ===== Reading a guess =====

  // Accepts "203.19", "203,19" (Swiss decimal comma), "41 285", "41'285",
  // "+5", ".5" and "1e3". Returns { value, decimals } or null for garbage.
  // decimals counts the digits after the point once trailing zeros are gone,
  // and is what the tables use to decide how many digits to show.
  function parseGuess(raw) {
    if (raw === null || raw === undefined) { return null; }
    var s = String(raw);
    s = s.replace(/[\s\u00A0\u2009\u202F'\u2019_]/g, '');
    s = s.replace(/\u2212/g, '-');
    if (s === '' || s.length > 24) { return null; }
    var commas = s.split(',').length - 1;
    var hasDot = s.indexOf('.') >= 0;
    if (commas > 0 && hasDot) {
      s = s.replace(/,/g, '');
    } else if (commas === 1) {
      s = s.replace(',', '.');
    } else if (commas > 1) {
      return null;
    }
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d{1,3})?$/.test(s)) { return null; }
    var v = Number(s);
    if (!isFinite(v)) { return null; }
    var decimals;
    if (/[eE]/.test(s)) {
      decimals = decimalsOf(v);
    } else {
      var m = /\.(\d*)$/.exec(s);
      decimals = m ? m[1].replace(/0+$/, '').length : 0;
    }
    return { value: v, decimals: decimals };
  }

  function decimalsOf(v) {
    var s = String(Math.abs(v));
    if (/e/i.test(s)) { return 10; }
    var i = s.indexOf('.');
    return i < 0 ? 0 : Math.min(10, s.length - i - 1);
  }

  // ===== Writing a number =====

  function groupThousands(digits) {
    if (digits.length < 4) { return digits; }
    var out = '';
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 === 0) { out += THIN; }
      out += digits.charAt(i);
    }
    return out;
  }

  // Splits x into the pieces a table cell needs:
  //   { sign, int, frac }            for ordinary numbers, rounded to dec
  //                                  decimals (trailing zeros trimmed unless
  //                                  opts.keepZeros), thousands grouped
  //   { sci: true, sign, mant, exp } from 1e9 up, as mant x 10^exp
  //   { bad: true, text }            for NaN and the infinities
  // opts.plus puts a "+" on positive numbers. opts.sig asks for at least
  // that many significant digits on numbers below 1, up to opts.maxDec.
  function numParts(x, dec, opts) {
    opts = opts || {};
    if (typeof x !== 'number' || !isFinite(x)) {
      return { bad: true, text: x !== x ? 'NaN' : (x > 0 ? '+inf' : MINUS + 'inf') };
    }
    var a = Math.abs(x);
    var d = dec;
    if (opts.sig && a > 0 && a < 1) {
      var need = Math.ceil(-Math.log(a) / Math.LN10) + opts.sig - 1;
      d = Math.max(d, Math.min(need, opts.maxDec || 8));
    }
    if (a >= 1e9) {
      var e = Math.floor(Math.log(a) / Math.LN10);
      var mant = a / Math.pow(10, e);
      if (Number(mant.toFixed(1)) >= 10) { mant = mant / 10; e += 1; }
      return { sci: true, sign: x < 0 ? MINUS : (opts.plus ? '+' : ''), mant: mant.toFixed(1), exp: e };
    }
    var s = a.toFixed(d);
    var parts = s.split('.');
    var ip = parts[0];
    var fp = parts[1] || '';
    if (!opts.keepZeros) { fp = fp.replace(/0+$/, ''); }
    var zero = /^[0.]*$/.test(ip + fp);
    var sign = '';
    if (x < 0 && !zero) { sign = MINUS; } else if (opts.plus && !zero) { sign = '+'; }
    return { sign: sign, int: groupThousands(ip), frac: fp };
  }

  // Plain text version of numParts, for places that are not table cells.
  function fmt(x, dec, opts) {
    var p = numParts(x, dec, opts);
    if (p.bad) { return p.text; }
    if (p.sci) { return p.sign + p.mant + ' x 10^' + p.exp; }
    return p.sign + p.int + (p.frac ? '.' + p.frac : '');
  }

  // ===== The hint =====

  // Where |loss| sits between lo and hi on a log scale, clamped to 0..1.
  function scaleT(absLoss, lo, hi) {
    if (!(absLoss > 0)) { return 0; }
    var t = (Math.log(absLoss) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
    if (t !== t) { return 0; }
    return t < 0 ? 0 : (t > 1 ? 1 : t);
  }

  function bucketOf(t) {
    if (t >= BUCKETS.lot) { return 'lot'; }
    if (t >= BUCKETS.bit) { return 'bit'; }
    return 'tiny';
  }

  // move > 0: the guess has to go up (it is too small).
  // move < 0: the guess has to come down (it is too large).
  // cal: { win, lo, hi }.
  function hint(move, absLoss, cal) {
    if (absLoss < cal.win) {
      return { dir: 'solved', label: 'SOLVED', words: '', t: 1, size: 'none' };
    }
    var t = scaleT(absLoss, cal.lo, cal.hi);
    var size = bucketOf(t);
    var dir = move > 0 ? 'up' : 'down';
    return {
      dir: dir,
      label: dir === 'up' ? 'TOO SMALL' : 'TOO LARGE',
      words: WORDS[dir][size],
      t: t,
      size: size
    };
  }

  // ===== The two rounds =====

  function judgeSquare(w, target, cal) {
    cal = cal || ROUND1;
    target = target === undefined ? cal.target : target;
    var est = w * w;
    var gap = target - est;
    var loss = Math.abs(gap);
    return { w: w, est: est, gap: gap, loss: loss, solved: loss < cal.win, hint: hint(gap, loss, cal) };
  }

  function judgeGolden(w, cal) {
    cal = cal || ROUND2;
    var est = 1 + 1 / w;
    var gap = est - w;
    var loss = Math.abs(gap);
    return { w: w, est: est, gap: gap, loss: loss, solved: loss < cal.win, hint: hint(gap, loss, cal) };
  }

  // ===== The machine =====

  // The canonical code of page 4, line for line:
  //   def root(target, w, alpha):
  //       l = target - w * w
  //       while abs(l) > 0.001:
  //           w = w + alpha * l
  //           l = target - w * w
  //       return w
  // plus three guards Python does not have: stop when w stops being a
  // finite number, when |w| passes 1e7, or after 1000 steps.
  //
  // rows[k] = { k, w, sq, l, upd, next }: the k-th guess, its square, its
  // signed miss, and (when the loop goes round again) the update alpha * l
  // and the next guess. status is 'converged', 'diverged' or 'stalled'.
  function runMachine(target, w, alpha, opts) {
    opts = opts || {};
    var tol = opts.tol === undefined ? MACHINE.tol : opts.tol;
    var maxSteps = opts.maxSteps === undefined ? MACHINE.maxSteps : opts.maxSteps;
    var blowUp = opts.blowUp === undefined ? MACHINE.blowUp : opts.blowUp;
    var out = { target: target, w0: w, alpha: alpha, rows: [], status: 'converged', steps: 0, result: null };
    if (!isFinite(target) || !isFinite(w) || !isFinite(alpha)) {
      out.status = 'diverged';
      return out;
    }
    var l = target - w * w;
    var k = 0;
    out.rows.push({ k: 0, w: w, sq: w * w, l: l });
    while (Math.abs(l) > tol) {
      if (k >= maxSteps) { out.status = 'stalled'; break; }
      var upd = alpha * l;
      var nw = w + upd;
      var last = out.rows[out.rows.length - 1];
      last.upd = upd;
      last.next = nw;
      w = nw;
      l = target - w * w;
      k += 1;
      if (!isFinite(w) || !isFinite(l)) {
        out.status = 'diverged';
        break;
      }
      out.rows.push({ k: k, w: w, sq: w * w, l: l });
      if (Math.abs(w) > blowUp) {
        out.status = 'diverged';
        break;
      }
    }
    out.steps = k;
    if (out.status === 'converged') { out.result = w; }
    return out;
  }

  // ===== Digits that agree =====

  // How many leading characters two strings share.
  function commonPrefix(a, b) {
    var n = 0;
    while (n < a.length && n < b.length && a.charAt(n) === b.charAt(n)) { n += 1; }
    return n;
  }

  // The machine's answer is shown to 6 decimals and the true square root to
  // 7, and the digits they share are the ones lit up. For the canonical call
  // that is 203.187105 against 203.1871059: every digit of the machine's
  // answer matches.
  function compareToRoot(result, target) {
    var truth = Math.sqrt(target);
    var a = fmt(result, 6, { keepZeros: true });
    var b = fmt(truth, 7, { keepZeros: true });
    return { machine: a, truth: b, match: commonPrefix(a, b), truthValue: truth };
  }

  return {
    THIN: THIN,
    MINUS: MINUS,
    ROUND1: ROUND1,
    ROUND2: ROUND2,
    MACHINE: MACHINE,
    BUCKETS: BUCKETS,
    PHI: PHI,
    CANONICAL_CODE: CANONICAL_CODE,
    WORDS: WORDS,
    parseGuess: parseGuess,
    decimalsOf: decimalsOf,
    groupThousands: groupThousands,
    numParts: numParts,
    fmt: fmt,
    scaleT: scaleT,
    bucketOf: bucketOf,
    hint: hint,
    judgeSquare: judgeSquare,
    judgeGolden: judgeGolden,
    runMachine: runMachine,
    commonPrefix: commonPrefix,
    compareToRoot: compareToRoot
  };
}));
