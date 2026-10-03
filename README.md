# FloGlo AI

AI automation agency pitch site + live demo chatbot. **$0 stack**: Node/Express,
Groq free tier (`openai/gpt-oss-120b`) with a local FAQ fallback so the demo works
with zero API keys.

## Run locally

```bash
npm install
npm start   # http://localhost:3000
```

Set `GROQ_API_KEY` for full AI answers (get one free at https://console.groq.com).
Without it, the demo bot answers from its built-in FAQ — still fully functional.

## Deploy (Render free tier)

1. Push this repo to GitHub.
2. In Render: New → Web Service → connect the repo.
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: add `GROQ_API_KEY` (optional but recommended)
3. Render auto-deploys on every push to `main`.

## Files

- `server.js` — Express: static site, `POST /api/demo-chat`, `POST /api/contact`
- `public/` — one-page site (dark/moody/gold), embedded Flo demo chat
- `leads.json` — pilot requests saved here (created on first form submit)

## Demo bot

"Flo" is the booking assistant for **Bella's Pizzeria — a fictional demo business**
(address/phone are 555-style placeholders). It demonstrates the agency's core
product: an AI receptionist trained on a business's real facts.
