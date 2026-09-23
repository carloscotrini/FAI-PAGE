/* ===========================================================================
   Scene 1: the ten houses.

   The table and the scatter of the same ten rows, side by side, so that the
   room reads a row and finds the dot. The last column is each house's own
   price per square metre: they disagree, which is why scene 2 has work to do.
   The lecturer says that out loud; the page says only that the data is
   synthetic, in one line.

   Allowed globals: d3, Plot, UI, Fmt, HOUSE_DATA.
   =========================================================================== */

window.scenes.scene1 = function (root) {
  "use strict";

  var DATA = window.HOUSE_DATA;
  var houses = DATA.houses;

  UI.lead(root, "Ten synthetic houses, generated with a fixed seed.");

  var row = UI.row(root);

  var left = UI.panel(row, null, 452);
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

  var right = UI.panel(row, null, 774);
  var sc = Plot.scatter(right.body, {
    width: 748, height: 548, houses: houses, plot: DATA.plot, showIds: true
  });
  sc.render({});

  return {
    onEnter: function () { sc.render({}); }
  };
};
