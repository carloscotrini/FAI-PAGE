/* ===========================================================================
   fmt.js : how a number is written on this page.

   EVERY NUMBER ON SCREEN IS ROUNDED HERE. The room reads these off a projector
   at the back of a hall, so francs are whole francs with a space every three
   digits, the house loss, which reaches ten to the twelve francs squared, is
   written in billions, and a and b keep two decimals.

   The page prints no update line. If one comes back, write its step as the
   difference of the two numbers AS PRINTED, never rounded on its own: the
   house page printed "24 052 +0 = 24 053" before it learned that.
   =========================================================================== */

window.Fmt = (function () {
  "use strict";

  /* A space every three digits, the way the decks set prices. */
  function group(n) {
    var s = String(Math.abs(n));
    var out = "";
    while (s.length > 3) {
      out = " " + s.slice(-3) + out;
      s = s.slice(0, -3);
    }
    return (n < 0 ? "-" : "") + s + out;
  }

  /* Francs per square metre, the unit of w. Whole francs. */
  function rate(v) {
    return group(Math.round(v));
  }

  /* L(w) in billions of francs squared: one decimal below ten, none above. */
  function lossBn(v) {
    var b = v / 1e9;
    if (b < 10) return b.toFixed(1);
    return group(Math.round(b));
  }

  /* a and b, the two knobs of scene 3. Two decimals, and never "-0.00". */
  function coef(v) {
    var s = v.toFixed(2);
    return s === "-0.00" ? "0.00" : s;
  }

  /* L(a, b) in square metres: whole numbers from a hundred up, one decimal
     below, so the last steps of the walk still show a change. */
  function lossM2(v) {
    if (v >= 100) return group(Math.round(v));
    return v.toFixed(1);
  }

  /* Prices on an axis: 1 M, 2 M, and so on. */
  function millions(v) {
    return v === 0 ? "0" : (v / 1e6).toFixed(0) + " M";
  }

  /* w on an axis: 12 000 reads better than 12k on a projector. */
  function axisRate(v) {
    return group(Math.round(v));
  }

  return {
    group: group, rate: rate, lossBn: lossBn, coef: coef, lossM2: lossM2,
    millions: millions, axisRate: axisRate
  };
})();
