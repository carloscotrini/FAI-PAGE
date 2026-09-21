/* Light and dark. Light is the lecture default, because a lit hall washes a
 * dark deck out; dark is for reading it alone afterwards. Every colour lives
 * in a CSS custom property, so a switch is one attribute on <html> and the SVG
 * follows by itself. The 't' key flips it mid sentence.
 *
 * A scene that caches a resolved colour would break here. None does: nothing
 * in this viz writes a colour from JavaScript. */

window.Theme = (function () {
  var root = document.documentElement;
  var KEY = 'nn-fit-landscape-theme';

  function get() { return root.getAttribute('data-theme') || 'light'; }

  function set(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (e) { /* private browsing */ }
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: t } }));
  }

  function toggle() { set(get() === 'dark' ? 'light' : 'dark'); }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* private browsing */ }

    // A theme forced in the URL wins, so a headless capture can ask for either
    // one without touching storage. Dev affordance, not a user feature.
    var forced = (window.location.hash || '').match(/theme=(light|dark)/);
    if (forced) saved = forced[1];

    if (!saved) {
      saved = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark' : 'light';
    }
    set(saved);

    window.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName || '')) return;
      if (e.key === 't' || e.key === 'T') toggle();
    });
  }

  return { get: get, set: set, toggle: toggle, init: init };
})();
