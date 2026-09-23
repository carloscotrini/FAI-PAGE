/* Square One: a small Python highlighter.
 *
 * Turns source text into HTML spans with the classes tk-k (keyword), tk-f
 * (a function name: after def, or in front of a bracket), tk-b (a builtin
 * such as abs), tk-n (number), tk-s (string), tk-c (comment) and tk-o
 * (operators and brackets). Everything else is escaped text. Colours live
 * in css/code.css, never here.
 *
 * A tokenizer is all a live coding screen needs; nothing here parses Python.
 * Like logic.js it also runs under node, where the test checks that the
 * output, stripped of its tags, is the input again.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.PyHighlight = api;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function toSet(words) {
    var o = {};
    for (var i = 0; i < words.length; i++) { o[words[i]] = true; }
    return o;
  }

  var KEYWORDS = toSet(('and as assert async await break class continue def del elif else except ' +
    'finally for from global if import in is lambda nonlocal not or pass raise return try while ' +
    'with yield True False None').split(' '));

  var BUILTINS = toSet(('abs print range len min max round int float str list dict set tuple ' +
    'sum sorted enumerate zip map filter input type pow bool reversed').split(' '));

  var TOKEN = new RegExp([
    '(#[^\\n]*)',                                                   // 1 comment
    '("""[\\s\\S]*?(?:"""|$)|\'\'\'[\\s\\S]*?(?:\'\'\'|$)|"(?:[^"\\\\\\n]|\\\\.)*"?|\'(?:[^\'\\\\\\n]|\\\\.)*\'?)', // 2 string
    '(\\d+\\.?\\d*(?:[eE][+-]?\\d+)?|\\.\\d+(?:[eE][+-]?\\d+)?)',  // 3 number
    '([A-Za-z_][A-Za-z0-9_]*)',                                     // 4 name
    '([ \\t]+|\\s)',                                                // 5 space
    '([\\s\\S])'                                                    // 6 any other single character
  ].join('|'), 'g');

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function span(cls, text) {
    return '<span class="tk-' + cls + '">' + esc(text) + '</span>';
  }

  // The next character after position i that is not a space or a tab.
  function nextSolid(code, i) {
    while (i < code.length && (code.charAt(i) === ' ' || code.charAt(i) === '\t')) { i += 1; }
    return code.charAt(i);
  }

  function highlight(code) {
    var out = '';
    var prevWord = '';
    var m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(code)) !== null) {
      if (m[0] === '') { TOKEN.lastIndex += 1; continue; }
      if (m[1] !== undefined) {
        out += span('c', m[1]);
        prevWord = '';
      } else if (m[2] !== undefined) {
        out += span('s', m[2]);
        prevWord = '';
      } else if (m[3] !== undefined) {
        out += span('n', m[3]);
        prevWord = '';
      } else if (m[4] !== undefined) {
        var w = m[4];
        var after = nextSolid(code, TOKEN.lastIndex);
        if (KEYWORDS[w]) {
          out += span('k', w);
        } else if (prevWord === 'def' || prevWord === 'class') {
          out += span('f', w);
        } else if (BUILTINS[w] && after === '(') {
          out += span('b', w);
        } else if (after === '(') {
          out += span('f', w);
        } else {
          out += esc(w);
        }
        prevWord = w;
      } else if (m[5] !== undefined) {
        out += m[5];
      } else {
        out += span('o', m[6]);
        prevWord = '';
      }
    }
    return out;
  }

  return { highlight: highlight, esc: esc, KEYWORDS: KEYWORDS, BUILTINS: BUILTINS };
}));
