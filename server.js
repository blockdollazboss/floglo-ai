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

/* ---------------- demo bot: Bella's Pizzeria (fictional demo) ---------------- */
/* TODAY is resolved per request — a long-running server must never serve a stale date. */
function demoSystem() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, server date
  return `You are Bella, the AI booking assistant for Bella's Pizzeria — a live demo of what FloGlo AI builds for local businesses. Stay in character as the restaurant's assistant.
Today's date is ${today}. Resolve relative dates like "Friday" or "tomorrow" against it and always state the weekday and month/day together so they match.

Facts about Bella's Pizzeria (fictional demo business):
- Address: 245 Peachtree St NE, Atlanta, GA 30303
- Phone: (404) 555-0134
- Hours: Tuesday–Sunday, 11:00 AM – 10:00 PM. Closed Mondays.
- Menu highlights: Margherita ($14), Pepperoni Classic ($16), Truffle Funghi ($21), Calzones ($13), Tiramisu ($8). Full menu on request.
- Dine-in, takeout, and delivery within 5 miles.
- Large parties (8+): call ahead and we'll reserve the back room.

Booking rules:
- To book a table you need: name, party size, date, and time.
- If any detail is missing, ask for ONLY the missing piece, one question at a time.
- When you have all four, confirm like this: "You're booked, {name}! Table for {size} on {date} at {time}. Confirmation code: BELLA-{4 random digits}. See you soon!"
- Never invent a confirmation for incomplete bookings.
- Keep replies short and warm (under 60 words). No emojis.`;
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
function faqReply(msg) {
  const m = msg.toLowerCase();
  if (/^(hi|hey|hello|yo|sup)\b/.test(m) && m.length < 30)
    return "Hey, welcome to Bella's Pizzeria! I can book you a table, share our hours, or run through the menu — what sounds good?";
  if (/hour|open|close|when.*open/.test(m))
    return "We're open Tuesday through Sunday, 11 AM to 10 PM. Closed Mondays. Want me to grab you a table?";
  if (/where|address|location|directions/.test(m))
    return "You'll find us at 245 Peachtree St NE, Atlanta, GA 30303. Free parking in the back lot after 5 PM.";
  if (/menu|eat|food|pizza|dish|special/.test(m))
    return "Crowd favorites: Margherita ($14), Pepperoni Classic ($16), Truffle Funghi ($21), Calzones ($13), and Tiramisu ($8) for dessert. Want to book a table and try them?";
  if (/book|table|reserv|seat|party of|for (\d+)/.test(m))
    return "Happy to book you in! I just need a name, party size, date, and time — let's start with your name?";
  if (/deliver|takeout|take out|to go/.test(m))
    return "We do takeout and delivery within 5 miles — call (404) 555-0134 and we'll have it ready in about 25 minutes.";
  if (/price|cost|how much/.test(m))
    return "Most pizzas run $14–$21, calzones $13, desserts $8. Great value for downtown Atlanta!";
  if (/thank|thanks/.test(m)) return "Anytime! Enjoy Bella's — see you soon.";
  if (/^(bye|goodbye|later)/.test(m)) return "Ciao! Come hungry next time.";
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
  return { message, history };
}

app.post('/api/demo-chat', rateLimit, async (req, res) => {
  const parsed = validChat(req.body);
  if (!parsed) return res.status(400).json({ error: 'Invalid chat request.' });
  const messages = [
    { role: 'system', content: demoSystem() },
    ...parsed.history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: parsed.message },
  ];
  try {
    const reply = await callGroq(messages);
    return res.json({ reply, provider: 'groq' });
  } catch (e) {
    const fb = faqReply(parsed.message);
    return res.json({
      reply: fb || "I can help with bookings, hours, the menu, or directions — what do you need?",
      provider: 'local-faq',
    });
  }
});

/* ---------------- site assistant chat (the product selling itself) ----------------
   A floating assistant that answers visitor questions about FloGlo AI itself —
   services, pricing, the free pilot — and captures pilot signups. Same
   Groq-with-local-fallback pattern as the Bella demo. */
function siteSystem() {
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
Rules: only answer from the facts above. If asked something you don't know, say so and offer to have the team reply by email. Never invent prices, guarantees, or features. If asked who you are, say you're Flo, FloGlo AI's AI assistant.`;
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
    { role: 'system', content: siteSystem() },
    ...parsed.history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: parsed.message },
  ];
  try {
    const reply = await callGroq(messages);
    return res.json({ reply, provider: 'groq' });
  } catch (e) {
    const fb = siteFaqReply(parsed.message);
    return res.json({
      reply: fb || "Great question — I can walk you through pricing, the free pilot, or what we'd automate for your business. What's on your mind?",
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[floglo-ai] listening on :${PORT}`));
