/* Small DOM builders, so a scene file reads as the picture it makes rather
 * than as a wall of createElement calls.
 *
 * There is no KaTeX in this viz and there should not be. The audience is a room
 * of managers, and the house rule for them is words rather than symbols: the
 * one formula this story needs is written out as "one ramp plus one ramp plus
 * one ramp", in the same typeface as the sentence around it.
 *
 * Globals used: none. */

window.UI = (function () {

  /** el('div.foo.bar', { title: 'x' }, child, child, 'text')
   *
   *  The second argument is an attribute bag only when it is a plain object.
   *  An ARRAY there is a list of children, which matters because
   *  `el('div', xs.map(...))` is the natural way to write a list. */
  function el(spec, attrs) {
    const kids = Array.prototype.slice.call(arguments, 2);
    const m = String(spec).split('.');
    const node = document.createElement(m[0] || 'div');
    m.slice(1).forEach(function (c) { node.classList.add(c); });
    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)
        && !(attrs instanceof Node)) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'style') Object.assign(node.style, attrs[k]);
        else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    } else if (attrs != null) {
      kids.unshift(attrs);
    }
    kids.forEach(function flatten(k) {
      if (Array.isArray(k)) { k.forEach(flatten); return; }
      if (k == null || k === false) return;
      node.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    });
    return node;
  }

  /** Scene head: eyebrow, title, and an optional standfirst. */
  function head(eyebrow, title, standfirst) {
    return el('div.scene-head',
      eyebrow ? el('div.eyebrow', eyebrow) : null,
      el('h2', title),
      standfirst ? el('p.muted', standfirst) : null);
  }

  function callout(title) {
    const body = Array.prototype.slice.call(arguments, 1);
    return el('div.callout', el('div.callout-title', title), body);
  }

  function note(title) {
    const body = Array.prototype.slice.call(arguments, 1);
    return el('div.sidebar-note', el('span.sidebar-title', title), body);
  }

  function stat(value, label, cls) {
    const node = el('div.stat',
      el('div.stat-value' + (cls ? '.' + cls : ''), value),
      el('div.stat-label', label));
    node.set = function (v) { node.firstChild.textContent = v; };
    return node;
  }

  /** A labelled slider. `onInput` receives the numeric value. */
  function slider(label, o) {
    const input = el('input', {
      type: 'range', min: o.min, max: o.max,
      step: o.step == null ? 1 : o.step, value: o.value,
      style: { width: (o.width || 190) + 'px' },
      'aria-label': label,
    });
    const out = el('span.readout', o.format ? o.format(o.value) : String(o.value));
    input.addEventListener('input', function () {
      const v = Number(input.value);
      out.textContent = o.format ? o.format(v) : String(v);
      if (o.onInput) o.onInput(v);
    });
    const wrap = el('div.control', el('label', label), input, out);
    wrap.setValue = function (v) {
      input.value = v;
      out.textContent = o.format ? o.format(Number(v)) : String(v);
    };
    wrap.input = input;
    return wrap;
  }

  /** A segmented toggle. Returns the wrapper, with .select(value). */
  function toggleGroup(options, o) {
    o = o || {};
    const wrap = el('div.toggle-group');
    const buttons = options.map(function (opt) {
      const b = el('button', { type: 'button' }, opt.label);
      b.dataset.value = opt.value;
      b.addEventListener('click', function () {
        wrap.select(opt.value);
        if (o.onChange) o.onChange(opt.value);
      });
      wrap.appendChild(b);
      return b;
    });
    wrap.select = function (v) {
      buttons.forEach(function (b) { b.classList.toggle('active', b.dataset.value === String(v)); });
    };
    wrap.select(o.value != null ? o.value : options[0].value);
    return wrap;
  }

  function button(label, onClick, cls) {
    return el('button.btn' + (cls ? '.' + cls : ''), { type: 'button', onclick: onClick }, label);
  }

  /** The line that has to appear wherever these counts are drawn. */
  function syntheticStamp(extra) {
    const m = window.DATA.meta;
    return el('div.synthetic-stamp',
      'Synthetic data. ' + m.days + ' simulated days at one dock of a fictional '
      + 'operator, drawn with seed ' + m.seed + ' by precompute/velozueri.py.'
      + (extra ? ' ' + extra : ''));
  }

  /** Is a dev flag set in the URL? Used only by headless verification. */
  function flag(name) {
    const h = window.location.hash || '';
    const s = window.location.search || '';
    return new RegExp('[#&?]' + name + '\\b').test(h + s);
  }

  /** The value of #test=NAME or ?test=NAME, or null. */
  function testMode() {
    const m = (window.location.hash + window.location.search).match(/test=([A-Za-z0-9_.-]+)/);
    return m ? m[1] : null;
  }

  return { el, head, callout, note, stat, slider, toggleGroup, button,
           syntheticStamp, flag, testMode };

})();
