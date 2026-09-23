/* ===========================================================================
   algos.js : the rule, and nothing else.

   Every number the page shows about a run is produced here. The same rule is
   implemented a second time in precompute/reference.py, and
   precompute/check_js.mjs loads THIS file under node and compares it against
   that Python, draw by draw and round by round, to 1e-9. Keep the two in step:
   an edit here without the same edit there fails the cross check.

   Notation, taken from the block 1 deck robbins-monro/slides.tex, section
   "Estimating house prices":

     x       the living area of a house, in square metres
     y       its price, in francs
     w       the one weight, francs per square metre; w * x is the estimate
     l       the signed miss on one house, y - w * x
     l_bar   the average miss over all ten, which is the deck's verdict()
     alpha   the step size, ONE number fixed before the run starts

   Robbins-Monro, one house per round, exactly as the code panel prints it:

     l_bar = verdict(x, y, w)
     while abs(l_bar) > TOL:
         i = next_house()          a house drawn at random
         l = y[i] - w * x[i]
         w = w + alpha * l
         l_bar = verdict(x, y, w)

   No colour, no DOM and no d3 in this file.
   =========================================================================== */

window.Algo = (function () {
  "use strict";

  /* The sums the page is built on. */
  function stats(houses) {
    var n = houses.length;
    var sumX = 0, sumY = 0;
    for (var i = 0; i < n; i++) {
      sumX += houses[i].area;
      sumY += houses[i].price;
    }
    return {
      n: n,
      sumX: sumX, sumY: sumY,
      meanX: sumX / n,
      meanY: sumY / n,
      /* where the average miss is zero, which is where the walk goes */
      wAvgZero: sumY / sumX
    };
  }

  /* l = y - w * x for one house. */
  function miss(w, h) {
    return h.price - w * h.area;
  }

  /* l_bar, the average miss over every house, summed in the order the code
     panel's verdict() sums it. */
  function verdict(w, houses) {
    var total = 0;
    for (var i = 0; i < houses.length; i++) total = total + miss(w, houses[i]);
    return total / houses.length;
  }

  /* next_house(): a house index from 0 to count - 1, uniformly at random.

     mulberry32, a 32 bit generator small enough to write twice. It is used
     rather than a linear congruential generator because Reset asks for seed
     + 1, and a linear generator started on neighbouring seeds opens on houses
     in a visible progression: 5, 6, 7, 7, 8, 9, 10, 1 for seeds 2026 to 2033.
     Every operation below is exact in 32 bit integer arithmetic, so
     precompute/reference.py reproduces the same houses to the last draw. */
  function draws(seed, count) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      var r = (t ^ (t >>> 14)) >>> 0;
      return Math.floor(r / 4294967296 * count);
    };
  }

  /* One round on house i. */
  function rmStep(w, i, houses, alpha) {
    var l = miss(w, houses[i]);
    var next = w + alpha * l;
    return { house: i, l: l, w: next, lBar: verdict(next, houses) };
  }

  /* The whole run, until the verdict is inside the tolerance or the page's
     cap is reached. rows[0] is the start; rows[n] is the state after round n.
     stopped is true when the loop ended by itself. */
  function rmRun(houses, w0, alpha, tol, seed, cap) {
    var nextHouse = draws(seed, houses.length);
    var w = w0;
    var lBar = verdict(w, houses);
    var rows = [{ n: 0, house: null, l: null, w: w, lBar: lBar }];
    var n = 0;
    while (Math.abs(lBar) > tol && n < cap) {
      var s = rmStep(w, nextHouse(), houses, alpha);
      n = n + 1;
      w = s.w;
      lBar = s.lBar;
      rows.push({ n: n, house: s.house, l: s.l, w: w, lBar: lBar });
    }
    return { rows: rows, stopped: Math.abs(lBar) <= tol };
  }

  return {
    stats: stats,
    miss: miss,
    verdict: verdict,
    draws: draws,
    rmStep: rmStep,
    rmRun: rmRun
  };
})();
