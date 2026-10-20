/* FloGlo AI — demo chat, contact form, 3D tilt, reveals, counters,
   floating site assistant, sticky mobile CTA */
(function () {
  'use strict';

  /* ---------- multi-language (default English) ---------- */
  var LANG_KEY = 'floglo-lang';
  var HTML_KEYS = {};
  (function () {
    var en = (window.FLOGLO_I18N && window.FLOGLO_I18N.en) || {};
    for (var k in en) { if (/<[a-z][^>]*>/i.test(en[k])) HTML_KEYS[k] = true; }
  })();
  var currentLang = 'en';
  try { currentLang = localStorage.getItem(LANG_KEY) || 'en'; } catch (e) {}
  if (!window.FLOGLO_I18N || !window.FLOGLO_I18N[currentLang]) currentLang = 'en';
  function langMeta(code) {
    var langs = window.FLOGLO_LANGS || [];
    for (var i = 0; i < langs.length; i++) if (langs[i].code === code) return langs[i];
    return { code: 'en', name: 'English', dir: 'ltr' };
  }
  function t(key) {
    var d = window.FLOGLO_I18N[currentLang] || {};
    if (d[key] != null && d[key] !== '') return d[key];
    var en = window.FLOGLO_I18N.en || {};
    return en[key] || '';
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function applyStaticStrings() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      var v = t(k);
      if (HTML_KEYS[k]) { el.innerHTML = v; return; }
      var keep = el.getAttribute('data-i18n-keep');
      if (keep) {
        // replace only text nodes, keep elements (inputs, pulse dots) in place
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        var first = true, node;
        while ((node = walker.nextNode())) {
          if (first) { node.nodeValue = v; first = false; }
          else if (node.nodeValue.trim() !== '') { node.nodeValue = ''; }
        }
      } else {
        el.textContent = v;
      }
    });
    document.querySelectorAll('[data-i18n-suffix]').forEach(function (el) {
      var suf = t(el.getAttribute('data-i18n-suffix'));
      el.dataset.suffix = suf;
      var target = parseInt(el.dataset.count, 10);
      if (!isNaN(target) && el.textContent.indexOf(String(target)) !== -1) {
        el.innerHTML = (el.dataset.prefix || '') + target + suf;
      }
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

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
  function buildIndustryData() {
    var inds = ['pizzeria', 'salon', 'plumber', 'dental', 'autorepair'];
    var out = {};
    inds.forEach(function (ind) {
      out[ind] = {
        name: t('biz.' + ind + '.name'),
        greeting: t('biz.' + ind + '.greeting'),
        prompts: [t('biz.' + ind + '.p1'), t('biz.' + ind + '.p2'), t('biz.' + ind + '.p3'), t('biz.' + ind + '.p4')]
      };
    });
    return out;
  }
  var industryData = buildIndustryData();
  function industryChipLabel(ind) { return t('ind.' + ind); }

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
    var typing = addMsg(t('demo.typing'), 'bot typing');
    fetch('/api/demo-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: history, industry: currentIndustry, lang: currentLang })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        var reply = data.reply || t('demo.fallback1');
        addMsg(reply, 'bot');
        history.push({ role: 'user', content: msg }, { role: 'assistant', content: reply });
        if (history.length > 12) history = history.slice(-12);
      })
      .catch(function () {
        typing.remove();
        addMsg(t('demo.fallback2'), 'bot');
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

  /* refresh demo chat when the site language changes */
  window.__demoLangRefresh = function () {
    industryData = buildIndustryData();
    history = [];
    if (promptRow) {
      promptRow.innerHTML = industryData[currentIndustry].prompts.map(function (p) {
        return '<button class="chip" data-prompt="' + p.replace(/"/g, '&quot;') + '">' + p.replace(/</g, '&lt;') + '</button>';
      }).join('');
      promptRow.querySelectorAll('.chip').forEach(function (chip) {
        chip.addEventListener('click', function () { send(chip.dataset.prompt); });
      });
    }
    box.innerHTML = '';
    addMsg(industryData[currentIndustry].greeting, 'bot');
  };

  /* ---------- contact form ---------- */
  var cForm = document.getElementById('contactForm');
  var cMsg = document.getElementById('formMsg');
  var cTs = document.getElementById('contactTs');
  if (cTs) cTs.value = String(Date.now());
  cForm.addEventListener('submit', function (e) {
    e.preventDefault();
    cMsg.textContent = t('ct.sending');
    var fd = new FormData(cForm);
    var payload = {
      name: fd.get('name'), email: fd.get('email'),
      business: fd.get('business'), message: fd.get('message'),
      website: fd.get('website'), ts: fd.get('ts')
    };
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok) {
          cMsg.textContent = t('ct.success');
          cForm.reset();
        } else {
          cMsg.textContent = res.d.error || t('ct.error');
        }
      })
      .catch(function () { cMsg.textContent = t('ct.error'); });
  });

  /* ---------- reviews section ---------- */
  (function () {
    var list = document.getElementById('reviewsList');
    var empty = document.getElementById('reviewsEmpty');
    if (list) {
      fetch('/api/reviews')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var reviews = (d && d.reviews) || [];
          if (!reviews.length) return; // keep the empty state
          if (empty) empty.style.display = 'none';
          list.innerHTML = reviews.map(function (r) {
            return '<article class="review-card">' +
              '<div class="rc-name">' + escapeHtml(r.name) + '</div>' +
              '<div class="rc-meta">' + escapeHtml(r.company) + ' \u00b7 ' + escapeHtml(r.relationship) + '</div>' +
              '<p class="rc-text">' + escapeHtml(r.text).replace(/\n/g, '<br>') + '</p>' +
              '</article>';
          }).join('');
        })
        .catch(function () { /* leave the empty state */ });
    }
    var rForm = document.getElementById('reviewForm');
    var rMsg = document.getElementById('reviewMsg');
    var rTs = document.getElementById('reviewTs');
    if (rTs) rTs.value = String(Date.now());
    if (!rForm) return;
    rForm.addEventListener('submit', function (e) {
      e.preventDefault();
      rMsg.textContent = t('rv.sending');
      var fd = new FormData(rForm);
      var payload = {
        name: fd.get('name'), company: fd.get('company'),
        relationship: fd.get('relationship'), text: fd.get('text'),
        website: fd.get('website'), ts: fd.get('ts')
      };
      fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok) {
            rMsg.textContent = t('rv.success');
            rForm.reset();
            if (rTs) rTs.value = String(Date.now());
          } else {
            rMsg.textContent = (res.d && res.d.error) || t('rv.error');
          }
        })
        .catch(function () { rMsg.textContent = t('rv.error'); });
    });
  })();

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
      var typing = sAddMsg(t('wg.typing'), 'bot typing');
      fetch('/api/site-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: sHistory, lang: currentLang })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          typing.remove();
          var reply = data.reply || t('wg.fallback');
          sAddMsg(reply, 'bot');
          sHistory.push({ role: 'user', content: msg }, { role: 'assistant', content: reply });
          if (sHistory.length > 12) sHistory = sHistory.slice(-12);
        })
        .catch(function () {
          typing.remove();
          sAddMsg(t('wg.error'), 'bot');
        })
        .finally(function () { sBusy = false; sInput.focus(); });
    });
    /* refresh site-assistant greeting when the site language changes */
    window.__siteChatLangRefresh = function () {
      sHistory = [];
      sBox.innerHTML = '';
      sAddMsg(t('wg.greeting'), 'bot');
    };
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
          '<a class="tiktok-profile-link" href="https://www.tiktok.com/@flogloai" target="_blank" rel="noopener" aria-label="' + t('misc.tiktokprofile') + '">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>' +
          '<video class="tiktok-video" src="videos/tiktok-latest.mp4?v=1" poster="videos/tiktok-latest.jpg?v=1" playsinline preload="metadata" aria-label="' + t('misc.tiktokvideo') + '"></video>' +
          '<button class="tiktok-play-btn" type="button" aria-label="' + t('misc.play') + '">' +
          '<svg class="icon-play" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
          '<svg class="icon-replay" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8z"/></svg>' +
          '</button></div>');
      }
      if (v.platform === 'youtube-playlist') {
        return slot('youtube',
          '<iframe src="https://www.youtube-nocookie.com/embed?listType=playlist&list=UUxjC3_a60-jjUlVuiI__v5g" title="' + t('misc.ytvideos') + '" loading="lazy" allow="' +
          YT_ALLOW + '" allowfullscreen></iframe>');
      }
      return slot('youtube',
        '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.id) +
        '" title="' + esc(v.title || 'FloGlo AI video') + '" loading="lazy" allow="' +
        YT_ALLOW + '" allowfullscreen></iframe>');
    }
    function fallback() {
      row.innerHTML = slot('youtube',
        '<iframe src="https://www.youtube-nocookie.com/embed?listType=playlist&list=UUxjC3_a60-jjUlVuiI__v5g" title="' + t('misc.ytvideos') + '" loading="lazy" allow="' +
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
        btn.setAttribute('aria-label', v.ended ? t('misc.replay') : (v.paused ? t('misc.play') : t('misc.pause')));
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

  /* ---------- language switcher ---------- */
  (function () {
    var btn = document.getElementById('langBtn');
    var menu = document.getElementById('langMenu');
    var cur = document.getElementById('langCurrent');
    if (!btn || !menu) return;

    // build menu
    window.FLOGLO_LANGS.forEach(function (l) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.dataset.lang = l.code;
      b.setAttribute('aria-selected', l.code === currentLang ? 'true' : 'false');
      var nm = document.createElement('span');
      nm.textContent = l.name;
      var en = document.createElement('span');
      en.className = 'lang-en';
      en.textContent = l.code.toUpperCase();
      b.appendChild(nm);
      b.appendChild(en);
      b.addEventListener('click', function () { setLang(l.code); closeMenu(); });
      li.appendChild(b);
      menu.appendChild(li);
    });

    function closeMenu() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) closeMenu();
    });

    window.setLang = setLang;
    function setLang(code) {
      if (!window.FLOGLO_I18N[code]) code = 'en';
      currentLang = code;
      try { localStorage.setItem(LANG_KEY, code); } catch (e) {}
      applyLang();
    }

    function applyLang() {
      var meta = langMeta(currentLang);
      document.documentElement.lang = currentLang;
      document.documentElement.dir = meta.dir;
      document.title = t('meta.title');
      if (cur) cur.textContent = currentLang.toUpperCase();
      menu.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-selected', b.dataset.lang === currentLang ? 'true' : 'false');
      });
      applyStaticStrings();
      // refresh translated dynamic modules
      if (window.__demoLangRefresh) window.__demoLangRefresh();
      if (window.__siteChatLangRefresh) window.__siteChatLangRefresh();
      if (window.__howLangRefresh) window.__howLangRefresh();
      if (window.__scanLangRefresh) window.__scanLangRefresh();
    }

    // expose for the demo-chat module
    window.__applyLang = applyLang;
    window.__t = t;
    applyLang();
  })();

  /* ---------- hero looping demo ---------- */
  (function () {
    var states = [0, 1, 2, 3].map(function (n) { return document.getElementById('loop' + n); });
    if (!states[0]) return;
    var dots = document.querySelectorAll('.loop-dots i');
    var cards = [0, 1, 2, 3].map(function (n) { return document.querySelector('.ev-' + n); });
    var i = 0;
    states[0].classList.add('on');
    setInterval(function () {
      states[i].classList.remove('on');
      if (dots[i]) dots[i].classList.remove('on');
      if (cards[i]) cards[i].classList.remove('on');
      i = (i + 1) % states.length;
      states[i].classList.add('on');
      if (dots[i]) dots[i].classList.add('on');
      if (cards[i]) cards[i].classList.add('on');
    }, 3400);
  })();

  /* ---------- how-it-works scroll choreography ---------- */
  (function () {
    var steps = Array.prototype.slice.call(document.querySelectorAll('.how-step'));
    var tag = document.getElementById('howTag');
    var cardT = document.getElementById('howCardT');
    var cardD = document.getElementById('howCardD');
    if (!steps.length || !tag) return;
    function refresh() {
      var mid = window.innerHeight * 0.45, best = 0;
      steps.forEach(function (s, idx) {
        if (s.getBoundingClientRect().top < mid) best = idx;
      });
      steps.forEach(function (s, idx) { s.classList.toggle('on', idx === best); });
      var prog = document.getElementById('howProgress');
      if (prog) prog.style.height = ((best + 1) / steps.length * 100) + '%';
      var h3 = steps[best].querySelector('h3');
      var p = steps[best].querySelector('p');
      tag.textContent = 'DAY ' + (steps[best].getAttribute('data-day') || (best + 1));
      if (h3 && cardT) cardT.textContent = h3.textContent;
      if (p && cardD) cardD.textContent = p.textContent;
    }
    window.__howLangRefresh = refresh;
    window.addEventListener('scroll', refresh, { passive: true });
    refresh();
  })();

  /* ---------- business scanner ---------- */
  (function () {
    var form = document.getElementById('scanForm');
    if (!form) return;
    var t = window.__t || function (k) { return k; };
    var nameEl = document.getElementById('scanName');
    var webEl = document.getElementById('scanWeb');
    var btn = document.getElementById('scanBtn');
    var callsEl = document.getElementById('scanCalls');
    var jobEl = document.getElementById('scanJob');
    var checksEl = document.getElementById('scanChecks');
    var reportEl = document.getElementById('scanReport');
    var msgEl = document.getElementById('scanMsg');
    var lastScan = null;
    var CHECK_KEYS = ['sc.c1', 'sc.c2', 'sc.c3', 'sc.c4', 'sc.c5'];

    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function money(n) { return '$' + Number(n).toLocaleString('en-US'); }

    function renderChecks(active) {
      checksEl.innerHTML = CHECK_KEYS.map(function (k, i) {
        var cls = i < active ? 'done' : (i === active ? 'run' : '');
        var mark = i < active ? '&#10003;' : '';
        return '<li class="' + cls + '"><span class="ck">' + mark + '</span><span>' + esc(t(k)) + '</span></li>';
      }).join('');
      checksEl.hidden = false;
    }

    function renderReport(d) {
      var permo = t('sc.permo');
      var limitedHtml = d.limited
        ? '<p class="scan-limited">' + esc(d.limited_note || t('sc.limited')) + '</p>'
        : '';
      var issuesHtml = d.issues.length
        ? '<div class="scan-issues">' + d.issues.map(function (it) {
            return '<div class="scan-issue"><div><div class="si-t">' + esc(it.title) +
              '</div><div class="si-d">' + esc(it.detail) + '</div></div><div class="si-v">&minus;' +
              money(it.monthly_impact) + permo + '</div></div>';
          }).join('') + '</div>'
        : '<p class="scan-est" style="text-align:left">' + esc(t('sc.clean')) + '</p>';
      reportEl.innerHTML =
        '<p class="rep-kicker">' + esc(t('sc.report')) + ' — ' + esc(d.business.name) + '</p>' +
        '<p class="rep-leak">' + money(d.estimated_leak_monthly) + '<small>' + esc(permo) + '</small></p>' +
        '<p class="rep-est">' + esc(t('sc.est')) + ' ' + esc(t('sc.based')) + ' ' +
          d.assumptions.missed_calls_per_month + ' ' + esc(t('sc.calls')) + ' &times; ' +
          money(d.assumptions.avg_job_value) + ' ' + esc(t('sc.job')) + '.</p>' +
        limitedHtml +
        issuesHtml +
        '<p class="scan-method">' + esc(d.methodology) + '</p>' +
        '<div class="btn-row"><a class="btn btn-gold" href="#contact" id="scanCta">' +
          esc(t('sc.cta')) + ' &rarr;</a></div>' +
        '<div class="scan-email">' +
          '<p class="scan-email-t">' + esc(t('sc.email_t')) + '</p>' +
          '<form id="scanEmailForm" class="scan-email-form" novalidate>' +
            '<input name="name" type="text" maxlength="80" required placeholder="' + esc(t('sc.email_name')) + '" aria-label="' + esc(t('sc.email_name')) + '">' +
            '<input name="email" type="email" maxlength="120" required placeholder="' + esc(t('sc.email_email')) + '" aria-label="' + esc(t('sc.email_email')) + '">' +
            '<input type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0">' +
            '<input type="hidden" name="ts" value="' + Date.now() + '">' +
            '<button type="submit" class="btn btn-ghost">' + esc(t('sc.email_btn')) + '</button>' +
          '</form>' +
          '<p class="form-msg" id="scanEmailMsg" role="status"></p>' +
        '</div>';
      /* laptop always visible */
      var cta = document.getElementById('scanCta');
      if (cta) cta.addEventListener('click', function () {
        var ta = document.querySelector('#contactForm textarea[name="message"]');
        var biz = document.querySelector('#contactForm input[name="business"]');
        if (ta && !ta.value) {
          ta.value = 'I ran the free scan on ' + d.business.name + ' (' + d.business.website +
            ') — estimated leak ' + money(d.estimated_leak_monthly) + '/mo. I\'d like to talk about the pilot.';
        }
        if (biz && !biz.value) biz.value = d.business.name;
      });
      var emailForm = document.getElementById('scanEmailForm');
      if (emailForm) emailForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = document.getElementById('scanEmailMsg');
        var fd = new FormData(emailForm);
        var btn = emailForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        fetch('/api/scan-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fd.get('name'),
            email: fd.get('email'),
            business_name: d.business.name,
            website: d.business.website,
            scan: d,
            hp: fd.get('hp'),
            ts: fd.get('ts'),
          }),
        })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            btn.disabled = false;
            msg.textContent = res.ok ? t('sc.email_ok') : (res.j && res.j.error) || t('sc.email_err');
            if (res.ok) emailForm.reset();
          })
          .catch(function () {
            btn.disabled = false;
            msg.textContent = t('sc.email_err');
          });
      });
    }

    window.__scanLangRefresh = function () {
      if (lastScan) renderReport(lastScan);
    };

    var scanning = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (scanning) return;
      var name = nameEl.value.trim();
      var web = webEl.value.trim();
      if (!name || !web) return;
      scanning = true;
      btn.disabled = true;
      btn.textContent = t('sc.running');
      msgEl.textContent = '';
      /* laptop always visible */
      var calls = Math.min(500, Math.max(1, parseInt(callsEl.value, 10) || 15));
      var job = Math.min(50000, Math.max(10, parseInt(jobEl.value, 10) || 285));
      var step = 0;
      renderChecks(0);
      var timer = setInterval(function () {
        step++;
        if (step < CHECK_KEYS.length) renderChecks(step);
      }, 700);
      fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_name: name, website: web, missed_calls_per_month: calls, avg_job_value: job }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          clearInterval(timer);
          renderChecks(CHECK_KEYS.length);
          scanning = false;
          btn.disabled = false;
          btn.textContent = t('sc.run');
          if (!res.ok) {
            msgEl.textContent = (res.d && res.d.error) || t('sc.err');
            return;
          }
          lastScan = res.d;
          setTimeout(function () { renderReport(res.d); }, 450);
        })
        .catch(function () {
          clearInterval(timer);
          scanning = false;
          btn.disabled = false;
          btn.textContent = t('sc.run');
          msgEl.textContent = t('sc.err');
        });
    });
  })();
})();

/* ---------- site-wide mouse + scroll reactions ---------- */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return;

  var glow = document.getElementById('cursorGlow');
  var mx = -9999, my = -9999, gx = -9999, gy = -9999;
  var tiltEls = Array.prototype.slice.call(document.querySelectorAll('[data-tilt]'));
  var plxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var nav = document.querySelector('.nav');
  var ticking = false;

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  function update() {
    ticking = false;
    /* cursor glow follows with easing */
    gx += (mx - gx) * 0.12; gy += (my - gy) * 0.12;
    if (glow) glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';

    /* 3D tilt for each tilt target */
    tiltEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = (mx - cx) / (r.width / 2), dy = (my - cy) / (r.height / 2);
      var max = parseFloat(el.getAttribute('data-tilt-max') || 6);
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2.2 || mx < 0) {
        el.style.transform = '';
        return;
      }
      var rx = Math.max(-1, Math.min(1, dy)) * -max;
      var ry = Math.max(-1, Math.min(1, dx)) * max;
      var fade = Math.max(0, 1 - dist / 2.2);
      el.style.transform = 'perspective(900px) rotateX(' + (rx * fade).toFixed(2) + 'deg) rotateY(' + (ry * fade).toFixed(2) + 'deg)';
    });
  }

  /* scroll: nav state + parallax */
  var lastY = -1;
  function onScroll() {
    var y = window.scrollY;
    if (y === lastY) return;
    lastY = y;
    if (nav) nav.classList.toggle('scrolled', y > 40);
    plxEls.forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax') || 0.1);
      el.style.transform = 'translateY(' + (y * speed).toFixed(1) + 'px)';
    });
  }
  window.addEventListener('scroll', function () { requestAnimationFrame(onScroll); }, { passive: true });
  onScroll();
})();
