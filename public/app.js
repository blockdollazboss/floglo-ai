/* FloGlo AI — demo chat, contact form, 3D tilt, reveals, counters,
   floating site assistant, sticky mobile CTA */
(function () {
  'use strict';

  /* ---------- 3D tilt: cards and the demo phone lean toward the cursor ---------- */
  (function () {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.card, .phone').forEach(function (el) {
      var raf = null;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          el.style.transform =
            'perspective(900px) rotateY(' + (px * 9).toFixed(2) + 'deg)' +
            ' rotateX(' + (-py * 9).toFixed(2) + 'deg) translateZ(6px)';
        });
      });
      el.addEventListener('mouseleave', function () {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        el.style.transform = '';
      });
    });
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
    var typing = addMsg('Flo is typing…', 'bot typing');
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

  /* ---------- floating site-assistant widget ---------- */
  (function () {
    var fab = document.getElementById('chatFab');
    var widget = document.getElementById('chatWidget');
    var closeBtn = document.getElementById('chatClose');
    if (!fab || !widget) return;
    fab.addEventListener('click', function () {
      var opening = widget.hidden;
      widget.hidden = !opening;
      fab.setAttribute('aria-expanded', String(opening));
      if (opening) {
        var wInput = document.getElementById('siteChatText');
        if (wInput) wInput.focus();
      }
    });
    if (closeBtn) closeBtn.addEventListener('click', function () {
      widget.hidden = true;
      fab.setAttribute('aria-expanded', 'false');
    });
  })();

  /* ---------- site-assistant chat (talks about FloGlo AI itself) ---------- */
  (function () {
    var sForm = document.getElementById('siteChatForm');
    var sInput = document.getElementById('siteChatText');
    var sBox = document.getElementById('siteChatMessages');
    if (!sForm || !sInput || !sBox) return;
    var sHistory = [];
    var sBusy = false;
    function sScroll() { sBox.scrollTop = sBox.scrollHeight; }
    function sAddMsg(text, who) {
      var d = document.createElement('div');
      d.className = 'msg ' + who;
      d.textContent = text;
      sBox.appendChild(d);
      sScroll();
      return d;
    }
    sForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sBusy) return;
      var msg = (sInput.value || '').trim();
      if (!msg) return;
      sBusy = true;
      sAddMsg(msg, 'user');
      sInput.value = '';
      var typing = sAddMsg('Flo is typing…', 'bot typing');
      fetch('/api/site-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: sHistory })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          typing.remove();
          var reply = data.reply || "Great question — I can walk you through pricing, the free pilot, or what we'd automate for your business. What's on your mind?";
          sAddMsg(reply, 'bot');
          sHistory.push({ role: 'user', content: msg }, { role: 'assistant', content: reply });
          if (sHistory.length > 12) sHistory = sHistory.slice(-12);
        })
        .catch(function () {
          typing.remove();
          sAddMsg("I'm having a little trouble right now — email us at aiflowline@gmail.com and a human will reply within one business day.", 'bot');
        })
        .finally(function () { sBusy = false; sInput.focus(); });
    });
  })();

  /* ---------- sticky mobile CTA: appears after the hero ---------- */
  (function () {
    var bar = document.getElementById('stickyCta');
    if (!bar || !window.matchMedia('(max-width: 640px)').matches) return;
    var hero = document.querySelector('.hero');
    function onScroll() {
      var past = window.scrollY > (hero ? hero.offsetHeight * 0.7 : 600);
      bar.classList.toggle('show', past);
      document.body.classList.toggle('has-sticky', past);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();
})();
