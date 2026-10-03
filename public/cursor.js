/* FloGlo AI — logo cursor (B / Large): slow-spinning logo, ~3s per revolution.
   Fine pointers only. Reduced-motion and no-JS fall back to the static frame. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!window.matchMedia('(pointer: fine)').matches) return; /* touch: native cursors */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('flo-cursor-static');
    return;
  }
  var FRAMES = 12, SPEED = 250, frame = 0, i;
  for (i = 0; i < FRAMES; i++) {
    (new Image()).src = 'cursor-b-' + ('0' + i).slice(-2) + '.png';
  }
  function apply() {
    root.style.setProperty('--cur',
      'url("cursor-b-' + ('0' + frame).slice(-2) + '.png") 24 24, auto');
  }
  root.classList.add('flo-cursor');
  apply();
  setInterval(function () { frame = (frame + 1) % FRAMES; apply(); }, SPEED);
})();
