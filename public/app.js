/* Flowline AI — demo chat, contact form, hero canvas, reveals, counters */
(function () {
  'use strict';

  /* ---------- hero flow canvas: gold particle streams ---------- */
  (function () {
    var cv = document.getElementById('flow');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var W, H, parts = [], running = true;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    function size() {
      var r = cv.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    function spawn(n) {
      parts = [];
      for (var i = 0; i < n; i++) parts.push(newP(true));
    }
    function newP(anyX) {
      var lane = Math.random() * H;
      return {
        x: anyX ? Math.random() * W : -20,
        lane: lane,
        speed: 0.4 + Math.random() * 1.4,
        amp: 12 + Math.random() * 38,
        freq: 0.002 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        r: 0.8 + Math.random() * 2.2,
        a: 0.12 + Math.random() * 0.5
      };
    }
    function tick() {
      if (!running) { requestAnimationFrame(tick); return; }
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.speed;
        var y = p.lane + Math.sin(p.x * p.freq + p.phase) * p.amp;
        var g = ctx.createRadialGradient(p.x, y, 0, p.x, y, p.r * 4);
        g.addColorStop(0, 'rgba(245,200,106,' + p.a + ')');
        g.addColorStop(1, 'rgba(245,200,106,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, y, p.r * 4, 0, 6.2832); ctx.fill();
        if (p.x > W + 30) parts[i] = newP(false);
      }
      requestAnimationFrame(tick);
    }
    size(); spawn(Math.min(90, Math.floor(W / 14))); tick();
    window.addEventListener('resize', function () { size(); spawn(Math.min(90, Math.floor(W / 14))); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { running = e[0].isIntersecting; })
        .observe(cv.parentElement);
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) running = false;
  })();

  /* ---------- hero logo: mouse-driven liquid flow ---------- */
  (function () {
    var wrap = document.querySelector('.hero-logo');
    var inner = document.getElementById('logoTrack');
    var hero = document.querySelector('.hero');
    var canvas = document.getElementById('logoFlow');
    if (!wrap || !inner || !hero || !canvas) return;
    var ctx = canvas.getContext('2d');

    var COLS = 8, ROWS = 6, N = 48, CELL = 440;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var sprite = new Image();
    var spriteReady = false;
    var place = new Image();
    var placeReady = false;

    function sizeCanvas() {
      var r = wrap.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var s = Math.max(1, Math.round(r.width * dpr));
      if (canvas.width !== s) { canvas.width = s; canvas.height = s; }
    }
    function blit(i, a) {
      var s = canvas.width;
      var c = i % COLS, r = Math.floor(i / COLS) % ROWS;
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, c * CELL, r * CELL, CELL, CELL, 0, 0, s, s);
      ctx.globalAlpha = 1;
    }

    /* Crossfade between neighbouring frames so the liquid melts smoothly
       instead of stepping, even at a slow frame rate. */
    function drawFrame(f) {
      var s = canvas.width;
      if (!s) return;
      ctx.clearRect(0, 0, s, s);
      if (spriteReady) {
        var i = Math.floor(f) % N;
        var frac = f - Math.floor(f);
        if (frac < 0.02 || frac > 0.98) { blit(i, 1); return; }
        blit(i, 1 - frac);
        blit((i + 1) % N, frac);
      } else if (placeReady) {
        ctx.drawImage(place, 0, 0, s, s);
      }
    }

    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    place.onload = function () { placeReady = true; drawFrame(0); };
    place.src = 'logo.png';
    sprite.onload = function () { spriteReady = true; drawFrame(0); };
    sprite.src = 'flow-sprite.webp';

    if (reduce) return; /* static first frame only */

    var flow = 0, vel = 0;
    var IDLE = 1.5 / 60; /* slow, smooth idle drift */
    var tx = 0, ty = 0, cx = 0, cy = 0;
    var lastX = null, lastY = null;
    var visible = true, raf = null;

    function loop() {
      vel += (IDLE - vel) * 0.03;              /* ease back to idle drift */
      flow = (flow + vel + N) % N;
      cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
      inner.style.transform = 'translate3d(' + (cx * 20).toFixed(2) + 'px,' + (cy * 14).toFixed(2) + 'px,0)' +
        ' rotateY(' + (cx * 6).toFixed(2) + 'deg) rotateX(' + (-cy * 6).toFixed(2) + 'deg)';
      drawFrame(flow);
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf && visible) loop(); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    function trackPoint(x, y) {
      var r = hero.getBoundingClientRect();
      var nx = (x - r.left - r.width / 2) / (r.width / 2);
      var ny = (y - r.top - r.height / 2) / (r.height / 2);
      tx = Math.max(-1, Math.min(1, nx));
      ty = Math.max(-1, Math.min(1, ny));
      if (lastX !== null) {
        var dx = x - lastX, dy = y - lastY;
        vel += (dx * 0.9 + dy * 0.35) * 0.02;  /* cursor stirs the flow, gently */
        vel = Math.max(-0.9, Math.min(0.9, vel));
      }
      lastX = x; lastY = y;
      start();
    }
    hero.addEventListener('mousemove', function (e) { trackPoint(e.clientX, e.clientY); });
    hero.addEventListener('touchmove', function (e) {
      if (e.touches.length) trackPoint(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    function release() { tx = 0; ty = 0; lastX = null; lastY = null; }
    hero.addEventListener('mouseleave', release);
    hero.addEventListener('touchend', release);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) start(); else stop();
      }).observe(hero);
    }
    start();
  })();

  /* ---------- scroll reveals ---------- */
  (function () {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- animated counters ---------- */
  (function () {
    var nums = document.querySelectorAll('.num[data-count]');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target;
        var target = parseInt(el.dataset.count, 10);
        var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
        var t0 = performance.now(), dur = 1400;
        (function step(t) {
          var k = Math.min(1, (t - t0) / dur);
          var eased = 1 - Math.pow(1 - k, 3);
          el.innerHTML = pre + Math.round(target * eased) + suf;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  })();

  /* ---------- demo chat ---------- */
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatText');
  var box = document.getElementById('chatMessages');
  var history = [];
  var busy = false;

  function scroll() { box.scrollTop = box.scrollHeight; }
  function addMsg(text, who) {
    var d = document.createElement('div');
    d.className = 'msg ' + who;
    d.textContent = text;
    box.appendChild(d);
    scroll();
    return d;
  }
  function send(text) {
    if (busy) return;
    var msg = (text || '').trim();
    if (!msg) return;
    busy = true;
    addMsg(msg, 'user');
    var typing = addMsg('Bella is typing…', 'bot typing');
    fetch('/api/demo-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: history })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        var reply = data.reply || "Hmm, I didn't catch that — ask me about bookings, hours, or the menu!";
        addMsg(reply, 'bot');
        history.push({ role: 'user', content: msg }, { role: 'assistant', content: reply });
        if (history.length > 12) history = history.slice(-12);
      })
      .catch(function () {
        typing.remove();
        addMsg("I'm having a little trouble right now — but I can still take your booking details! What's your name?", 'bot');
      })
      .finally(function () { busy = false; });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    send(input.value);
    input.value = '';
    input.focus();
  });
  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () { send(chip.dataset.prompt); });
  });

  /* ---------- contact form ---------- */
  var cForm = document.getElementById('contactForm');
  var cMsg = document.getElementById('formMsg');
  cForm.addEventListener('submit', function (e) {
    e.preventDefault();
    cMsg.textContent = 'Sending…';
    var fd = new FormData(cForm);
    var payload = {
      name: fd.get('name'), email: fd.get('email'),
      business: fd.get('business'), message: fd.get('message')
    };
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok) {
          cMsg.textContent = "You're in! We'll reply within one business day with your pilot plan.";
          cForm.reset();
        } else {
          cMsg.textContent = res.d.error || 'Something went wrong — try again.';
        }
      })
      .catch(function () { cMsg.textContent = 'Something went wrong — try again.'; });
  });
})();
