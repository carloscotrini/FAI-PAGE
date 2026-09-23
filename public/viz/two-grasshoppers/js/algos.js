/* ===========================================================================
   algos.js : the two runs, and nothing else.

   Every number the page shows about a run is produced here. The same two runs
   are implemented a second time in precompute/reference.py, and
   precompute/check_js.mjs loads THIS file under node and compares the first 30
   iterates of both against that Python, to 1e-9. Keep the two in step: an
   edit here without the same edit there fails the cross check.

   SCENE 1, one grasshopper. Ten houses, one weight w:

     L(w)      = average of (y - w x)^2           an exact parabola in w
     grad L(w) = -2 / n * sum of x (y - w x)
     w        <- w - alpha * grad L(w)            the block 2 rule

   SCENES 2 AND 3, two grasshoppers. Forty stops, u = speed / 10:

     d_hat     = a u^2 + b u
     L(a, b)   = average of (d - a u^2 - b u)^2
     dL/da     = -2 / n * sum of u^2 (d - a u^2 - b u)   the slope under a
     dL/db     = -2 / n * sum of u   (d - a u^2 - b u)   the slope under b
     a        <- a - alpha_a * dL/da                    both at the same time
     b        <- b - alpha_b * dL/db

   dL/da is the slope of the slice of L through the current point along a,
   which is the curve grasshopper a stands on, and dL/db is the same for b.

   No colour, no DOM and no d3 in this file.
   =========================================================================== */

window.Algo = (function () {
  "use strict";

  /* ================================================ scene 1: ten houses === */

  function stats(houses) {
    var n = houses.length;
    var sumXX = 0, sumXY = 0;
    for (var i = 0; i < n; i++) {
      sumXX += houses[i].area * houses[i].area;
      sumXY += houses[i].area * houses[i].price;
    }
    return {
      n: n, sumXX: sumXX, sumXY: sumXY,
      wMin: sumXY / sumXX,              /* the bottom of the parabola */
      curvature: 2 * sumXX / n          /* d2L / dw2, the same at every w */
    };
  }

  function loss(w, houses) {
    var total = 0;
    for (var i = 0; i < houses.length; i++) {
      var m = houses[i].price - w * houses[i].area;
      total += m * m;
    }
    return total / houses.length;
  }

  function grad(w, houses) {
    var total = 0;
    for (var i = 0; i < houses.length; i++) {
      total += houses[i].area * (houses[i].price - w * houses[i].area);
    }
    return -2 / houses.length * total;
  }

  function gdStep(w, n, houses, alpha) {
    var next = w - alpha * grad(w, houses);
    return { n: n, w: next, grad: grad(next, houses), L: loss(next, houses) };
  }

  function gdRun(houses, w0, alpha, steps) {
    var out = [{ n: 0, w: w0, grad: grad(w0, houses), L: loss(w0, houses) }];
    var w = w0;
    for (var k = 1; k <= steps; k++) {
      var row = gdStep(w, k, houses, alpha);
      out.push(row);
      w = row.w;
    }
    return out;
  }

  /* ============================================ scenes 2 and 3: 40 stops === */

  /* The sums the whole bowl is made of, the least squares answer, and the
     Hessian, which is the same at every point because L is quadratic. */
  function stats2(stops) {
    var n = stops.length;
    var s2 = 0, s3 = 0, s4 = 0, s1d = 0, s2d = 0;
    for (var i = 0; i < n; i++) {
      var u = stops[i].speed / 10;
      var uu = u * u;
      s2 += uu;
      s3 += uu * u;
      s4 += uu * uu;
      s1d += u * stops[i].dist;
      s2d += uu * stops[i].dist;
    }
    var det = s4 * s2 - s3 * s3;
    return {
      n: n, s2: s2, s3: s3, s4: s4, s1d: s1d, s2d: s2d,
      aStar: (s2d * s2 - s3 * s1d) / det,
      bStar: (s4 * s1d - s3 * s2d) / det,
      Haa: 2 * s4 / n, Hab: 2 * s3 / n, Hbb: 2 * s2 / n,
      cosine: s3 / Math.sqrt(s4 * s2)
    };
  }

  /* The model's stopping distance at a speed. */
  function predict(a, b, speed) {
    var u = speed / 10;
    return a * u * u + b * u;
  }

  function loss2(a, b, stops) {
    var total = 0;
    for (var i = 0; i < stops.length; i++) {
      var u = stops[i].speed / 10;
      var m = stops[i].dist - a * u * u - b * u;
      total += m * m;
    }
    return total / stops.length;
  }

  /* [dL/da, dL/db]: the slope under grasshopper a and the slope under b. */
  function grad2(a, b, stops) {
    var ga = 0, gb = 0;
    for (var i = 0; i < stops.length; i++) {
      var u = stops[i].speed / 10;
      var m = stops[i].dist - a * u * u - b * u;
      ga += u * u * m;
      gb += u * m;
    }
    var n = stops.length;
    return [-2 / n * ga, -2 / n * gb];
  }

  /* One step: both grasshoppers read their own slope at the same point and
     hop at the same time, each with its own step size. */
  function gd2Step(a, b, n, stops, alphaA, alphaB) {
    var g = grad2(a, b, stops);
    var na = a - alphaA * g[0];
    var nb = b - alphaB * g[1];
    var g2 = grad2(na, nb, stops);
    return {
      n: n, a: na, b: nb, ga: g2[0], gb: g2[1], L: loss2(na, nb, stops),
      move: Math.abs(na - a) + Math.abs(nb - b)
    };
  }

  function gd2Run(stops, a0, b0, alphaA, alphaB, steps) {
    var g0 = grad2(a0, b0, stops);
    var out = [{ n: 0, a: a0, b: b0, ga: g0[0], gb: g0[1], L: loss2(a0, b0, stops), move: null }];
    var a = a0, b = b0;
    for (var k = 1; k <= steps; k++) {
      var row = gd2Step(a, b, k, stops, alphaA, alphaB);
      out.push(row);
      a = row.a;
      b = row.b;
    }
    return out;
  }

  return {
    stats: stats, loss: loss, grad: grad, gdStep: gdStep, gdRun: gdRun,
    stats2: stats2, predict: predict, loss2: loss2, grad2: grad2,
    gd2Step: gd2Step, gd2Run: gd2Run
  };
})();
