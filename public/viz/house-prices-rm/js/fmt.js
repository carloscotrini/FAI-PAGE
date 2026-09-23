/* ===========================================================================
   fmt.js : how a number is written on this page.

   EVERY NUMBER ON SCREEN IS ROUNDED HERE. The room reads these off a projector
   at the back of a lecture hall, so francs are whole francs with a space every
   three digits, the way the decks set prices.
   =========================================================================== */

window.Fmt = (function () {
  "use strict";

  /* A space every three digits. */
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

  /* The step from one w to the next, written so that the three numbers on the
     update line ADD UP ON SCREEN.

     Rounding the two ends and the step between them separately does not close:
     an earlier version of this page printed "23 619 -5 = 23 613", because each
     of the three numbers was rounded from its own exact value. A room that can
     check one subtraction will check that one. This returns the difference
     between the two w values AS THEY ARE PRINTED, which is the change the room
     can see, and it is never more than one franc away from the exact step,
     alpha * l. The update line on the page goes through here. */
  function stepTo(from, to) {
    return signed(Math.round(to) - Math.round(from));
  }

  /* "23 906 - 54 = 23 852": the update line, closed on screen by stepTo. */
  function updateLine(from, to) {
    var step = stepTo(from, to);
    return rate(from) + " " + step.charAt(0) + " " + step.slice(1) + " = " + rate(to);
  }

  /* Francs on an axis: 1 M, 2 M, and so on for the prices of the scatter,
     and 0.5 M, 1 M, 1.5 M for the l_bar chart. One decimal, and only for a
     tick that is not a whole million: toFixed(0) wrote 500 000 as "1 M". */
  function millions(v) {
    var m = v / 1e6;
    return (Math.round(m) === m ? m.toFixed(0) : m.toFixed(1)) + " M";
  }

  return {
    group: group,
    money: money,
    signed: signed,
    rate: rate,
    stepTo: stepTo,
    updateLine: updateLine,
    millions: millions
  };
})();
