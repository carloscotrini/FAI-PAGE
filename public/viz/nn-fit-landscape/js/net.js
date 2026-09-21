/* The network, in the browser.
 *
 * The page replays a run that precompute/build_data.py already made. What it
 * replays is the WEIGHTS, not a picture: every curve on screen is evaluated
 * here, from the 3p + 1 numbers of the snapshot being shown. That is what
 * makes the replay checkable, and Net.selfCheck() checks it: it recomputes the
 * loss of every shipped snapshot from the shipped weights and compares it with
 * the loss build_data.py stored beside them.
 *
 * The network, with p units in one hidden layer:
 *
 *     guess(hour) = c + sum over units j of  v_j * max(0, w_j * x + b_j)
 *     x = (hour - 14) / 9            so 05:00 to 23:00 becomes -1 to 1
 *     pickups = 100 * guess          so the network works in hundreds
 *
 * theta = [w_1..w_p, b_1..b_p, v_1..v_p, c], which is 3p + 1 numbers.
 *
 * Globals used: window.NNVIZ (the payload). Nothing here draws or writes CSS.
 */

window.Net = (function () {
  'use strict';

  function xOf(hour) {
    var d = window.NNVIZ.data;
    return (hour - d.hourMid) / d.hourHalf;
  }

  /** Scaled output of the network for one scaled input. */
  function value(theta, p, x) {
    var total = theta[3 * p];
    for (var j = 0; j < p; j++) {
      var z = theta[j] * x + theta[p + j];
      if (z > 0) total += theta[2 * p + j] * z;
    }
    return total;
  }

  /** Pickups predicted at each hour of `hours`. */
  function curve(theta, p, hours) {
    var d = window.NNVIZ.data;
    var out = new Array(hours.length);
    for (var i = 0; i < hours.length; i++) {
      out[i] = value(theta, p, xOf(hours[i])) * d.yScale;
    }
    return out;
  }

  /** The average squared miss, in the scaled units the run was driven in. */
  function loss(theta, p) {
    var d = window.NNVIZ.data;
    var total = 0;
    for (var i = 0; i < d.slots.length; i++) {
      var r = value(theta, p, xOf(d.slots[i])) - d.means[i] / d.yScale;
      total += r * r;
    }
    return total / d.slots.length;
  }

  /** The same number in pickups squared, which is what the page prints. */
  function lossPickups2(theta, p) {
    var d = window.NNVIZ.data;
    return loss(theta, p) * d.yScale * d.yScale;
  }

  function missPickups(lossScaled) {
    return window.NNVIZ.data.yScale * Math.sqrt(lossScaled);
  }

  /* ==================================================== the replay check */

  var report = null;

  /**
   * Recompute what the payload claims, from the payload's own weights.
   *
   * The weights ship rounded to 7 significant digits, so a loss rebuilt from
   * them lands within about 1e-4 of the stored one on the widest network. The
   * tolerance below is that rounding, not the arithmetic: a real disagreement
   * is orders of magnitude larger.
   */
  function selfCheck() {
    if (report) return report;
    var data = window.NNVIZ.data;
    var runs = window.NNVIZ.runs;
    var worstLoss = 0, worstCurve = 0, snapshots = 0, curves = 0;
    var widths = Object.keys(runs).map(Number).sort(function (a, b) { return a - b; });

    widths.forEach(function (p) {
      var run = runs[String(p)];
      run.weights.forEach(function (theta, i) {
        var got = loss(theta, p);
        var want = run.snapLoss[i];
        worstLoss = Math.max(worstLoss, Math.abs(got - want) / Math.max(want, 1e-12));
        snapshots++;
      });
      Object.keys(run.curveCheck).forEach(function (i) {
        var got = curve(run.weights[+i], p, data.curveHours);
        var want = run.curveCheck[i];
        for (var k = 0; k < want.length; k++) {
          worstCurve = Math.max(worstCurve, Math.abs(got[k] - want[k]));
        }
        curves++;
      });
    });

    report = {
      snapshots: snapshots,
      curves: curves,
      worstLossGap: worstLoss,
      worstCurveGapPickups: worstCurve,
      ok: worstLoss < 1e-3 && worstCurve < 0.01
    };
    if (!report.ok) {
      console.error('Net.selfCheck FAILED', report);
    } else {
      console.log('Net.selfCheck: ' + snapshots + ' snapshots and ' + curves +
        ' curves rebuilt from the shipped weights; worst loss gap ' +
        worstLoss.toExponential(1) + ', worst curve gap ' +
        worstCurveGapText(worstCurve) + '.');
    }
    return report;
  }

  function worstCurveGapText(v) {
    return v.toExponential(1) + ' pickups';
  }

  return {
    xOf: xOf,
    value: value,
    curve: curve,
    loss: loss,
    lossPickups2: lossPickups2,
    missPickups: missPickups,
    selfCheck: selfCheck
  };
})();
