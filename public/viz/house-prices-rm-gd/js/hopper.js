/* ===========================================================================
   hopper.js : the grasshopper, and the way it lands.

   THE GLYPH AND THE JUMP ARE COPIED, on purpose, so that the room recognises
   the animal it played the game with half an hour earlier. Source:

     2026hs/BMAI-PAGE/public/exercises/we1/cx_grasshopper.html
       the eight shapes of the glyph, its anchor at the contact point and its
       facing, from the localview.js section, lines 2509 to 2528
       the tilt clamp and the lift arc of a jump, lines 2429, 2595 to 2597,
       2647 to 2652

   What changed here. The game pans the ground under a grasshopper pinned to
   the centre of its window. This page keeps the hillside still and moves the
   grasshopper along it, because the whole point of the scene is the pair of
   pictures side by side: the same w moves the line on the left and the
   grasshopper on the right. The arc and the easing are the game's own.

   No colour is written here. The eight shapes carry the game's class names and
   css/style.css gives them the same green.
   =========================================================================== */

window.Hopper = (function () {
  "use strict";

  var MAX_TILT = 62;    /* degrees. The game clamps at 70 on a shallower curve */
  var ARC = 30;         /* px, the top of the jump arc, matched to the
                           arc plot.js draws between two landings */

  function create(parent, scale) {
    var s = scale || 1;
    var g = parent.append("g").attr("class", "hopper");

    g.append("ellipse").attr("class", "hopper-ring hopper-halo")
      .attr("cx", -1).attr("cy", -8.5).attr("rx", 13.3).attr("ry", 6.9);
    /* the knee sits behind the thorax rather than above it: at a steep tilt a
       knee drawn above the body swings over the back and reads as a broken leg */
    g.append("path").attr("class", "hopper-leg")
      .attr("d", "M -2 -8 L -13 -13 L -16.5 -0.5");
    g.append("path").attr("class", "hopper-leg")
      .attr("d", "M 3.5 -6.5 L 6.5 -0.5");
    g.append("ellipse").attr("class", "hopper-body")
      .attr("cx", -1).attr("cy", -8.5).attr("rx", 12).attr("ry", 5.6);
    g.append("path").attr("class", "hopper-wing")
      .attr("d", "M -10 -10.6 Q -2 -13.8 6 -10.2");
    g.append("circle").attr("class", "hopper-body")
      .attr("cx", 10.6).attr("cy", -11).attr("r", 4.8);
    g.append("circle").attr("class", "hopper-dark")
      .attr("cx", 12.3).attr("cy", -11.8).attr("r", 1.5);
    g.append("path").attr("class", "hopper-antenna")
      .attr("d", "M 13.6 -14 Q 18.6 -18.6 21.6 -21.6");

    function place(px, py, tiltDeg, facing) {
      var t = tiltDeg;
      if (t > MAX_TILT) t = MAX_TILT;
      if (t < -MAX_TILT) t = -MAX_TILT;
      g.attr("transform", "translate(" + px.toFixed(2) + "," + py.toFixed(2) + ") " +
        "rotate(" + t.toFixed(2) + ") scale(" + (facing < 0 ? -s : s) + "," + s + ")");
    }

    function show(on) { g.attr("display", on ? null : "none"); }

    return { place: place, show: show, node: g, ARC: ARC };
  }

  return { create: create, ARC: ARC, MAX_TILT: MAX_TILT };
})();
