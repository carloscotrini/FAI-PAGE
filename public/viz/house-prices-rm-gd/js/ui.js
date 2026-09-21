/* ===========================================================================
   ui.js : the small DOM pieces every scene builds itself from.

   Panels, readouts, buttons, a speed slider, and the pseudocode block whose
   executing line is highlighted. No colour, no maths, no d3 here.
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

  function lead(parent, html) {
    var n = el("div", "lead");
    n.innerHTML = html;
    parent.appendChild(n);
    return n;
  }

  /* A titled card. Returns the body, which is what a caller fills. */
  function panel(parent, title, note, width) {
    var p = el("div", "panel");
    if (width) p.style.width = width + "px";
    var head = el("div", "panel-head");
    if (title) head.appendChild(el("div", "panel-title", title));
    var noteEl = el("div", "panel-note", note || "");
    head.appendChild(noteEl);
    p.appendChild(head);
    var body = el("div", "panel-body");
    p.appendChild(body);
    parent.appendChild(p);
    return { panel: p, head: head, note: noteEl, body: body };
  }

  /* defs: [{ key, label, unit, cls }]. Returns set(key, text). */
  function readouts(parent, defs) {
    var host = el("div", "readouts");
    var vals = {};
    defs.forEach(function (d) {
      var r = el("div", "readout" + (d.cls ? " " + d.cls : ""));
      r.appendChild(el("div", "readout-label", d.label));
      var v = el("div", "readout-value");
      var num = el("span", "num", d.initial || "");
      v.appendChild(num);
      if (d.unit) {
        v.appendChild(document.createTextNode(" "));
        v.appendChild(el("span", "unit", d.unit));
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

  /* A speed slider, 1 to 5 rounds a second. Returns a getter. */
  function speed(parent, onChange) {
    label(parent, "Speed");
    var s = document.createElement("input");
    s.type = "range";
    s.min = "1"; s.max = "5"; s.step = "1"; s.value = "2";
    var out = el("span", "ctl-label", "2 a second");
    s.addEventListener("input", function () {
      out.textContent = s.value + " a second";
      if (onChange) onChange(Number(s.value));
    });
    parent.appendChild(s);
    parent.appendChild(out);
    return function () { return Number(s.value); };
  }

  /* The pseudocode panel. lines is an array of strings; a "#" starts the
     comment part of a line and is set in the muted ink. Returns
     highlight(i, cls) with i counting from 0, or null for no line. */
  function code(parent, lines, extraCls) {
    var host = el("div", "code");
    var nodes = lines.map(function (text) {
      var n = el("div", "code-line");
      var cut = text.indexOf("#");
      if (cut >= 0) {
        n.appendChild(document.createTextNode(text.slice(0, cut)));
        n.appendChild(el("span", "cmt", text.slice(cut)));
      } else {
        n.textContent = text;
      }
      host.appendChild(n);
      return n;
    });
    parent.appendChild(host);
    return {
      host: host,
      highlight: function (i) {
        nodes.forEach(function (n, k) {
          n.className = "code-line" + (k === i ? " is-active" + (extraCls ? " " + extraCls : "") : "");
        });
      }
    };
  }

  function footnote(parent, text) {
    var n = el("div", "footnote", text);
    parent.appendChild(n);
    return n;
  }

  return {
    el: el, row: row, lead: lead, panel: panel, readouts: readouts,
    button: button, label: label, speed: speed, code: code, footnote: footnote
  };
})();
