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
  var currentIndustry = 'pizzeria';
  var industryData = {
    pizzeria: {
      name: "Bella's Pizzeria",
      greeting: "Hey, welcome to Bella's Pizzeria! I'm Flo — I can book you a table, share our hours, or run through the menu. What sounds good?",
      prompts: ["What are your hours?", "Book a table for 4 this Friday at 7pm", "What's good on the menu?", "Where are you located?"]
    },
    salon: {
      name: "Luxe Locks Salon",
      greeting: "Hi, welcome to Luxe Locks Salon! I'm Flo — I can book your appointment, share our services and prices, or answer anything else. What can I do for you?",
      prompts: ["What are your hours?", "Book a balayage this Saturday", "How much is a women's cut?", "Where are you located?"]
    },
    plumber: {
      name: "Rapid Rooter Plumbing",
      greeting: "Hey, this is Flo with Rapid Rooter Plumbing! I can schedule a service visit, give you a ballpark on pricing, or help with an urgent issue. What's going on?",
      prompts: ["My drain is clogged, what do I do?", "How much for a water heater install?", "Do you do emergency calls?", "What areas do you serve?"]
    },
    dental: {
      name: "Bright Smile Dental",
      greeting: "Hi, welcome to Bright Smile Dental! I'm Flo — I can book your visit, explain our services, or check what to expect. How can I help?",
      prompts: ["Do you take my insurance?", "I have tooth pain, can I come today?", "How much is whitening?", "Where are you located?"]
    },
    autorepair: {
      name: "Precision Auto Care",
      greeting: "Hey, welcome to Precision Auto Care! I'm Flo — I can schedule your service, give you an estimate, or answer questions about your car. What's up?",
      prompts: ["How much for an oil change?", "My brakes are squeaking", "Do you offer a shuttle?", "What are your hours?"]
    }
  };

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
      body: JSON.stringify({ message: msg, history: history, industry: currentIndustry })
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
  document.querySelectorAll('.demo-prompts .chip').forEach(function (chip) {
    chip.addEventListener('click', function () { send(chip.dataset.prompt); });
  });
  /* industry switcher */
  var promptRow = document.querySelector('.demo-prompts');
  document.querySelectorAll('.industry-chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var ind = btn.dataset.industry;
      if (!industryData[ind] || ind === currentIndustry) return;
      document.querySelectorAll('.industry-chip').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentIndustry = ind;
      history = [];
      box.innerHTML = '';
      addMsg(industryData[ind].greeting, 'bot');
      if (promptRow) {
        promptRow.innerHTML = industryData[ind].prompts.map(function (p) {
          return '<button class="chip" data-prompt="' + p.replace(/"/g, '&quot;') + '">' + p + '</button>';
        }).join('');
        promptRow.querySelectorAll('.chip').forEach(function (chip) {
          chip.addEventListener('click', function () { send(chip.dataset.prompt); });
        });
      }
    });
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

  /* ---------- Daily Videos: one native player per platform ---------- */
  (function () {
    var row = document.getElementById('videoRow');
    if (!row) return;
    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    var YT_ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    function slot(platform, inner) {
      return '<div class="video-slot"><div class="video-cell">' + inner + '</div></div>';
    }
    function render(v) {
      if (v.platform === 'instagram') {
        return slot('instagram',
          '<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/' +
          encodeURIComponent(v.id) + '/" data-instgrm-version="14" style="margin:0"></blockquote>');
      }
      if (v.platform === 'tiktok') {
        // Self-hosted TikTok video — plays inline in our dark player (TikTok's
        // own embed refuses to play this account's videos).
        return slot('tiktok',
          '<div class="tiktok-player">' +
          '<a class="tiktok-profile-link" href="https://www.tiktok.com/@flogloai" target="_blank" rel="noopener" aria-label="FloGlo AI on TikTok">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>' +
          '<video class="tiktok-video" src="videos/tiktok-latest.mp4?v=1" poster="videos/tiktok-latest.jpg?v=1" playsinline preload="metadata" aria-label="Latest FloGlo AI TikTok video — tap to play"></video>' +
          '<button class="tiktok-play-btn" type="button" aria-label="Play video">' +
          '<svg class="icon-play" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
          '<svg class="icon-replay" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8z"/></svg>' +
          '</button></div>');
      }
      if (v.platform === 'youtube-playlist') {
        return slot('youtube',
          '<iframe src="https://www.youtube-nocookie.com/embed?listType=playlist&list=UUxjC3_a60-jjUlVuiI__v5g" title="Latest FloGlo AI videos" loading="lazy" allow="' +
          YT_ALLOW + '" allowfullscreen></iframe>');
      }
      return slot('youtube',
        '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.id) +
        '" title="' + esc(v.title || 'FloGlo AI video') + '" loading="lazy" allow="' +
        YT_ALLOW + '" allowfullscreen></iframe>');
    }
    function fallback() {
      row.innerHTML = slot('youtube',
        '<iframe src="https://www.youtube-nocookie.com/embed?listType=playlist&list=UUxjC3_a60-jjUlVuiI__v5g" title="Latest FloGlo AI videos" loading="lazy" allow="' +
        YT_ALLOW + '" allowfullscreen></iframe>');
    }
    function processEmbeds() {
      if (!row.querySelector('.instagram-media')) return;
      if (window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); return; }
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.instagram.com/embed.js';
      s.onload = function () { if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process(); };
      document.body.appendChild(s);
    }
    function initTikTokPlayer() {
      var player = row.querySelector('.tiktok-player');
      if (!player) return;
      var v = player.querySelector('.tiktok-video');
      var btn = player.querySelector('.tiktok-play-btn');
      if (!v || !btn) return;
      function sync() {
        player.classList.toggle('playing', !v.paused && !v.ended);
        player.classList.toggle('ended', v.ended);
        btn.setAttribute('aria-label', v.ended ? 'Replay video' : (v.paused ? 'Play video' : 'Pause video'));
      }
      function toggle() {
        if (v.ended) v.currentTime = 0;
        if (v.paused) { v.play().catch(function () {}); } else { v.pause(); }
      }
      btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
      v.addEventListener('click', toggle);
      v.addEventListener('play', sync);
      v.addEventListener('pause', sync);
      v.addEventListener('ended', sync);
      sync();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (!e.isIntersecting) v.pause(); });
        }, { threshold: 0.25 }).observe(v);
      }
    }
    fetch('/api/latest-videos', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (d) {
        if (!d.videos || !d.videos.length) throw new Error('empty');
        row.innerHTML = d.videos.map(render).join('');
        processEmbeds();
        initTikTokPlayer();
      })
      .catch(fallback);
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

  /* ---------- ROI calculator ---------- */
  (function () {
    var calls = document.getElementById('roiCalls');
    if (!calls) return;
    var value = document.getElementById('roiValue');
    var rate = document.getElementById('roiRate');
    var callsVal = document.getElementById('roiCallsVal');
    var valueVal = document.getElementById('roiValueVal');
    var rateVal = document.getElementById('roiRateVal');
    var lost = document.getElementById('roiLost');
    function fmt(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
    function update() {
      var c = +calls.value, v = +value.value, r = +rate.value;
      callsVal.textContent = c;
      valueVal.textContent = fmt(v);
      rateVal.textContent = r + '%';
      var monthly = c * 4.33 * v * (r / 100);
      lost.innerHTML = fmt(monthly) + '<span>/mo</span>';
    }
    [calls, value, rate].forEach(function (el) { el.addEventListener('input', update); });
    update();
  })();

  /* ---------- hero house: mouse-tracked, lights dim on scroll ---------- */
  (function () {
    var house = document.getElementById('heroHouse');
    if (!house) return;
    var img = document.getElementById('heroHouseImg');
    var glows = document.getElementById('heroHouseGlows');
    var dim = document.getElementById('heroHouseDim');
    var hero = document.querySelector('.hero');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion && hero && img) {
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        img.style.transform = 'translate(' + (x * -28).toFixed(1) + 'px,' + (y * -18).toFixed(1) + 'px)';
      });
      hero.addEventListener('mouseleave', function () { img.style.transform = ''; });
    }
    function onScroll() {
      var t = Math.min(1, window.scrollY / (window.innerHeight * 0.85));
      if (glows) glows.style.opacity = (1 - t).toFixed(3);
      if (dim) dim.style.opacity = (t * 0.6).toFixed(3);
      if (img) img.style.filter = 'brightness(' + (1 - t * 0.7).toFixed(3) + ')';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();
})();
