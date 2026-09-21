/* The grasshopper.
 *
 * The glyph and the hop are the ones the room already played with in the
 * weekend one grasshopper game: the drawing is copied path for path from
 * BMAI-PAGE/public/exercises/we1/cx_grasshopper.html (localview.js), and the
 * hop keeps its cubic ease in and out and its arc. Its anchor (0, 0) is the
 * contact point, it faces right, and it is about 34 px from hind leg to head.
 *
 * What changes here is the camera. The game watches the grasshopper from the
 * side, on a profile of the ground, so the glyph tilts with the slope it
 * stands on. This page watches from above, on a map of the ground, so the
 * glyph stays upright and turns to face the way it is going, and the hop
 * carries it over a small arc with its shadow left on the ground below.
 *
 * NO COLOUR IS WRITTEN HERE. Every piece carries a class from css/style.css.
 *
 * Globals used: d3. */

window.Hopper = (function () {
  'use strict';

  var ARC = 15;      // px, the top of a hop, before the distance scaling
  var SCALE = 0.95;  // the glyph is drawn a little smaller than in the game

  function reduceMotion() {
    try {
      return !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  /** cubic in and out, so the hop leaves and lands softly */
  function ease(u) {
    return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  }

  function create(parent) {
    var g = d3.select(parent.node ? parent.node() : parent).append('g')
      .attr('class', 'hopper');

    var shadow = g.append('ellipse').attr('class', 'hop-shadow')
      .attr('rx', 8).attr('ry', 2.6);

    var body = g.append('g');
    var art = body.append('g').attr('transform', 'scale(' + SCALE + ')');
    art.append('ellipse').attr('class', 'hopper-ring')
      .attr('cx', -1).attr('cy', -8.5).attr('rx', 13.3).attr('ry', 6.9);
    art.append('path').attr('class', 'hopper-leg')
      .attr('d', 'M -2 -8 L -13 -13 L -16.5 -0.5');
    art.append('path').attr('class', 'hopper-leg')
      .attr('d', 'M 3.5 -6.5 L 6.5 -0.5');
    art.append('ellipse').attr('class', 'hopper-body')
      .attr('cx', -1).attr('cy', -8.5).attr('rx', 12).attr('ry', 5.6);
    art.append('path').attr('class', 'hopper-wing')
      .attr('d', 'M -10 -10.6 Q -2 -13.8 6 -10.2');
    art.append('circle').attr('class', 'hopper-body')
      .attr('cx', 10.6).attr('cy', -11).attr('r', 4.8);
    art.append('circle').attr('class', 'hopper-dark')
      .attr('cx', 12.3).attr('cy', -11.8).attr('r', 1.5);
    art.append('path').attr('class', 'hopper-antenna')
      .attr('d', 'M 13.6 -14 Q 18.6 -18.6 21.6 -21.6');

    var facing = 1;

    /** Put the glyph down at (x, y), lifted `lift` px above its own shadow. */
    function place(x, y, lift) {
      lift = lift || 0;
      shadow.attr('cx', x).attr('cy', y)
        .attr('opacity', lift > 0 ? 0.22 : 0);
      body.attr('transform',
        'translate(' + x.toFixed(2) + ',' + (y - lift).toFixed(2) + ') ' +
        'scale(' + facing + ',1)');
    }

    /** Which way it looks. It never walks backwards. */
    function face(dx) {
      if (dx > 0.5) facing = 1;
      else if (dx < -0.5) facing = -1;
    }

    /**
     * Where the glyph is part way through a hop from a to b, as a fraction u
     * of the way. Returns the height it is off the ground, so the caller can
     * draw the arc with the same numbers.
     */
    function hopPoint(ax, ay, bx, by, u) {
      var e = reduceMotion() ? 1 : ease(u);
      var dist = Math.hypot(bx - ax, by - ay);
      var lift = Math.min(26, ARC * Math.min(1, dist / 40) + 2) * Math.sin(Math.PI * u);
      return { x: ax + (bx - ax) * e, y: ay + (by - ay) * e, lift: reduceMotion() ? 0 : lift };
    }

    function show(on) { g.attr('display', on ? null : 'none'); }

    return { g: g, place: place, face: face, hopPoint: hopPoint, show: show };
  }

  /** The arc a hop draws on the map, as an svg path. */
  function hopArc(ax, ay, bx, by) {
    var dist = Math.hypot(bx - ax, by - ay);
    var lift = Math.min(26, ARC * Math.min(1, dist / 40) + 2);
    var mx = (ax + bx) / 2, my = (ay + by) / 2;
    return 'M ' + ax + ' ' + ay + ' Q ' + mx + ' ' + (my - 2 * lift) + ' ' + bx + ' ' + by;
  }

  return { create: create, hopArc: hopArc, ease: ease };
})();
