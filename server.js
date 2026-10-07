/* FloGlo AI — agency site server.
   $0 stack: Express serves the static site; /api/demo-chat powers the live
   restaurant-bot demo (Groq free tier if GROQ_API_KEY is set, local FAQ fallback
   otherwise); /api/contact saves pilot requests to leads.json. */
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1); // Render terminates TLS at its proxy — read the real client IP for rate limiting
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- simple in-memory rate limiter (20 req/min per IP) ---------- */
const hits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of hits) {
    const recent = times.filter((t) => now - t < 60_000);
    if (recent.length) hits.set(ip, recent); else hits.delete(ip);
  }
}, 60_000).unref();
function rateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 20) {
    return res.status(429).json({ error: 'Too many requests — slow down a bit.' });
  }
  recent.push(now);
  hits.set(ip, recent);
  next();
}

/* ---------------- demo bot: Flo for fictional demo businesses ---------------- */
/* TODAY is resolved per request — a long-running server must never serve a stale date. */
const DEMO_BUSINESSES = {
  pizzeria: {
    label: "Pizzeria",
    name: "Bella's Pizzeria",
    greeting: "Hey, welcome to Bella's Pizzeria! I'm Flo — I can book you a table, share our hours, or run through the menu. What sounds good?",
    facts: `Facts about Bella's Pizzeria (fictional demo business):
- Address: 245 Peachtree St NE, Atlanta, GA 30303
- Phone: (404) 555-0134
- Hours: Tuesday–Sunday, 11:00 AM – 10:00 PM. Closed Mondays.
- Menu highlights: Margherita ($14), Pepperoni Classic ($16), Truffle Funghi ($21), Calzones ($13), Tiramisu ($8). Full menu on request.
- Dine-in, takeout, and delivery within 5 miles.
- Large parties (8+): call ahead and we'll reserve the back room.`,
    booking: `Booking rules:
- To book a table you need: name, party size, date, and time.
- If any detail is missing, ask for ONLY the missing piece, one question at a time.
- When you have all four, confirm like this: "You're booked, {name}! Table for {size} on {date} at {time}. Confirmation code: FLO-{4 random digits}. See you soon!"
- Never invent a confirmation for incomplete bookings.`,
    prompts: ["What are your hours?", "Book a table for 4 this Friday at 7pm", "What's good on the menu?", "Where are you located?"],
  },
  salon: {
    label: "Hair Salon",
    name: "Luxe Locks Salon",
    greeting: "Hi, welcome to Luxe Locks Salon! I'm Flo — I can book your appointment, share our services and prices, or answer anything else. What can I do for you?",
    facts: `Facts about Luxe Locks Salon (fictional demo business):
- Address: 88 Magnolia Ave, Charlotte, NC 28202
- Phone: (704) 555-0182
- Hours: Monday–Saturday, 9:00 AM – 7:00 PM. Closed Sundays.
- Services: Women's cut ($65+), Men's cut ($35), Color ($120+), Balayage ($180+), Blowout ($45), Deep conditioning treatment ($30).
- Book online or by phone; 24-hour cancellation policy.
- First-time clients get 15% off color services.`,
    booking: `Booking rules:
- To book an appointment you need: name, service, date, and time.
- If any detail is missing, ask for ONLY the missing piece, one question at a time.
- When you have all four, confirm like this: "You're booked, {name}! {service} on {date} at {time}. Confirmation code: FLO-{4 random digits}. See you soon!"
- Never invent a confirmation for incomplete bookings.`,
    prompts: ["What are your hours?", "Book a balayage this Saturday", "How much is a women's cut?", "Where are you located?"],
  },
  plumber: {
    label: "Plumber",
    name: "Rapid Rooter Plumbing",
    greeting: "Hey, this is Flo with Rapid Rooter Plumbing! I can schedule a service visit, give you a ballpark on pricing, or help with an urgent issue. What's going on?",
    facts: `Facts about Rapid Rooter Plumbing (fictional demo business):
- Service area: Greater Raleigh-Durham, NC
- Phone: (919) 555-0147 — 24/7 emergency line
- Hours: Emergency service 24/7. Standard appointments Monday–Friday, 8:00 AM – 6:00 PM.
- Common pricing: Drain clearing ($149), Water heater install ($1,200+), Leak repair ($199+), Fixture install ($129+). Free estimates on big jobs.
- Licensed & insured. 90-day workmanship warranty.`,
    booking: `Booking rules:
- To schedule a visit you need: name, address, a description of the issue, and a preferred date/time window.
- If any detail is missing, ask for ONLY the missing piece, one question at a time.
- For emergencies (burst pipe, major leak, sewage backup), tell them to call (919) 555-0147 immediately AND offer to book the soonest slot.
- When you have the details, confirm like this: "Got it, {name}! We'll be out to {address} on {date} ({time} window) for: {issue}. Confirmation code: FLO-{4 random digits}."
- Never invent a confirmation for incomplete bookings.`,
    prompts: ["My drain is clogged, what do I do?", "How much for a water heater install?", "Do you do emergency calls?", "What areas do you serve?"],
  },
  dental: {
    label: "Dental",
    name: "Bright Smile Dental",
    greeting: "Hi, welcome to Bright Smile Dental! I'm Flo — I can book your visit, explain our services, or check what to expect. How can I help?",
    facts: `Facts about Bright Smile Dental (fictional demo business):
- Address: 1200 Medical Plaza Dr, Suite 200, Houston, TX 77030
- Phone: (713) 555-0163
- Hours: Monday–Friday, 8:00 AM – 5:00 PM. Select Saturdays 9 AM – 1 PM.
- Services: Cleaning & exam ($129 new patients), Fillings ($180+), Whitening ($299), Invisalign consult (free), Emergency tooth pain (same-day slots).
- We accept most PPO insurance. Payment plans available.`,
    booking: `Booking rules:
- To book a visit you need: name, reason for visit, date, and time.
- If any detail is missing, ask for ONLY the missing piece, one question at a time.
- For tooth pain/emergencies, offer the soonest available slot and note "we'll prioritize you."
- When you have all four, confirm like this: "You're booked, {name}! {reason} on {date} at {time}. Confirmation code: FLO-{4 random digits}. See you soon!"
- Never invent a confirmation for incomplete bookings.`,
    prompts: ["Do you take my insurance?", "I have tooth pain, can I come today?", "How much is whitening?", "Where are you located?"],
  },
  autorepair: {
    label: "Auto Repair",
    name: "Precision Auto Care",
    greeting: "Hey, welcome to Precision Auto Care! I'm Flo — I can schedule your service, give you an estimate, or answer questions about your car. What's up?",
    facts: `Facts about Precision Auto Care (fictional demo business):
- Address: 4500 Industrial Pkwy, Columbus, OH 43228
- Phone: (614) 555-0191
- Hours: Monday–Friday, 7:30 AM – 6:00 PM. Saturday 8 AM – 2 PM. Closed Sundays.
- Common pricing: Oil change ($59 synthetic), Brake pads ($249/axle), Diagnostics ($99, waived with repair), Tires (call for quote), State inspection ($35).
- Free shuttle within 5 miles. 24-month/24k-mile warranty on repairs.`,
    booking: `Booking rules:
- To schedule service you need: name, vehicle (year/make/model), service needed, and preferred date/time.
- If any detail is missing, ask for ONLY the missing piece, one question at a time.
- When you have all four, confirm like this: "Got it, {name}! {vehicle} in on {date} at {time} for: {service}. Confirmation code: FLO-{4 random digits}. See you then!"
- Never invent a confirmation for incomplete bookings.`,
    prompts: ["How much for an oil change?", "My brakes are squeaking", "Do you offer a shuttle?", "What are your hours?"],
  },
};
const DEMO_DEFAULT = 'pizzeria';

/* Supported site languages (matches public/i18n.js). */
const LANG_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', zh: 'Chinese',
  hi: 'Hindi', ar: 'Arabic', bn: 'Bengali', ru: 'Russian', ur: 'Urdu',
};
function validLang(v) { return LANG_NAMES[v] ? v : 'en'; }
function langInstruction(lang) {
  return lang === 'en' ? '' : `\nRespond in ${LANG_NAMES[lang]}.`;
}

/* Translated generic fallbacks (match public/i18n.js). */
const FALLBACK_DEMO1 = {
  es: "Mmm, no entendí — ¡pregúntame sobre reservas, horarios o el menú!",
  fr: "Hmm, je n'ai pas bien compris — demandez-moi des infos sur les réservations, les horaires ou le menu !",
  pt: "Hmm, não entendi — pergunte sobre agendamentos, horários ou o cardápio!",
  zh: "嗯，我没太听明白——可以问我预约、营业时间或菜单相关的问题！",
  hi: "हम्म, समझ नहीं आई — बुकिंग, खुलने के समय, या मेनू के बारे में पूछिए!",
  ar: "همم، لم أفهم ذلك — اسألني عن الحجوزات أو ساعات العمل أو قائمة الطعام!",
  bn: "হুম, বুঝতে পারলাম না — বুকিং, সময়সূচি বা মেনু নিয়ে জিজ্ঞাসা করুন!",
  ru: "Хм, не совсем поняла — спросите меня о записи, часах работы или меню!",
  ur: "ہمم، سمجھ نہیں آیا — مجھ سے بکنگ، اوقات، یا مینیو کے بارے میں پوچھیں!",
};
const FALLBACK_WG = {
  es: "Buena pregunta — te puedo explicar los precios, el piloto gratis o lo que automatizaríamos para tu negocio. ¿Qué tienes en mente?",
  fr: "Bonne question — je peux vous expliquer les tarifs, l'essai gratuit, ou ce que nous automatiserions pour votre entreprise. Qu'est-ce qui vous intéresse ?",
  pt: "Ótima pergunta — posso te mostrar os preços, o piloto gratuito ou o que automatizaríamos no seu negócio. O que você quer saber?",
  zh: "问得好——我可以带您了解价格、免费试用，或我们能为您的生意自动化什么。您想先聊哪个？",
  hi: "बहुत अच्छा सवाल — मैं आपको कीमतें, मुफ़्त पायलट, या आपके व्यापार के लिए हम क्या ऑटोमेट करेंगे, ये सब समझा सकती हूँ। आपके मन में क्या है?",
  ar: "سؤال رائع — يمكنني شرح الأسعار، أو التجربة المجانية، أو ما سنؤتمته في نشاطك. ما الذي يدور في ذهنك؟",
  bn: "দারুণ প্রশ্ন — আমি আপনাকে প্রাইসিং, ফ্রি পাইলট, অথবা আপনার ব্যবসার জন্য আমরা কী অটোমেট করব তা বুঝিয়ে দিতে পারি। কী ভাবছেন?",
  ru: "Отличный вопрос — могу рассказать о ценах, бесплатном пилоте или о том, что мы автоматизируем для вашего бизнеса. Что вас интересует?",
  ur: "بہت اچھا سوال — میں آپ کو قیمتیں سمجھا سکتی ہوں، مفت پائلٹ، یا یہ کہ ہم آپ کے کاروبار کے لیے کیا آٹومیٹ کریں گے۔ آپ کے ذہن میں کیا ہے؟",
};

function demoSystem(industry, lang) {
  const b = DEMO_BUSINESSES[industry] || DEMO_BUSINESSES[DEMO_DEFAULT];
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, server date
  return `You are Flo, the AI assistant for ${b.name} — a live demo of what FloGlo AI builds for local businesses. Stay in character as the business's assistant.
Today's date is ${today}. Resolve relative dates like "Friday" or "tomorrow" against it and always state the weekday and month/day together so they match.

${b.facts}

${b.booking}
- Keep replies short and warm (under 60 words). No emojis.${langInstruction(lang)}`;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(messages) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('no-key');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 40_000);
  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', messages, max_tokens: 300, temperature: 0.7 }),
    });
    if (!r.ok) throw new Error('groq-' + r.status);
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('empty');
    return reply;
  } finally {
    clearTimeout(timer);
  }
}

/* Local FAQ fallback — demo works with zero external APIs. */
function faqReply(msg, industry) {
  const b = DEMO_BUSINESSES[industry] || DEMO_BUSINESSES[DEMO_DEFAULT];
  const m = msg.toLowerCase();
  if (/^(hi|hey|hello|yo|sup)\b/.test(m) && m.length < 30) return b.greeting;
  if (/hour|open|close|when.*open/.test(m)) {
    if (industry === 'salon') return "We're open Monday through Saturday, 9 AM to 7 PM. Closed Sundays. Want me to book you in?";
    if (industry === 'plumber') return "Emergency line is 24/7 at (919) 555-0147. Standard appointments run Monday–Friday, 8 AM to 6 PM.";
    if (industry === 'dental') return "We're here Monday–Friday, 8 AM to 5 PM, plus select Saturdays 9 AM to 1 PM. Need a slot?";
    if (industry === 'autorepair') return "Monday–Friday 7:30 AM to 6 PM, Saturdays 8 AM to 2 PM. Closed Sundays. Want to schedule?";
    return "We're open Tuesday through Sunday, 11 AM to 10 PM. Closed Mondays. Want me to grab you a table?";
  }
  if (/where|address|location|directions/.test(m)) {
    if (industry === 'salon') return "You'll find us at 88 Magnolia Ave, Charlotte, NC 28202.";
    if (industry === 'plumber') return "We serve the greater Raleigh-Durham area — what's your address and I'll confirm you're in range?";
    if (industry === 'dental') return "We're at 1200 Medical Plaza Dr, Suite 200, Houston, TX 77030.";
    if (industry === 'autorepair') return "4500 Industrial Pkwy, Columbus, OH 43228 — free shuttle within 5 miles.";
    return "You'll find us at 245 Peachtree St NE, Atlanta, GA 30303. Free parking in the back lot after 5 PM.";
  }
  if (/thank|thanks/.test(m)) return `Anytime! See you at ${b.name} soon.`;
  if (/^(bye|goodbye|later)/.test(m)) return "Take care — see you soon!";
  return null;
}

function validChat(body) {
  if (!body || typeof body.message !== 'string') return null;
  const message = body.message.trim();
  if (message.length < 1 || message.length > 1000) return null;
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  for (const h of history) {
    if (!h || (h.role !== 'user' && h.role !== 'assistant') || typeof h.content !== 'string') return null;
  }
  const industry = DEMO_BUSINESSES[body.industry] ? body.industry : DEMO_DEFAULT;
  const lang = validLang(body.lang);
  return { message, history, industry, lang };
}

app.post('/api/demo-chat', rateLimit, async (req, res) => {
  const parsed = validChat(req.body);
  if (!parsed) return res.status(400).json({ error: 'Invalid chat request.' });
  const messages = [
    { role: 'system', content: demoSystem(parsed.industry, parsed.lang) },
    ...parsed.history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: parsed.message },
  ];
  try {
    const reply = await callGroq(messages);
    return res.json({ reply, provider: 'groq' });
  } catch (e) {
    const fb = faqReply(parsed.message, parsed.industry);
    return res.json({
      reply: fb || FALLBACK_DEMO1[parsed.lang] || "I can help with bookings, hours, the menu, or directions — what do you need?",
      provider: 'local-faq',
    });
  }
});

/* ---------------- site assistant chat (the product selling itself) ----------------
   A floating assistant that answers visitor questions about FloGlo AI itself —
   services, pricing, the free pilot — and captures pilot signups. Same
   Groq-with-local-fallback pattern as the Flo demo. */
function siteSystem(lang) {
  return `You are Flo, the warm and welcoming AI sales assistant on FloGlo AI's website — a live demo of the kind of assistant FloGlo AI builds for local businesses. Your personality: genuinely friendly, enthusiastic, and helpful, like the best front-desk person a business ever had. Your goal: make every visitor feel welcome and guide them toward claiming the free 7-day pilot. Be conversational and concise (under 60 words). No emojis.
About FloGlo AI (AI automation agency for local businesses):
- Services: 24/7 AI receptionist (answers calls, texts, and website chat; books appointments straight into the calendar), missed-call text-back, review engine (asks happy customers for Google reviews), lead follow-up automation.
- Pricing: Pilot — $0. Free 7-day trial of one automation on the visitor's business. No charge, ends automatically, includes a results report. Launch — $750 one-time: AI receptionist on their website, missed-call text-back, review engine, 30 days of tuning. Growth — $297/month: everything in Launch plus lead follow-up automation, monthly performance reports, priority support; cancel anytime.
- Guarantees: Launch carries a 14-day money-back guarantee. The pilot is free, so there is nothing to refund.
- Contact: aiflowline@gmail.com — a human replies within one business day.
Sales playbook:
- Greet warmly and ask what kind of business they run — then tie everything back to their situation.
- When someone shows interest (asks about pricing, the pilot, or says yes), move things forward: collect name, email, business name, and what they want automated — one piece at a time, naturally.
- Once you have the details, confirm: "You're all set, [name]! We'll reply within one business day with your pilot plan."
- If they hesitate, remind them the pilot is free for 7 days with zero obligation — there's nothing to lose.
Rules: only answer from the facts above. If asked something you don't know, say so and offer to have the team reply by email. Never invent prices, guarantees, or features. If asked who you are, say you're Flo, FloGlo AI's AI assistant.${langInstruction(lang)}`;
}

/* Local FAQ fallback for the site assistant — works with zero external APIs. */
function siteFaqReply(msg) {
  const m = msg.toLowerCase();
  if (/price|cost|how much|pricing|plan/.test(m))
    return "Simple: the 7-day pilot is free. Launch is $750 one-time, Growth is $297/month with cancel-anytime. Launch carries a 14-day money-back guarantee. Want me to get your free pilot started?";
  if (/pilot|free|trial|try|start|sign/.test(m))
    return "The free pilot installs one automation on your business for 7 days — free, no charge, no obligation, and you get a results report at the end. Want in? I just need your name, email, and business name.";
  if (/service|what.*do|offer|automat/.test(m))
    return "We build four things: a 24/7 AI receptionist, missed-call text-back, a review engine, and lead follow-up automation. Which one would change the game for your business?";
  if (/guarantee|refund/.test(m))
    return "Launch comes with a 14-day money-back guarantee — email us within 14 days and we refund the full $750. The pilot is free, so there's nothing to refund there.";
  if (/human|person|call me|phone|email|contact|support/.test(m))
    return "You can reach a human at aiflowline@gmail.com — we reply within one business day.";
  if (/who|about|company|floglo/.test(m))
    return "FloGlo AI is an AI automation agency for local businesses. We install AI assistants that answer customers, book appointments, and chase leads — 24/7.";
  return null;
}

app.post('/api/site-chat', rateLimit, async (req, res) => {
  const parsed = validChat(req.body);
  if (!parsed) return res.status(400).json({ error: 'Invalid chat request.' });
  const messages = [
    { role: 'system', content: siteSystem(parsed.lang) },
    ...parsed.history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: parsed.message },
  ];
  try {
    const reply = await callGroq(messages);
    return res.json({ reply, provider: 'groq' });
  } catch (e) {
    const fb = siteFaqReply(parsed.message);
    return res.json({
      reply: fb || FALLBACK_WG[parsed.lang] || "Great question — I can walk you through pricing, the free pilot, or what we'd automate for your business. What's on your mind?",
      provider: 'local-faq',
    });
  }
});

/* ---------------- contact / pilot requests ---------------- */
const LEADS_FILE = path.join(__dirname, 'leads.json');

app.post('/api/contact', rateLimit, (req, res) => {
  const { name, email, business, message } = req.body || {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80)
    return res.status(400).json({ error: 'Please include your name.' });
  if (typeof message !== 'string' || message.trim().length < 5 || message.trim().length > 2000)
    return res.status(400).json({ error: 'Tell us a little about what you need.' });
  if (typeof email !== 'string' || email.trim().length > 120 ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
    return res.status(400).json({ error: 'Please include a valid email so we can reply.' });

  let leads = [];
  try {
    leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    if (!Array.isArray(leads)) leads = [];
  } catch { /* file may not exist yet */ }
  leads.push({
    at: new Date().toISOString(),
    name: name.trim(),
    email: email.trim(),
    business: typeof business === 'string' ? business.trim().slice(0, 120) : '',
    message: message.trim(),
  });
  /* Render's free-tier disk is wiped on every deploy, so leads.json alone is
     not durable — also emit the lead to stdout so it survives in the logs. */
  console.log('[floglo-ai] new lead:', JSON.stringify(leads[leads.length - 1]));
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
  res.json({ ok: true });
});

/* Read-only lead feed for the owner's alert watcher. Guarded by a bearer
   token (LEADS_TOKEN env var) so lead contact details are never public. */
const LEADS_TOKEN = process.env.LEADS_TOKEN || '';
app.get('/api/leads', rateLimit, (req, res) => {
  const auth = req.headers.authorization || '';
  if (!LEADS_TOKEN || auth !== `Bearer ${LEADS_TOKEN}`) {
    return res.status(404).json({ error: 'Not found.' });
  }
  let leads = [];
  try {
    leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    if (!Array.isArray(leads)) leads = [];
  } catch { /* file may not exist yet */ }
  res.json({ leads });
});

/* Featured videos for the homepage "Daily Videos" section: one native player per
   platform (Instagram, TikTok, YouTube), in that order. YouTube resolves
   automatically from the channel's public RSS feed (no API key needed), cached
   30 minutes in memory. TikTok and Instagram offer no reliable keyless feed,
   so their post IDs are curated below — update the constants when new posts
   go up and the site picks them up on the next deploy (or immediately — the
   endpoint reads them live). */
const YT_CHANNEL_ID = 'UCxjC3_a60-jjUlVuiI__v5g';
const FEATURED_INSTAGRAM_ID = 'DeKGcAmBLdw';       // latest IG reel 2026-10-06 (reels only, never carousels)
const FEATURED_INSTAGRAM_TITLE = '5 signs your website is losing customers'; // update alongside the ID
const FEATURED_TIKTOK_ID = '7693582005618953503';  // latest TikTok 2026-10-06
const FEATURED_TIKTOK_TITLE = '5 signs your website is losing customers';
const TIKTOK_USERNAME = 'flogloai';
/* videos.json (repo root) holds the live Instagram/TikTok picks so a scheduled
   job can refresh them without a code redeploy. Fetched at runtime with a
   1-hour cache; hardcoded constants below are the fallback. */
const VIDEOS_JSON_URL = 'https://raw.githubusercontent.com/blockdollazboss/floglo-ai/main/videos.json';
let videosConfig = { at: 0, data: null };
async function getVideosConfig() {
  if (Date.now() - videosConfig.at < 60 * 60_000 && videosConfig.data) return videosConfig.data;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(VIDEOS_JSON_URL, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error('videos.json HTTP ' + r.status);
    const d = await r.json();
    if (!d.instagram_id || !d.tiktok_id) throw new Error('videos.json missing IDs');
    videosConfig = { at: Date.now(), data: d };
    return d;
  } catch (err) {
    console.error('[videos-config] using fallback IDs:', err && err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
let ytCache = { at: 0, video: null };
function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
/* Standing rule: the 3 slots must never show the same video. Normalize titles
   and treat two as the same video if one contains the other. */
function normTitle(s) {
  return String(s || '').toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function sameVideo(a, b) {
  const na = normTitle(a), nb = normTitle(b);
  if (!na || !nb || na.length < 8 || nb.length < 8) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}
async function latestYouTube(blockedTitles) {
  if (Date.now() - ytCache.at < 30 * 60_000 && ytCache.video) {
    if (!blockedTitles.some(t => sameVideo(t, ytCache.video.title))) return ytCache.video;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`,
      { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!r.ok) throw new Error(`feed HTTP ${r.status}`);
    const xml = await r.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 8);
    for (const m of entries) {
      const id = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(m[1]);
      const title = /<title>([^<]*)<\/title>/.exec(m[1]);
      if (!id) continue;
      const cleanTitle = title ? decodeEntities(title[1]) : 'FloGlo AI video';
      if (blockedTitles.some(t => sameVideo(t, cleanTitle))) continue; // never duplicate another slot
      ytCache = { at: Date.now(), video: { id: id[1], title: cleanTitle } };
      return ytCache.video;
    }
    throw new Error('no non-duplicate videos in feed');
  } catch (err) {
    if (ytCache.video) return ytCache.video; // serve stale cache rather than fail
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
app.get('/api/latest-videos', rateLimit, async (req, res) => {
  const cfg = await getVideosConfig();
  const igId = (cfg && cfg.instagram_id) || FEATURED_INSTAGRAM_ID;
  const igTitle = (cfg && cfg.instagram_title) || FEATURED_INSTAGRAM_TITLE;
  const ttId = (cfg && cfg.tiktok_id) || FEATURED_TIKTOK_ID;
  const ttTitle = (cfg && cfg.tiktok_title) || FEATURED_TIKTOK_TITLE;
  const tiktokUrl = `https://www.tiktok.com/@${TIKTOK_USERNAME}/video/${ttId}`;
  const videos = [
    { platform: 'instagram', id: igId },
    // TikTok: native embeds refuse to play this account's videos ("Unable to play
    // media"), so the slot renders a branded card linking out instead.
    { platform: 'tiktok', id: ttId, url: tiktokUrl, title: ttTitle },
  ];
  try {
    // Standing rule: never show the same video twice — skip any YouTube upload
    // whose title matches the Instagram reel or TikTok video already in the row.
    const yt = await latestYouTube([igTitle, ttTitle]);
    videos.push({ platform: 'youtube', id: yt.id, title: yt.title });
  } catch (err) {
    console.error('[latest-videos] youtube feed failed:', err && err.message);
    videos.push({ platform: 'youtube-playlist' });
  }
  res.json({ videos });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[floglo-ai] listening on :${PORT}`));
