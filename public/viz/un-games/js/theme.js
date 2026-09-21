/* Theme toggle. Light is the lecture default, because a lit hall washes a dark
 * deck out. Dark is for solo study. Persists in localStorage, respects the
 * operating system preference on a first visit, and answers the 't' key so the
 * lecturer can flip it mid sentence.
 *
 * Every colour lives in a CSS custom property, so a switch is one attribute on
 * <html> and the SVG follows along by itself. Scenes that cache a resolved
 * colour (d3 scales, canvas fills) should listen for the 'theme-change' event
 * and re-render. */

window.Theme = (function () {
  const root = document.documentElement;
  const KEY = 'un-games-viz-theme';

  function get() { return root.getAttribute('data-theme') || 'light'; }

  function set(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (e) { /* private browsing */ }
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: t } }));
  }

  function toggle() { set(get() === 'dark' ? 'light' : 'dark'); }

  /** Resolve a CSS custom property to its current value, e.g. '--role-causal'. */
  function readVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function init() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* private browsing */ }

    // A forced theme in the URL wins, so headless capture can ask for either
    // one without touching storage. Dev affordance, not a user feature.
    const forced = (window.location.hash || '').match(/theme=(light|dark)/);
    if (forced) saved = forced[1];

    if (!saved) {
      saved = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark' : 'light';
    }
    set(saved);

    window.addEventListener('keydown', e => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName || '')) return;
      if (e.key === 't' || e.key === 'T') toggle();
    });
  }

  return { get, set, toggle, init, readVar };
})();
