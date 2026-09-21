/* Scene 0. The title card and the brief.
 *
 * Its job is to hand the room the three role marks before any chart uses them,
 * because every later scene reads those marks without a legend. Shape first,
 * then colour, then the word.
 *
 * Interaction: none. This is a card the lecturer talks over.
 *
 * Globals used: d3, Plot, UI, DATA. */

window.scenes.scene0 = function (root) {
  const D = window.DATA;
  const m = D.meta;

  const layout = UI.el("div.scene-layout.center");
  const wrap = UI.el("div.title-wrap");

  wrap.appendChild(UI.el("div.eyebrow",
    "CAS BMAI HS26 " + "·" + " weekend 1 " + "·" + " the UN games"));

  wrap.appendChild(UI.el("h1.title-line",
    "The bait, the crash, the patch, the reveal, the trust."));

  wrap.appendChild(UI.el("p.hook",
    "You work for the UN and your brief is to predict GDP per capita. So you pull "
    + "everything you can lay hands on: rule of law, life expectancy, and also "
    + "UNESCO sites, vowel counts, the Scrabble score of each country's name. "
    + m.nFeatures + " columns over " + m.nCountries + " countries. For this exercise every "
    + "column has been tagged in advance. On the job nobody tags them for you."));

  const legendHost = UI.el("div.title-legend");
  Plot.roleLegend(legendHost, { counts: m.roleCounts, gloss: true });
  wrap.appendChild(legendHost);

  wrap.appendChild(UI.el("p.muted.small.title-foot",
    "Each role carries a shape as well as a colour, so the chart still reads if "
    + "you cannot separate the two hues, or if the hall projector cannot. "
    + "Five chapters, ten scenes. Arrow keys to step, t for the theme."));

  layout.appendChild(wrap);
  root.appendChild(layout);

  return {};
};
