/* Small DOM and KaTeX builders, so a scene reads as the picture it makes
 * rather than as a wall of createElement calls.
 *
 * Globals used: katex. */

window.UI = (function () {

  /** el('div.foo.bar', { title: 'x' }, child, child, 'text')
   *
   *  The second argument is an attribute bag only when it is a plain object.
   *  An ARRAY there is a list of children, which matters because
   *  `el('div', xs.map(...))` is the natural way to write a list and an earlier
   *  version treated the array as an attribute bag with numeric keys, so it
   *  rendered an empty div. That is what broke `statStrip` below. */
  function el(spec, attrs, ...kids) {
    const m = String(spec).split(".");
    const node = document.createElement(m[0] || "div");
    m.slice(1).forEach(c => node.classList.add(c));
    if (attrs && typeof attrs === "object" && !Array.isArray(attrs)
        && !(attrs instanceof Node) && typeof attrs !== "string") {
      Object.keys(attrs).forEach(k => {
        if (k === "style") Object.assign(node.style, attrs[k]);
        else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    } else if (attrs != null) {
      kids.unshift(attrs);
    }
    kids.flat().forEach(k => {
      if (k == null || k === false) return;
      node.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    });
    return node;
  }

  /** A display formula. */
  function tex(source, opts) {
    const host = document.createElement("div");
    katex.render(source, host, Object.assign({ throwOnError: false, displayMode: true }, opts));
    return host;
  }

  /** A formula inside a sentence. */
  function itex(source) {
    const host = document.createElement("span");
    katex.render(source, host, { throwOnError: false, displayMode: false });
    return host;
  }

  /** A sentence with formulae in it. An array argument means TeX:
   *
   *    sentence('The miss is ', ['y - \\hat y'], ', in dollars.')
   *
   *  Do NOT flatten `parts` here. An earlier version called `parts.flat()`
   *  before inspecting them, which unwrapped exactly the one element arrays
   *  that mark a formula, so the `["tex"]` form silently rendered as raw
   *  backslashes. Four scenes independently worked around it by passing
   *  `UI.itex(...)` nodes instead. Both forms work now. */
  function sentence(...parts) {
    const p = document.createElement("p");
    parts.forEach(part => {
      if (Array.isArray(part)) p.appendChild(itex(part[0]));
      else if (part instanceof Node) p.appendChild(part);
      else if (part != null && part !== false) {
        p.appendChild(document.createTextNode(String(part)));
      }
    });
    return p;
  }

  /** The notation panel. Every symbol a scene uses gets a row here or a gloss
   *  at first use, so no formula in this viz is ornamental. */
  function notation(rows) {
    const wrap = el("div.notation");
    rows.forEach(r => {
      const row = el("div.notation-row");
      row.appendChild(itex(r.tex));
      row.appendChild(el("span.gloss", r.gloss));
      wrap.appendChild(row);
    });
    return wrap;
  }

  function callout(title, ...body) {
    return el("div.callout", el("div.callout-title", title), ...body);
  }

  function note(title, ...body) {
    return el("div.sidebar-note", el("span.sidebar-title", title), ...body);
  }

  function stat(value, label) {
    return el("div.stat", el("div.stat-value", value), el("div.stat-label", label));
  }

  function statStrip(pairs) {
    return el("div.stat-strip", pairs.map(p => stat(p[0], p[1])));
  }

  /** A labelled slider. onInput receives the numeric value. */
  function slider(label, o) {
    const input = el("input", {
      type: "range", min: o.min, max: o.max,
      step: o.step == null ? 1 : o.step, value: o.value,
      style: { width: (o.width || 200) + "px" },
      "aria-label": label,
    });
    const out = el("span.readout", o.format ? o.format(o.value) : String(o.value));
    input.addEventListener("input", () => {
      const v = Number(input.value);
      out.textContent = o.format ? o.format(v) : String(v);
      if (o.onInput) o.onInput(v);
    });
    const wrap = el("div.control", el("label", label), input, out);
    wrap.setValue = v => {
      input.value = v;
      out.textContent = o.format ? o.format(Number(v)) : String(v);
    };
    wrap.input = input;
    return wrap;
  }

  /** A segmented toggle. Returns the wrapper, with .select(value). */
  function toggleGroup(options, o) {
    o = o || {};
    const wrap = el("div.toggle-group");
    const buttons = options.map(opt => {
      const b = el("button", { type: "button" }, opt.label);
      b.dataset.value = opt.value;
      b.addEventListener("click", () => {
        wrap.select(opt.value);
        if (o.onChange) o.onChange(opt.value);
      });
      wrap.appendChild(b);
      return b;
    });
    wrap.select = v => buttons.forEach(b => b.classList.toggle("active", b.dataset.value === String(v)));
    wrap.select(o.value != null ? o.value : options[0].value);
    return wrap;
  }

  /** A labelled <select>. */
  function picker(label, options, o) {
    o = o || {};
    const sel = el("select", { "aria-label": label });
    options.forEach(opt => {
      const node = el("option", { value: opt.value }, opt.label);
      sel.appendChild(node);
    });
    if (o.value != null) sel.value = o.value;
    if (o.onChange) sel.addEventListener("change", () => o.onChange(sel.value));
    if (o.width) sel.style.width = o.width + "px";
    const wrap = el("div.control", label ? el("label", label) : null, sel);
    wrap.select = sel;
    return wrap;
  }

  function button(label, onClick, cls) {
    return el("button.btn" + (cls ? "." + cls : ""), { type: "button", onclick: onClick }, label);
  }

  /** Scene head: eyebrow, title, and an optional standfirst paragraph. */
  function head(eyebrow, title, standfirst) {
    return el("div.scene-head",
      eyebrow ? el("div.eyebrow", eyebrow) : null,
      el("h2", title),
      standfirst ? el("p.muted", standfirst) : null);
  }

  /** Is a dev flag set in the URL? Used only by headless verification. */
  function flag(name) {
    const h = window.location.hash || "";
    const s = window.location.search || "";
    return new RegExp("[#&?]" + name + "\\b").test(h + s);
  }

  /** The value of ?test=NAME or #test=NAME, or null. */
  function testMode() {
    const m = (window.location.hash + window.location.search).match(/test=([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }

  return {
    el, tex, itex, sentence, notation, callout, note,
    stat, statStrip, slider, toggleGroup, picker, button, head,
    flag, testMode,
  };
})();
