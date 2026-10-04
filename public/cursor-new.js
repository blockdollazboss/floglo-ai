/* FloGlo AI — true custom cursor (v5).
   The native arrow is hidden; the logo itself becomes the pointer, so the
   spin is GPU-composited and perfectly continuous — no frame stepping, no
   flicker. Exact pointer tracking (no lag), breathing glow, subtle trail,
   click ripple. Links/buttons grow it; text fields show a caret.
   Fine pointers only. Touch / reduced-motion / no-JS keep native cursors. */
(function () {
  'use strict';
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var root = document.documentElement;
  var IMG = 'cursor-00.png?v=5';

  var css = [
    'html.flo-cursor5,html.flo-cursor5 *{cursor:none !important;}',
    '#floCursor{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;opacity:0;transition:opacity .25s ease;}',
    '#floCursor .fc-pos{will-change:transform;}',
    '#floCursor .fc-center{position:relative;width:64px;height:64px;transform:translate(-50%,-50%) scale(1);transition:transform .18s ease;}',
    '#floCursor.fc-hover .fc-center{transform:translate(-50%,-50%) scale(1.35);}',
    '#floCursor .fc-spin{display:block;width:64px;height:64px;animation:fcSpin 16s linear infinite,fcGlow 2.8s ease-in-out infinite;}',
    '@keyframes fcSpin{to{transform:rotate(360deg);}}',
    '@keyframes fcGlow{0%,100%{filter:drop-shadow(0 0 6px rgba(62,226,255,.95)) drop-shadow(0 0 16px rgba(62,226,255,.45));}50%{filter:drop-shadow(0 0 10px rgba(62,226,255,1)) drop-shadow(0 0 28px rgba(62,226,255,.6));}}',
    '#floCursor .fc-ibeam{display:none;position:absolute;left:50%;top:50%;width:3px;height:26px;margin:-13px 0 0 -1.5px;border-radius:2px;background:#9beaff;box-shadow:0 0 8px rgba(62,226,255,.9),0 0 20px rgba(62,226,255,.4);animation:fcBlink 1.1s steps(2,start) infinite;}',
    '@keyframes fcBlink{50%{opacity:.25;}}',
    '#floCursor.fc-text .fc-spin{display:none;}',
    '#floCursor.fc-text .fc-ibeam{display:block;}',
    '.fc-trail{position:fixed;left:0;top:0;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:radial-gradient(circle,rgba(155,234,255,.85) 0%,rgba(62,226,255,.25) 60%,rgba(62,226,255,0) 70%);pointer-events:none;z-index:2147483646;transition:transform .32s ease-out,opacity .32s ease-out;}',
    '.fc-ripple{position:fixed;left:0;top:0;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:2px solid rgba(62,226,255,.8);pointer-events:none;z-index:2147483646;transition:transform .45s ease-out,opacity .45s ease-out;}'
  ].join('');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var el = document.createElement('div');
  el.id = 'floCursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="fc-pos"><div class="fc-center">' +
    '<img class="fc-spin" src="' + IMG + '" alt="">' +
    '<div class="fc-ibeam"></div>' +
    '</div></div>';
  document.body.appendChild(el);
  var posEl = el.firstChild;
  var img = el.querySelector('.fc-spin');

  /* Safety: if the logo image fails, hand the native cursor back. */
  var imgOk = false;
  function nativeFallback() {
    root.classList.remove('flo-cursor5');
    if (el.parentNode) el.parentNode.removeChild(el);
  }
  img.addEventListener('load', function () { imgOk = true; });
  img.addEventListener('error', nativeFallback);
  if (img.complete && img.naturalWidth) imgOk = true;
  setTimeout(function () { if (!imgOk) nativeFallback(); }, 2500);

  root.classList.add('flo-cursor5');

  var tx = window.innerWidth / 2, ty = window.innerHeight / 2, shown = false;
  window.addEventListener('pointermove', function (e) {
    tx = e.clientX; ty = e.clientY;
    if (!shown) { shown = true; el.style.opacity = '1'; }
  }, { passive: true });
  document.addEventListener('mouseleave', function () {
    shown = false; el.style.opacity = '0';
  });

  (function loop() {
    posEl.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    requestAnimationFrame(loop);
  })();

  var hoverSel = 'a, button, [role="button"], summary, input[type="submit"], input[type="button"], label';
  var textSel = 'input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select, [contenteditable="true"]';
  document.addEventListener('mouseover', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest(textSel)) { el.classList.add('fc-text'); el.classList.remove('fc-hover'); }
    else if (t.closest(hoverSel)) { el.classList.add('fc-hover'); el.classList.remove('fc-text'); }
    else { el.classList.remove('fc-hover'); el.classList.remove('fc-text'); }
  }, { passive: true });

  /* Trail: small fading glow dots, capped so it never gets busy. */
  var dots = [];
  var lastDot = 0;
  window.addEventListener('pointermove', function (e) {
    var now = performance.now();
    if (now - lastDot < 28) return;
    lastDot = now;
    var d = document.createElement('div');
    d.className = 'fc-trail';
    d.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) scale(1)';
    document.body.appendChild(d);
    dots.push(d);
    if (dots.length > 26) {
      var old = dots.shift();
      if (old.parentNode) old.parentNode.removeChild(old);
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      d.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) scale(.2)';
      d.style.opacity = '0';
    }); });
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 380);
  }, { passive: true });

  /* Click ripple. */
  window.addEventListener('pointerdown', function (e) {
    var r = document.createElement('div');
    r.className = 'fc-ripple';
    r.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) scale(.4)';
    r.style.opacity = '1';
    document.body.appendChild(r);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      r.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) scale(2.6)';
      r.style.opacity = '0';
    }); });
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 500);
  }, { passive: true });
})();
