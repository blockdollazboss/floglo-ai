/* FloGlo AI — logo cursor: 34px logo (nav-logo size), smooth slow spin ~16s/rev,
   breathing cyan glow, tasteful trail + click ripple.
   Fine pointers only. Reduced-motion and no-JS fall back to the static frame. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!window.matchMedia('(pointer: fine)').matches) return; /* touch: native cursors */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('flo-cursor-static');
    return;
  }
  var FRAMES = 48, SPEED = 333, frame = 0, i; /* 48 x 333ms ~= 16s per revolution */
  function pad(n) { return ('0' + n).slice(-2); }
  for (i = 0; i < FRAMES; i++) {
    (new Image()).src = 'cursor-' + pad(i) + '.png?v=4';
  }
  function apply() {
    root.style.setProperty('--cur', 'url("cursor-' + pad(frame) + '.png?v=4") 32 32, auto');
  }
  root.classList.add('flo-cursor');
  apply();
  setInterval(function () { frame = (frame + 1) % FRAMES; apply(); }, SPEED);

  /* tasteful glow trail */
  var last = 0;
  document.addEventListener('mousemove', function (e) {
    var now = performance.now();
    if (now - last < 60) return;
    last = now;
    var d = document.createElement('div');
    d.className = 'fx-trail';
    d.style.left = e.clientX + 'px';
    d.style.top = e.clientY + 'px';
    document.body.appendChild(d);
    d.addEventListener('animationend', function () { d.remove(); });
  });

  /* click ripple */
  document.addEventListener('click', function (e) {
    var r = document.createElement('div');
    r.className = 'fx-ripple';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.body.appendChild(r);
    r.addEventListener('animationend', function () { r.remove(); });
  });
})();
