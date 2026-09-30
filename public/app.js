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
