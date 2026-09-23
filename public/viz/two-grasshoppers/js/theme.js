/* Light and dark. Light is the default whatever the laptop's own setting,
   because a lit hall washes a dark page out. The 't' key flips it mid
   sentence and the choice is remembered in this browser; a theme named in the
   URL hash wins over both, which is how the headless screenshots ask for a
   theme without touching storage.

   Every colour lives in a CSS custom property, so a switch is one attribute on
   <html> and the SVG follows by itself. Nothing here resolves a colour, and
   nothing in the scenes should either.

   From un-games-viz/js/theme.js by way of the house price page, with its own
   storage key and without the fall back to the system's dark mode. */

window.Theme = (function () {
  "use strict";

  var root = document.documentElement;
  var KEY = "one-grasshopper-then-two-theme";

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
    if (forced) apply(forced[1]);
    else apply(saved === "dark" ? "dark" : "light");

    window.addEventListener("keydown", function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName || "")) return;
      if (e.key === "t" || e.key === "T") toggle();
    });
  }

  return { get: get, set: set, toggle: toggle, init: init };
})();
