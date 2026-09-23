/* ===========================================================================
   ui.js : the small DOM pieces every scene builds itself from.

   Panels, readouts, buttons and a speed slider. No colour, no maths, no d3.
   =========================================================================== */

window.UI = (function () {
  "use strict";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function row(parent, cls) {
    var n = el("div", "row" + (cls ? " " + cls : ""));
    parent.appendChild(n);
    return n;
  }

  function col(parent, cls) {
    var n = el("div", "col" + (cls ? " " + cls : ""));
    parent.appendChild(n);
    return n;
  }

  /* A titled card. title may carry markup, for a coloured symbol. Returns the
     parts a caller fills. */
  function panel(parent, title, note, width) {
    var p = el("div", "panel");
    if (width) p.style.width = width + "px";
    var head = el("div", "panel-head");
    var titleEl = el("div", "panel-title");
    titleEl.innerHTML = title || "";
    head.appendChild(titleEl);
    var noteEl = el("div", "panel-note");
    noteEl.innerHTML = note || "";
    head.appendChild(noteEl);
    p.appendChild(head);
    var body = el("div", "panel-body");
    p.appendChild(body);
    parent.appendChild(p);
    return { panel: p, head: head, title: titleEl, note: noteEl, body: body };
  }

  /* defs: [{ key, label (markup), unit (markup), cls, initial }].
     Returns set(key, text). */
  function readouts(parent, defs) {
    var host = el("div", "readouts");
    var vals = {};
    defs.forEach(function (d) {
      var r = el("div", "readout" + (d.cls ? " " + d.cls : ""));
      var lab = el("div", "readout-label");
      lab.innerHTML = d.label;
      r.appendChild(lab);
      var v = el("div", "readout-value");
      var num = el("span", "num", d.initial || "");
      v.appendChild(num);
      if (d.unit) {
        v.appendChild(document.createTextNode(" "));
        var u = el("span", "unit");
        u.innerHTML = d.unit;
        v.appendChild(u);
      }
      r.appendChild(v);
      host.appendChild(r);
      vals[d.key] = num;
    });
    parent.appendChild(host);
    return {
      host: host,
      set: function (key, text) { if (vals[key]) vals[key].textContent = text; }
    };
  }

  function button(parent, label, cls, onClick) {
    var b = el("button", "btn" + (cls ? " " + cls : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    parent.appendChild(b);
    return b;
  }

  function label(parent, text) {
    var n = el("span", "ctl-label", text);
    parent.appendChild(n);
    return n;
  }

  /* A speed slider, in steps a second. Returns a getter. */
  function speed(parent, onChange, opts) {
    opts = opts || {};
    var max = opts.max || 5, start = opts.value || 2;
    label(parent, "Speed");
    var s = document.createElement("input");
    s.type = "range";
    s.min = "1"; s.max = String(max); s.step = "1"; s.value = String(start);
    s.setAttribute("aria-label", "Steps a second");
    var out = el("span", "ctl-label", start + " a second");
    s.addEventListener("input", function () {
      out.textContent = s.value + " a second";
      if (onChange) onChange(Number(s.value));
    });
    parent.appendChild(s);
    parent.appendChild(out);
    return function () { return Number(s.value); };
  }

  return {
    el: el, row: row, col: col, panel: panel, readouts: readouts,
    button: button, label: label, speed: speed
  };
})();
