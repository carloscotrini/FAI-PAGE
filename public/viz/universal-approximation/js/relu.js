/* The arithmetic of the whole visualization, in one small module.
 *
 * There is not much of it, and that IS the lesson: a ramp is one max(), a bump
 * is three of them, and a trained network is a constant plus a list of ramps.
 * Every curve on every scene is drawn by one of these five functions.
 *
 * The module is written so `node` can load it with no browser around, because
 * verify.sh checks the bump arithmetic and the network rewrite by running the
 * same code the page runs rather than a second copy of it.
 *
 * Globals used: none. */

(function (root) {

  /** One ReLU neuron: flat at 0 before `start`, a straight line after it. */
  function ramp(hour, start, slope) {
    return slope * Math.max(0, hour - start);
  }

  /** The same neuron as a trained network holds it: it can face either way.
   *  facing +1 means flat to the LEFT of the kink, -1 means flat to the RIGHT. */
  function facingRamp(hour, kink, amp, facing) {
    return amp * Math.max(0, facing * (hour - kink));
  }

  /** Three ReLU neurons: up from `start`, exactly `height` at `peak`, exactly
   *  0 from `end` onwards and 0 before `start`. The third ramp is the one that
   *  cancels the fall; without it the sum keeps falling for ever. */
  function bump(hour, start, peak, end, height) {
    const up = height / (peak - start);
    const down = height / (end - peak);
    return ramp(hour, start, up) - ramp(hour, peak, up + down) + ramp(hour, end, down);
  }

  /** Two ReLU neurons: climbs from `start` and then holds `height` for ever. */
  function shelf(hour, start, end, height) {
    const slope = height / (end - start);
    return ramp(hour, start, slope) - ramp(hour, end, slope);
  }

  /** A one-hidden-layer network, as a constant plus its ramps.
   *
   *  This is the same sum precompute/build_data.py checks against the trained
   *  model itself, to 1e-9, over 00:00 to 30:00. What the page draws faint
   *  underneath a fitted curve is exactly these terms. */
  function netValue(net, hour) {
    let total = net.constant;
    for (let i = 0; i < net.ramps.length; i++) {
      const r = net.ramps[i];
      total += r.amp * Math.max(0, r.facing * (hour - r.kink));
    }
    return total;
  }

  /** Sample a function of the hour on an even grid. Returns [[hour, value], ...]. */
  function sample(fn, lo, hi, step) {
    const out = [];
    const n = Math.round((hi - lo) / step);
    for (let i = 0; i <= n; i++) {
      const h = lo + i * step;
      out.push([h, fn(h)]);
    }
    return out;
  }

  /** Root mean squared error, in pickups. */
  function rmse(actual, predicted) {
    let total = 0;
    for (let i = 0; i < actual.length; i++) {
      const d = actual[i] - predicted[i];
      total += d * d;
    }
    return Math.sqrt(total / actual.length);
  }

  /** The typical miss of a model against every count in the log. */
  function rmseAgainstLog(hours, counts, fn) {
    let total = 0;
    const slots = hours.length;
    for (let i = 0; i < counts.length; i++) {
      const d = counts[i] - fn(hours[i % slots]);
      total += d * d;
    }
    return Math.sqrt(total / counts.length);
  }

  /** 7.33 becomes "07:20". Hours past midnight keep counting: 25.5 is "25:30",
   *  which is the honest way to label an hour the model was never shown. */
  function clock(hour) {
    const whole = Math.floor(hour + 1e-9);
    const minutes = Math.round((hour - whole) * 60);
    const carry = minutes === 60;
    const hh = whole + (carry ? 1 : 0);
    const mm = carry ? 0 : minutes;
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  /** Rounded the way a manager reads a number off a slide. */
  function pickups(value, digits) {
    const d = digits == null ? 0 : digits;
    const rounded = value.toFixed(d);
    return rounded === '-0' ? '0' : rounded;
  }

  /** The same, with a thousands separator: 1670 becomes "1,670". */
  function commas(value, digits) {
    return Number(pickups(value, digits)).toLocaleString('en-US',
      { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
  }

  const api = { ramp, facingRamp, bump, shelf, netValue, sample, rmse,
                rmseAgainstLog, clock, pickups, commas };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ReLU = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
