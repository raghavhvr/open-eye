# 🛰️ Open Eye — OSINT Intelligence Platform

Real-time open-source intelligence for the MENA region. Aggregates RSS feeds, Wikipedia, Hacker News, weather, and FX rates — with AI-powered briefings via **Google Gemini 2.5 Flash** (free tier).

---

## 🚀 Deploy to Vercel (no CLI needed)

### Step 1 — Push to GitHub

1. Go to [github.com/new](https://github.com/new) and create a **new empty repository** (e.g. `open-eye`)
2. Upload all these files — drag the folder contents into GitHub's file uploader, or use GitHub Desktop
3. Commit directly to `main`

### Step 2 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Click **Import Git Repository** → select your `open-eye` repo
3. Vercel auto-detects **Vite** — leave all build settings as-is
4. Before clicking Deploy, go to **Environment Variables** and add:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | your key from [aistudio.google.com](https://aistudio.google.com/app/apikey) |

5. Click **Deploy** — done in ~30 seconds ✅

Every `git push` to `main` auto-redeploys.

---

## 🔑 Getting a free Gemini API key

1. Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key** → select or create a Google Cloud project
4. Copy the key (starts with `AIza...`)

**Free tier limits:** 15 requests/min · 1,000,000 tokens/day · No billing required

---

## 🏗️ Project Structure

```
open-eye/
├── api/
│   └── brief.js          ← Vercel serverless function (Gemini proxy)
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx           ← React entry point
│   └── App.jsx            ← Full application
├── .env.example           ← Copy to .env.local for local dev
├── .gitignore
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

---

## 💻 Running Locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

> **Note:** The `/api/brief` serverless function runs locally via `vercel dev` if you have the Vercel CLI. Without it, you can temporarily hardcode the key in `.env.local` and adjust `api/brief.js` to read from `import.meta.env` — but for production always use Vercel env vars.

---

## 📡 Data Sources (all free, no keys needed except Gemini)

| Source | Type | What it provides |
|--------|------|-----------------|
| BBC Middle East | RSS | Regional news |
| Reuters World | RSS | Global news |
| Al Jazeera | RSS | MENA coverage |
| The Guardian World | RSS | International |
| FT World | RSS | Finance & markets |
| Wikipedia REST API | REST | Topic intelligence |
| Hacker News Algolia | REST | Tech signals |
| Open-Meteo | REST | Riyadh weather |
| ExchangeRate-API | REST | SAR / AED / QAR rates |
| **Gemini 2.5 Flash** | **Serverless** | **AI brief synthesis** |

---

## 🔒 Security

- The `GEMINI_API_KEY` is **never sent to the browser** — it lives only in Vercel's server environment
- All AI calls go through `/api/brief`, a server-side function
- No user data is stored or logged
