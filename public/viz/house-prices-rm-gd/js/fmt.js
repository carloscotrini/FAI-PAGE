/* ===========================================================================
   fmt.js : how a number is written on this page.

   EVERY NUMBER ON SCREEN IS ROUNDED HERE. The room reads these off a projector
   at the back of a lecture hall, so francs are whole francs with a space every
   three digits, the step size keeps enough decimals to stay distinguishable,
   and the loss, which lives in francs squared and reaches ten to the twelve, is
   written in billions.
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

  /* Whole francs. */
  function money(v) {
    return group(Math.round(v));
  }

  /* A signed miss, so that the sign is part of the number rather than of the
     sentence around it. */
  function signed(v) {
    var r = Math.round(v);
    return (r >= 0 ? "+" : "-") + group(Math.abs(r));
  }

  /* Francs per square metre, the unit of w. Whole francs. */
  function rate(v) {
    return group(Math.round(v));
  }

  /* The step from one w to the next, written so that the three numbers on an
     update line ADD UP ON SCREEN.

     Rounding the two ends and the step between them separately does not close.
     On this data the Robbins-Monro line printed "23 619 -5 = 23 613" in 58 of
     its 300 rounds, and gradient descent printed "24 052 +0 = 24 053" at round
     14, because each of the three numbers was rounded from its own exact value.
     A room that can check one subtraction will check that one. This returns the
     difference between the two w values AS THEY ARE PRINTED, which is the
     change the room can see, and it is never more than one franc away from the
     exact step. Every update line on the page goes through here. */
  function stepTo(from, to) {
    return signed(Math.round(to) - Math.round(from));
  }

  /* The step size. c / n reaches four zeros after the point by round 100, so
     six decimals is the floor that keeps consecutive rounds apart. */
  function alpha(a) {
    if (a === null || a === undefined) return "";
    return a.toFixed(6);
  }

  /* L(w), in billions of francs squared. It runs from about ten to about eight
     thousand over the drawn window, so one decimal is enough below ten and
     none above it. */
  function lossBn(v) {
    var b = v / 1e9;
    if (b < 10) return b.toFixed(1);
    return group(Math.round(b));
  }

  /* The tilt of the ground, grad L(w). Francs squared per franc per square
     metre, which is a unit nobody wants to read, so it is written in millions
     and the page calls it a tilt rather than naming the unit. */
  function slopeM(v) {
    var m = v / 1e6;
    /* At the bottom of the parabola the tilt is a few hundredths, and the plain
       form printed "-0.0 million" on the projector, which reads as a typo. Zero
       to the printed precision is written without a sign. */
    if (Math.abs(m) < 0.05) return "0.0";
    if (Math.abs(m) >= 100) return (m >= 0 ? "+" : "-") + group(Math.round(Math.abs(m)));
    return (m >= 0 ? "+" : "") + m.toFixed(1);
  }

  /* Prices on an axis: 1 M, 2 M, and so on. */
  function millions(v) {
    return (v / 1e6).toFixed(0) + " M";
  }

  /* w on an axis: 12 000 reads better than 12k on a projector. */
  function axisRate(v) {
    return group(Math.round(v));
  }

  return {
    group: group,
    money: money,
    signed: signed,
    rate: rate,
    stepTo: stepTo,
    alpha: alpha,
    lossBn: lossBn,
    slopeM: slopeM,
    millions: millions,
    axisRate: axisRate
  };
})();
