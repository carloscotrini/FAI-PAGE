/* The scene engine.
 *
 * Each scene file registers window.scenes.sceneN(root) and may return
 * { onEnter, onLeave, onNextKey, onPrevKey }. Returning true from onNextKey
 * consumes the keystroke, which is how a scene that stages internally holds on
 * to the arrow keys until it is finished.
 *
 * Hash routing is mandatory. #scene=2 deep links straight into a scene, which
 * saves the lecturer mid lecture and saves anyone verifying the page from
 * clicking Next three times per reload. Three more flags ride the same hash
 * and are dev affordances rather than user features:
 *
 *   &run          trip the scene's primary gated button, and drop the fade so
 *                 a headless capture is not caught mid transition
 *   &theme=dark   force a theme without touching storage
 *   &test=NAME    a scene specific jump to a state a screenshot cannot reach
 *                 by itself. scene 2 takes test=mid and test=end.
 *
 * Globals used: window.Theme, window.scenes, window.Net. */

(function () {
  'use strict';

  var SCENE_TITLES = [
    '',
    'A day, and a straight line',
    'One network, training',
    'More units, more bends'
  ];

  var current = -1;
  var sceneNodes = [];
  var sceneState = [];

  function hash() {
    return (window.location.hash || '') + (window.location.search || '');
  }

  function readHashScene() {
    var m = (window.location.hash || '').match(/scene=(\d+)/);
    if (!m) return null;
    var n = parseInt(m[1], 10);
    return (isFinite(n) && n >= 0 && n < SCENE_TITLES.length) ? n : null;
  }

  function writeHashScene(idx) {
    var h = window.location.hash || '';
    var next = /scene=\d+/.test(h)
      ? h.replace(/scene=\d+/, 'scene=' + idx)
      : (h ? h + '&scene=' + idx : '#scene=' + idx);
    if (next !== h) history.replaceState(null, '', next);
  }

  function flags() {
    var h = hash();
    var test = h.match(/test=([A-Za-z0-9_-]+)/);
    return {
      run: /[#&?]run\b/.test(h),
      test: test ? test[1] : null,
      instant: /[#&?](run|test=)/.test(h)
    };
  }
  window.VizFlags = flags;

  function handleNext() {
    var st = sceneState[current];
    if (st && st.onNextKey && st.onNextKey()) return;
    goTo(current + 1);
  }

  function handlePrev() {
    var st = sceneState[current];
    if (st && st.onPrevKey && st.onPrevKey()) return;
    goTo(current - 1);
  }

  function goTo(idx) {
    if (idx < 0 || idx >= SCENE_TITLES.length) return;
    if (idx === current) return;

    var stage = document.getElementById('stage');
    var oldNode = sceneNodes[current];
    if (oldNode) {
      oldNode.classList.remove('active');
      var oldState = sceneState[current];
      if (oldState && oldState.onLeave) oldState.onLeave();
    }

    if (!sceneNodes[idx]) {
      var node = document.createElement('div');
      node.className = 'scene';
      node.setAttribute('data-scene', idx);
      stage.appendChild(node);
      sceneNodes[idx] = node;
      var builder = window.scenes && window.scenes['scene' + idx];
      if (builder) {
        try {
          sceneState[idx] = builder(node) || {};
        } catch (err) {
          console.error('Scene ' + idx + ' builder threw:', err);
          node.innerHTML = '<div class="scene-stub"><h2>Scene ' + idx +
            '</h2><p class="muted">' + err.message + '</p></div>';
        }
      } else {
        node.innerHTML = '<div class="scene-stub"><h2>Scene ' + idx +
          '</h2><p class="muted">Builder not registered.</p></div>';
      }
    } else if (sceneState[idx] && sceneState[idx].onEnter) {
      sceneState[idx].onEnter();
    }

    current = idx;

    // Under headless capture the fade would be caught mid transition and the
    // whole page would read as a ghost, so a dev flag skips it.
    if (flags().instant) {
      sceneNodes[idx].style.transition = 'none';
      sceneNodes[idx].classList.add('active');
    } else {
      setTimeout(function () { sceneNodes[idx].classList.add('active'); }, 20);
    }

    document.getElementById('scene-title').textContent = SCENE_TITLES[idx] || '';
    var dots = document.querySelectorAll('#dots .dot');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('active', i === idx);
    }
    document.getElementById('prev-btn').disabled = idx === 0;
    document.getElementById('next-btn').disabled = idx === SCENE_TITLES.length - 1;
    writeHashScene(idx);
  }

  function init() {
    window.Theme.init();
    document.getElementById('theme-toggle')
      .addEventListener('click', function () { window.Theme.toggle(); });

    var dotsEl = document.getElementById('dots');
    SCENE_TITLES.forEach(function (t, i) {
      var dot = document.createElement('button');
      dot.className = 'dot';
      dot.setAttribute('aria-label', 'Scene ' + i + (t ? ', ' + t : ''));
      dot.title = t || 'Title';
      dot.addEventListener('click', function () { goTo(i); });
      dotsEl.appendChild(dot);
    });

    document.getElementById('prev-btn').addEventListener('click', handlePrev);
    document.getElementById('next-btn').addEventListener('click', handleNext);

    window.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName || '')) return;
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    });

    window.addEventListener('hashchange', function () {
      var n = readHashScene();
      if (n != null) goTo(n);
    });

    // The one thing that must be true before anything is projected: the film
    // the page replays has to agree with the numbers the builder stored.
    window.Net.selfCheck();

    var start = readHashScene();
    goTo(start != null ? start : 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SceneEngine = { goTo: goTo, current: function () { return current; } };
})();
