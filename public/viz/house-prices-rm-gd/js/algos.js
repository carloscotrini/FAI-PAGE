/* ===========================================================================
   algos.js : the two rules, and nothing else.

   Every number the page shows about a run is produced here. The same two rules
   are implemented a second time in precompute/reference.py, and
   precompute/check_js.mjs loads THIS file under node and compares the first 30
   iterates of both runs against that Python, to 1e-9. Keep the two in step: an
   edit here without the same edit there fails the cross check.

   Notation, taken from the block 1 deck robbins-monro/slides.tex, section
   "Estimating house prices":

     x       the living area of a house, in square metres
     y       its price, in francs
     y_hat   the estimate, w * x                      (slides.tex line 700)
     l       the signed miss, y - y_hat               (slides.tex line 702)
     w       the one weight, francs per square metre
     alpha   the step size

   Robbins-Monro, one house per round:

     w := w + alpha * l        the update             (slides.tex line 704)
     alpha_n = c / n           the step shrinks       (slides.tex lines 446, 447)

   Gradient descent, all ten houses per round, on the average squared miss:

     L(w) = average of (y - w x) squared
     w := w - alpha * grad L(w)                       (gd-slides.tex line 999)

   L is an exact parabola in w, so its gradient is exact here:

     grad L(w) = -2 / n * sum of x * (y - w x)
     L''       = 2 * mean(x squared), a constant

   No colour, no DOM and no d3 in this file.
   =========================================================================== */

window.Algo = (function () {
  "use strict";

  /* The sums the whole page is built on. Both answers come out of these. */
  function stats(houses) {
    var n = houses.length;
    var sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    for (var i = 0; i < n; i++) {
      sumX += houses[i].area;
      sumY += houses[i].price;
      sumXX += houses[i].area * houses[i].area;
      sumXY += houses[i].area * houses[i].price;
    }
    return {
      n: n,
      sumX: sumX, sumY: sumY, sumXX: sumXX, sumXY: sumXY,
      meanX: sumX / n,
      meanXX: sumXX / n,
      /* where the average miss is zero, which is where Robbins-Monro settles */
      wAvgZero: sumY / sumX,
      /* the bottom of the parabola, which is where gradient descent settles */
      wMin: sumXY / sumXX,
      /* the second derivative of L, the same number at every w */
      curvature: 2 * sumXX / n
    };
  }

  /* l = y - y_hat for one house. */
  function miss(w, h) {
    return h.price - w * h.area;
  }

  /* l_bar, the average signed miss over every house: the deck's verdict(). */
  function meanMiss(w, houses) {
    var total = 0;
    for (var i = 0; i < houses.length; i++) total += miss(w, houses[i]);
    return total / houses.length;
  }

  /* L(w), the average squared miss. */
  function loss(w, houses) {
    var total = 0;
    for (var i = 0; i < houses.length; i++) {
      var l = miss(w, houses[i]);
      total += l * l;
    }
    return total / houses.length;
  }

  /* grad L(w). Negative means the ground falls away to the right. */
  function grad(w, houses) {
    var total = 0;
    for (var i = 0; i < houses.length; i++) {
      total += houses[i].area * miss(w, houses[i]);
    }
    return -2 / houses.length * total;
  }

  /* ====================================================== Robbins-Monro ==== */

  /* One round. `n` is the round about to be taken, counting from 1, so the
     step size is c / n and the house is the n-th entry of the visit order. */
  function rmStep(w, n, houses, order, c) {
    var houseIndex = order[(n - 1) % order.length];
    var h = houses[houseIndex];
    var alpha = c / n;
    var l = miss(w, h);
    return { n: n, house: houseIndex, alpha: alpha, l: l, w: w + alpha * l };
  }

  function rmRun(houses, order, w0, c, steps) {
    var out = [{ n: 0, house: null, alpha: null, l: null, w: w0 }];
    var w = w0;
    for (var k = 1; k <= steps; k++) {
      var row = rmStep(w, k, houses, order, c);
      out.push(row);
      w = row.w;
    }
    return out;
  }

  /* ==================================================== gradient descent ==== */

  function gdStep(w, n, houses, alpha) {
    var g = grad(w, houses);
    var next = w - alpha * g;
    return { n: n, w: next, grad: grad(next, houses), L: loss(next, houses), usedGrad: g };
  }

  function gdRun(houses, w0, alpha, steps) {
    var out = [{ n: 0, w: w0, grad: grad(w0, houses), L: loss(w0, houses) }];
    var w = w0;
    for (var k = 1; k <= steps; k++) {
      var row = gdStep(w, k, houses, alpha);
      out.push({ n: row.n, w: row.w, grad: row.grad, L: row.L });
      w = row.w;
    }
    return out;
  }

  /* The factor the distance to the bottom is multiplied by, once per step.
     Between 0 and 1 the walk comes down one side; between -1 and 0 it crosses
     the bottom every step and still closes in; past -1 it leaves. */
  function errorFactor(alpha, st) {
    return 1 - alpha * st.curvature;
  }

  return {
    stats: stats,
    miss: miss,
    meanMiss: meanMiss,
    loss: loss,
    grad: grad,
    rmStep: rmStep,
    rmRun: rmRun,
    gdStep: gdStep,
    gdRun: gdRun,
    errorFactor: errorFactor
  };
})();
