/* ===========================================================================
   Scene 2: stopping distance, the data.

   Forty synthetic stops, speed against stopping distance, and the model with
   its two knobs:

     d = a * (v/10)^2 + b * (v/10)
         braking         reaction

   The driving school rule is a = 1 and b = 3, and its curve is drawn dashed
   over the stops, which scatter around it. One button hides it, for a
   lecturer who wants the room to see the measurements alone first.

   Allowed globals: d3, Plot, UI, Fmt, Algo, STOP_DATA.
   =========================================================================== */

window.scenes.scene2 = function (root) {
  "use strict";

  var DATA = window.STOP_DATA;
  var stops = DATA.stops;
  var RULE = DATA.rule;
  var showRule = true;

  var panel = UI.panel(root, "Forty stops", "Synthetic: every driver and car differs", 1240);
  var ruleBtn = UI.button(panel.head, "Driving school rule", "", function () {
    showRule = !showRule;
    render();
  });

  var sc = Plot.scatter(panel.body, {
    width: 1214, height: 560,
    points: stops.map(function (s) { return { x: s.speed, y: s.dist }; }),
    xMax: DATA.plot.speedMax, yMax: DATA.plot.distMax, xStep: 10, yStep: 25,
    xTitle: "speed v, km/h", yTitle: "stopping distance d, metres", ml: 58, dotR: 6.5,
    label: "Forty stops, speed against stopping distance"
  });

  /* the model, set in the empty top left corner of the plot: the stops climb
     from the bottom left to the top right and never reach it */
  var model = UI.el("div", "model-box");
  /* a grid, so each word sits under its own term */
  model.innerHTML =
    '<span class="m-term">d =</span>' +
    '<span class="m-term"><span class="sym ka">a</span> &middot; (v/10)<sup>2</sup></span>' +
    '<span class="m-term">+</span>' +
    '<span class="m-term"><span class="sym kb">b</span> &middot; (v/10)</span>' +
    '<span></span><span class="m-gloss">braking</span>' +
    '<span></span><span class="m-gloss">reaction</span>';
  panel.body.appendChild(model);

  function render() {
    ruleBtn.classList.toggle("on", showRule);
    /* the label sits to the left of the curve at 104 km/h, in the empty
       space above the stops: at the end of the curve it ran into the curve */
    var v = 104;
    sc.render({
      curves: showRule
        ? [{ f: function (x) { return Algo.predict(RULE.a, RULE.b, x); }, cls: "rule-curve" }]
        : [],
      labels: showRule
        ? [{ text: "a = " + RULE.a + ", b = " + RULE.b, x: v,
             y: Algo.predict(RULE.a, RULE.b, v),
             dx: -16, dy: -4, cls: "rule-ink", anchor: "end" }]
        : []
    });
  }

  showRule = !(window.Flags && window.Flags.norule);
  render();

  return {
    onEnter: function () { showRule = true; render(); }
  };
};
