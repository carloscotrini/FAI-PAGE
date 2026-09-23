/* ===========================================================================
   hopper.js : the grasshopper, and the way it lands.

   THE GLYPH AND THE JUMP ARE COPIED, on purpose, so that the room recognises
   the animal it played the game with. Source, the block 2 game:

     materials/viz/grasshopper/src/assets/localview.js
       the eight shapes of the glyph, its anchor at the contact point and its
       facing; the tilt clamp and the lift arc of a jump

   What changed here. The game pans the ground under a grasshopper pinned to
   the centre of its window. This page keeps the hillside still and moves the
   grasshopper along it, because every scene is pictures side by side: the
   same numbers move the curve on the data and the grasshopper on its hill.

   create(parent, scale, cls, tag, tagTop)
     cls     "" for the game's green, "ka" or "kb" for scene 3's two
     tag     a letter that rides with the grasshopper, upright whatever its
             tilt, so the two of scene 3 are told apart by more than colour
     tagTop  the highest the letter may sit. Above the grasshopper when there
             is room, and in the ground under its feet when it stands so high
             that the letter would leave the picture, which it does at the
             start of scene 3

   No colour is written here. The eight shapes carry the game's class names and
   css/style.css colours them.
   =========================================================================== */

window.Hopper = (function () {
  "use strict";

  var MAX_TILT = 62;    /* degrees. The game clamps at 70 on a shallower curve */
  var ARC = 30;         /* px, the top of the jump arc */

  function create(parent, scale, cls, tag, tagTop) {
    var s = scale || 1;
    var outer = parent.append("g").attr("class", "hopper" + (cls ? " " + cls : ""));
    var g = outer.append("g");

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

    var label = tag
      ? outer.append("text").attr("class", "hopper-tag halo " + (cls || ""))
          .attr("text-anchor", "middle").text(tag)
      : null;

    /* groundY is where the feet touch the ground, which is py until the
       grasshopper leaves it: the letter picks its side from the ground, so it
       does not flip over in mid jump */
    function place(px, py, tiltDeg, facing, groundY) {
      var t = tiltDeg;
      if (t > MAX_TILT) t = MAX_TILT;
      if (t < -MAX_TILT) t = -MAX_TILT;
      g.attr("transform", "translate(" + px.toFixed(2) + "," + py.toFixed(2) + ") " +
        "rotate(" + t.toFixed(2) + ") scale(" + (facing < 0 ? -s : s) + "," + s + ")");
      if (label) {
        var gy = (groundY === undefined) ? py : groundY;
        var above = gy - 36 * s >= (tagTop || 0) + 16;
        label.attr("x", px.toFixed(2))
          .attr("y", (above ? py - 36 * s : gy + 24).toFixed(2));
      }
    }

    function show(on) { outer.attr("display", on ? null : "none"); }

    return { place: place, show: show, node: outer, ARC: ARC };
  }

  return { create: create, ARC: ARC, MAX_TILT: MAX_TILT };
})();
