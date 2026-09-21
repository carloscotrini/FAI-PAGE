/* Shared numerical helpers.
 *
 * Nothing here invents a value. Every function is a transformation of numbers
 * that came out of precompute/build_datasets.py, and the two that also exist
 * on the Python side (pearson, quantile) agree with it to the precision the
 * payload carries.
 *
 * Globals used: none. */

window.Stats = (function () {

  /** Pearson correlation over the pairs where both entries are finite. */
  function pearson(xs, ys) {
    let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    const L = Math.min(xs.length, ys.length);
    for (let i = 0; i < L; i++) {
      const x = xs[i], y = ys[i];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
    }
    if (n < 3) return NaN;
    const cov = sxy - (sx * sy) / n;
    const vx = sxx - (sx * sx) / n;
    const vy = syy - (sy * sy) / n;
    if (vx <= 0 || vy <= 0) return NaN;
    return cov / Math.sqrt(vx * vy);
  }

  /** Least squares line through the finite pairs. Returns { m, b }. */
  function fitLine(xs, ys) {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i], y = ys[i];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      n++; sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    if (n < 2) return null;
    const denom = n * sxx - sx * sx;
    if (denom === 0) return null;
    const m = (n * sxy - sx * sy) / denom;
    return { m, b: (sy - m * sx) / n };
  }

  /** log10, with the non positive values dropped rather than clamped. */
  function log10(v) {
    return (Number.isFinite(v) && v > 0) ? Math.log10(v) : NaN;
  }

  /** Type 7 quantile, the one numpy.percentile uses by default. */
  function quantile(sorted, q) {
    if (!sorted.length) return NaN;
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function summary(values) {
    const s = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!s.length) return null;
    return {
      n: s.length, min: s[0], max: s[s.length - 1],
      q25: quantile(s, 0.25), median: quantile(s, 0.5), q75: quantile(s, 0.75),
      mean: s.reduce((a, b) => a + b, 0) / s.length,
    };
  }

  /* Formatting. */

  /** R squared. Three decimals down to zero, fewer below it, where the number
   *  is a catastrophe rather than a measurement and the decimals are noise. */
  function r2(v) {
    if (!Number.isFinite(v)) return "n/a";
    if (v <= -10) return v.toFixed(0);
    if (v < 0) return v.toFixed(2);
    return v.toFixed(3);
  }

  function corr(v) {
    return Number.isFinite(v) ? v.toFixed(2) : "n/a";
  }

  /** Alpha, swept on a log grid, so significant figures rather than decimals. */
  function alpha(v) {
    if (!Number.isFinite(v)) return "n/a";
    if (v >= 1000 || v < 0.01) return v.toExponential(1).replace("e+", "e");
    return String(Number(v.toPrecision(3)));
  }

  /** US dollars, short form, for GDP per capita. */
  function usd(v) {
    if (!Number.isFinite(v)) return "n/a";
    const sign = v < 0 ? "-" : "";
    const a = Math.abs(v);
    if (a >= 1000) return sign + "$" + Math.round(a / 1000) + "k";
    return sign + "$" + Math.round(a);
  }

  /** Turn a codebook column name into something a room can read. */
  function pretty(key) {
    return String(key).replace(/_/g, " ");
  }

  return { pearson, fitLine, log10, quantile, summary, r2, corr, alpha, usd, pretty };
})();
