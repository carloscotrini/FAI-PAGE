/* ===========================================================================
   Scene 1: the ten houses.

   The table and the scatter of the same ten rows, side by side, so that the
   room reads a row and finds the dot. The last column is each house's own
   price per square metre: they disagree, which is the whole reason the next
   two scenes have work to do.

   Allowed globals: d3, Plot, UI, Fmt, Algo, HOUSE_DATA.
   =========================================================================== */

window.scenes.scene1 = function (root) {
  "use strict";

  var DATA = window.HOUSE_DATA;
  var houses = DATA.houses;
  var st = Algo.stats(houses);

  UI.lead(root, "Ten houses, each with its living area and its price. "
    + "<b>The data is synthetic</b>, generated with a fixed seed.");

  var row = UI.row(root);

  var left = UI.panel(row, "The ten houses", "", 430);
  var table = document.createElement("table");
  table.className = "data-table";
  var thead = document.createElement("thead");
  var htr = document.createElement("tr");
  ["House", "Area m2", "Price CHF", "CHF per m2"].forEach(function (h) {
    var th = document.createElement("th");
    th.textContent = h;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);
  var tbody = document.createElement("tbody");
  houses.forEach(function (h) {
    var tr = document.createElement("tr");
    [String(h.id), Fmt.group(h.area), Fmt.money(h.price),
     Fmt.money(h.price / h.area)].forEach(function (v) {
      var td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  left.body.appendChild(table);

  var right = UI.panel(row, "Area against price", "one dot per house", 776);
  var sc = Plot.scatter(right.body, {
    width: 744, height: 452, houses: houses, plot: DATA.plot, showIds: true
  });
  sc.render({});

  UI.footnote(root,
    "Every house asks a different price per square metre, from "
    + Fmt.money(d3.min(houses, function (h) { return h.price / h.area; }))
    + " to " + Fmt.money(d3.max(houses, function (h) { return h.price / h.area; }))
    + " francs. One number w has to serve all ten, and the next two scenes are "
    + "two ways of finding it.");

  return {
    onEnter: function () { sc.render({}); }
  };
};
