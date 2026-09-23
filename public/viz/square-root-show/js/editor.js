/* Square One: the live coding editor (page 3). window.LiveEditor.
 *
 * A transparent <textarea> over a highlighted <pre>: the textarea takes the
 * typing, the caret and the selection, the pre shows the colours. Both use
 * the same font, size, padding and line height, and the pre follows the
 * textarea's scroll, so the colours sit exactly under the invisible text.
 *
 * Keys: Tab inserts 4 spaces (Shift+Tab takes up to 4 away); Enter keeps
 * the indent and adds 4 after a line ending in ':'; Backspace inside an
 * indent removes back to the previous multiple of 4; Ctrl/Cmd+Enter runs;
 * Escape leaves the editor. Edits go through execCommand('insertText') when
 * the browser has it, so the browser's own undo keeps working.
 *
 * The text is kept in localStorage (inside try/catch) and comes back on a
 * reload. Nothing here runs the code: the run page runs the canonical code.
 */
(function () {
  'use strict';

  var UI = window.UI;
  var H = window.PyHighlight;

  var KEY_TEXT = 'squareone.editor.text.v1';
  var KEY_SIZE = 'squareone.editor.size.v1';
  var SIZES = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.5];
  var DEFAULT_SIZE = 3;
  var INDENT = '    ';

  function LiveEditor(root, opts) {
    var self = this;
    this.root = root;
    this.opts = opts || {};
    this.ta = root.querySelector('.ed-input');
    this.hl = root.querySelector('.ed-hl code');
    this.hlPre = root.querySelector('.ed-hl');
    this.nums = root.querySelector('.ed-nums');
    this.gutter = root.querySelector('.ed-gutter');
    this.curline = root.querySelector('.ed-curline');
    this.clearBtn = root.querySelector('[data-act="clear"]');
    this.saveTimer = 0;
    this.clearTimer = 0;
    this.persist = true;
    this.lineCount = -1;

    var size = parseInt(UI.store.get(KEY_SIZE), 10);
    this.sizeIndex = isNaN(size) ? DEFAULT_SIZE : Math.max(0, Math.min(SIZES.length - 1, size));
    this.applySize();

    var saved = UI.store.get(KEY_TEXT);
    this.ta.value = saved || '';
    this.render();

    this.ta.addEventListener('input', function () {
      self.render();
      self.scheduleSave();
    });
    this.ta.addEventListener('scroll', function () { self.syncScroll(); });
    this.ta.addEventListener('keydown', function (e) { self.onKey(e); });
    this.ta.addEventListener('focus', function () { root.classList.add('focused'); self.updateCaret(); });
    this.ta.addEventListener('blur', function () { root.classList.remove('focused'); });
    ['keyup', 'click', 'select', 'mouseup'].forEach(function (ev) {
      self.ta.addEventListener(ev, function () { self.updateCaret(); });
    });
    document.addEventListener('selectionchange', function () {
      if (document.activeElement === self.ta) { self.updateCaret(); }
    });

    root.querySelector('[data-act="smaller"]').addEventListener('click', function () { self.resize(-1); });
    root.querySelector('[data-act="bigger"]').addEventListener('click', function () { self.resize(1); });
    this.clearBtn.addEventListener('click', function () { self.askClear(); });
    root.querySelector('[data-act="run"]').addEventListener('click', function () {
      if (self.opts.onRun) { self.opts.onRun(); }
    });
    window.addEventListener('resize', function () { self.updateCaret(); });
  }

  // ===== drawing =====

  LiveEditor.prototype.render = function () {
    var v = this.ta.value;
    // A trailing newline needs a character after it, or the pre is one line
    // shorter than the textarea and the last line's colours drift.
    this.hl.innerHTML = H.highlight(v) + (v.charAt(v.length - 1) === '\n' || v === '' ? ' ' : '');
    var n = v.split('\n').length;
    if (n !== this.lineCount) {
      var s = '';
      for (var i = 1; i <= n; i++) { s += (i > 1 ? '\n' : '') + '<span data-l="' + i + '">' + i + '</span>'; }
      this.nums.innerHTML = s;
      this.lineCount = n;
    }
    this.syncScroll();
    this.updateCaret();
  };

  LiveEditor.prototype.syncScroll = function () {
    this.hlPre.scrollTop = this.ta.scrollTop;
    this.hlPre.scrollLeft = this.ta.scrollLeft;
    this.gutter.scrollTop = this.ta.scrollTop;
    this.updateCaret();
  };

  LiveEditor.prototype.lineHeightPx = function () {
    var cs = window.getComputedStyle(this.ta);
    var lh = parseFloat(cs.lineHeight);
    if (isNaN(lh)) { lh = parseFloat(cs.fontSize) * 1.55; }
    return lh;
  };

  LiveEditor.prototype.updateCaret = function () {
    var v = this.ta.value;
    var pos = this.ta.selectionStart || 0;
    var line = v.slice(0, pos).split('\n').length - 1;
    var cs = window.getComputedStyle(this.ta);
    var padTop = parseFloat(cs.paddingTop) || 0;
    var top = padTop + line * this.lineHeightPx() - this.ta.scrollTop;
    this.curline.style.transform = 'translateY(' + top.toFixed(2) + 'px)';
    var prev = this.nums.querySelector('.cur');
    if (prev) { prev.classList.remove('cur'); }
    var cur = this.nums.querySelector('[data-l="' + (line + 1) + '"]');
    if (cur) { cur.classList.add('cur'); }
  };

  LiveEditor.prototype.applySize = function () {
    this.root.style.setProperty('--ed-size', SIZES[this.sizeIndex] + 'rem');
  };

  LiveEditor.prototype.resize = function (d) {
    this.sizeIndex = Math.max(0, Math.min(SIZES.length - 1, this.sizeIndex + d));
    this.applySize();
    UI.store.set(KEY_SIZE, String(this.sizeIndex));
    this.syncScroll();
    this.ta.focus();
  };

  LiveEditor.prototype.setSizeIndex = function (i) {
    this.sizeIndex = Math.max(0, Math.min(SIZES.length - 1, i));
    this.applySize();
    this.syncScroll();
  };

  // ===== saving =====

  LiveEditor.prototype.scheduleSave = function () {
    var self = this;
    if (!this.persist) { return; }
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(function () { UI.store.set(KEY_TEXT, self.ta.value); }, 250);
  };

  // Used by the "code" dev flag: fills the editor without saving it.
  LiveEditor.prototype.setText = function (text, save) {
    this.persist = !!save;
    this.ta.value = text;
    this.render();
  };

  LiveEditor.prototype.askClear = function () {
    var self = this;
    if (this.ta.value === '') { this.ta.focus(); return; }
    if (this.clearBtn.classList.contains('confirm')) {
      window.clearTimeout(this.clearTimer);
      this.clearBtn.classList.remove('confirm');
      this.ta.focus();
      this.ta.select();
      if (!this.exec('delete', '')) {
        this.ta.value = '';
      }
      this.persist = true;
      this.render();
      UI.store.set(KEY_TEXT, '');
      return;
    }
    this.clearBtn.classList.add('confirm');
    this.clearTimer = window.setTimeout(function () { self.clearBtn.classList.remove('confirm'); }, 2600);
  };

  // ===== editing =====

  LiveEditor.prototype.exec = function (cmd, text) {
    var ok = false;
    try { ok = document.execCommand(cmd, false, text); } catch (e) { ok = false; }
    return ok;
  };

  // Replaces [start, end) with text and leaves the caret at the end of it.
  LiveEditor.prototype.replace = function (start, end, text) {
    var ta = this.ta;
    ta.focus();
    ta.setSelectionRange(start, end);
    var ok = text === '' ? this.exec('delete', '') : this.exec('insertText', text);
    if (!ok) {
      ta.setRangeText(text, start, end, 'end');
      this.render();
      this.scheduleSave();
    }
  };

  LiveEditor.prototype.lineStart = function (pos) {
    return this.ta.value.lastIndexOf('\n', pos - 1) + 1;
  };

  LiveEditor.prototype.onKey = function (e) {
    var ta = this.ta;
    var v = ta.value;
    var s = ta.selectionStart;
    var t = ta.selectionEnd;
    var ls;

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (this.opts.onRun) { this.opts.onRun(); }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      ta.blur();
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) { return; }

    if (e.key === 'Tab') {
      e.preventDefault();
      var multi = v.slice(s, t).indexOf('\n') >= 0;
      if (e.shiftKey || multi) {
        this.shiftLines(s, t, e.shiftKey ? -1 : 1);
      } else {
        this.replace(s, t, INDENT);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      ls = this.lineStart(s);
      var before = v.slice(ls, s);
      var indent = /^ */.exec(before)[0];
      var code = before.replace(/#.*$/, '').replace(/\s+$/, '');
      if (code.charAt(code.length - 1) === ':') { indent += INDENT; }
      this.replace(s, t, '\n' + indent);
      return;
    }

    if (e.key === 'Backspace' && s === t && s > 0) {
      ls = this.lineStart(s);
      var lead = v.slice(ls, s);
      if (lead.length > 0 && /^ +$/.test(lead)) {
        e.preventDefault();
        var n = lead.length % 4 || 4;
        this.replace(s - n, s, '');
      }
    }
  };

  // Indents (dir 1) or dedents (dir -1) every line the selection touches.
  LiveEditor.prototype.shiftLines = function (s, t, dir) {
    var ta = this.ta;
    var v = ta.value;
    var a = this.lineStart(s);
    var endIdx = t > s && v.charAt(t - 1) === '\n' ? t - 1 : t;
    var b = v.indexOf('\n', endIdx);
    if (b < 0) { b = v.length; }
    var lines = v.slice(a, b).split('\n');
    var firstDelta = 0;
    var total = 0;
    var out = lines.map(function (line, i) {
      var d;
      if (dir > 0) {
        d = INDENT.length;
        line = INDENT + line;
      } else {
        var lead = /^ */.exec(line)[0].length;
        d = -Math.min(lead, INDENT.length);
        line = line.slice(-d);
      }
      if (i === 0) { firstDelta = d; }
      total += d;
      return line;
    });
    var text = out.join('\n');
    this.replace(a, b, text);
    var ns = Math.max(a, s + firstDelta);
    var nt = t + total;
    if (s === t) { nt = ns; }
    ta.setSelectionRange(ns, Math.max(ns, nt));
    this.updateCaret();
  };

  LiveEditor.prototype.focus = function () {
    var ta = this.ta;
    window.setTimeout(function () {
      try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
    }, 60);
  };

  LiveEditor.prototype.leave = function () {
    if (document.activeElement === this.ta) { this.ta.blur(); }
  };

  window.LiveEditor = LiveEditor;
}());
