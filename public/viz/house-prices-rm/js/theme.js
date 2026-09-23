/* Light and dark. LIGHT IS THE DEFAULT, whatever the laptop's own setting,
   because a lit hall washes a dark page out. The 't' key flips it mid
   sentence, a choice made with 't' or the button is remembered, and a theme
   named in the URL hash wins over the stored one, which is how the headless
   screenshots ask for a theme without touching storage.

   Every colour lives in a CSS custom property, so a switch is one attribute on
   <html> and the SVG follows by itself. Nothing here resolves a colour, and
   nothing in the scenes should either.

   Copied from un-games-viz/js/theme.js. Changed: the storage key, and the
   fallback, which is light rather than the operating system's preference. */

window.Theme = (function () {
  "use strict";

  var root = document.documentElement;
  var KEY = "house-prices-rm-theme";

  function get() { return root.getAttribute("data-theme") || "light"; }

  function apply(t) {
    root.setAttribute("data-theme", t);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme: t } }));
  }

  function set(t) {
    apply(t);
    try { localStorage.setItem(KEY, t); } catch (e) { /* private browsing */ }
  }

  function toggle() { set(get() === "dark" ? "light" : "dark"); }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* private browsing */ }

    var forced = (window.location.hash || "").match(/theme=(light|dark)/);
    if (forced) saved = forced[1];

    apply(saved === "dark" ? "dark" : "light");

    window.addEventListener("keydown", function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName || "")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "t" || e.key === "T") toggle();
    });
  }

  return { get: get, set: set, toggle: toggle, init: init };
})();
