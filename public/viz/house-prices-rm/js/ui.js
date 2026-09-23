/* ===========================================================================
   ui.js : the small DOM pieces every scene builds itself from.

   Panels, readouts, buttons, a speed slider, and the code block whose
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

  /* The one short line a scene is allowed under its title. */
  function lead(parent, html) {
    var n = el("div", "lead");
    n.innerHTML = html;
    parent.appendChild(n);
    return n;
  }

  /* A card. With no title it has no head at all, which is how both scenes use
     it: the axes and the table header already say what is inside. */
  function panel(parent, title, width) {
    var p = el("div", "panel");
    if (width) p.style.width = width + "px";
    if (title) {
      var head = el("div", "panel-head");
      head.appendChild(el("div", "panel-title", title));
      p.appendChild(head);
    }
    var body = el("div", "panel-body");
    p.appendChild(body);
    parent.appendChild(p);
    return { panel: p, body: body };
  }

  /* defs: [{ key, label, unit, code, width }]. A label with code: true is a
     variable of the code panel and is set exactly as the code spells it, never
     in capitals. Returns set(key, text) and mark(key, on). */
  function readouts(parent, defs) {
    var host = el("div", "readouts");
    var vals = {}, boxes = {};
    defs.forEach(function (d) {
      var r = el("div", "readout");
      if (d.width) r.style.width = d.width + "px";
      r.appendChild(el("div", "readout-label" + (d.code ? " is-code" : ""), d.label));
      var v = el("div", "readout-value");
      var num = el("span", "num", "");
      v.appendChild(num);
      if (d.unit) {
        v.appendChild(document.createTextNode(" "));
        v.appendChild(el("span", "unit", d.unit));
      }
      r.appendChild(v);
      host.appendChild(r);
      vals[d.key] = num;
      boxes[d.key] = r;
    });
    parent.appendChild(host);
    return {
      host: host,
      set: function (key, text) { if (vals[key]) vals[key].textContent = text; },
      mark: function (key, on) { if (boxes[key]) boxes[key].classList.toggle("is-met", !!on); }
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
    s.setAttribute("aria-label", "Rounds per second");
    s.addEventListener("input", function () {
      if (onChange) onChange(Number(s.value));
    });
    parent.appendChild(s);
    return function () { return Number(s.value); };
  }

  /* The code panel. lines is an array of strings; a "#" starts the comment
     part of a line, which is set in the muted ink. Returns highlight(i), with
     i counting from 0, or null for no line. */
  function code(parent, lines) {
    var host = el("div", "code");
    var nodes = lines.map(function (text) {
      var n = el("div", "code-line");
      var cut = text.indexOf("#");
      if (cut >= 0) {
        n.appendChild(document.createTextNode(text.slice(0, cut)));
        n.appendChild(el("span", "cmt", text.slice(cut)));
      } else {
        n.textContent = text || " ";
      }
      host.appendChild(n);
      return n;
    });
    parent.appendChild(host);
    return {
      host: host,
      highlight: function (i) {
        nodes.forEach(function (n, k) {
          n.classList.toggle("is-active", k === i);
        });
      }
    };
  }

  return {
    el: el, row: row, lead: lead, panel: panel, readouts: readouts,
    button: button, label: label, speed: speed, code: code
  };
})();
