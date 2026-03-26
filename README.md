# 🛰️ HORIZON SENTINEL v3 — MENA Intelligence Platform

Real-time open-source intelligence for the Middle East. Aggregates 7 ME RSS feeds, 10 Reddit subreddits (public JSON, no auth), Hacker News, weather, and FX — with a 30-day parallel bulk ingest and AI briefs via Gemini 2.5 Flash.

---

## 🚀 Deploy to Vercel

1. Push to GitHub
2. Connect to Vercel → **Import Repository**
3. Add **one** environment variable:

| Name | Value | Where |
|------|-------|-------|
| `GEMINI_API_KEY` | `AIza...` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — **free, 1M tokens/day** |

4. Deploy ✅ — every other source is zero-auth.

> **Vercel plan note:** `api/ingest.js` is configured for 60s max duration — requires the **Pro plan**. On the free Hobby plan the limit is 10s; the ingest may time out for large payloads. Use "Refresh Live" on Hobby, or upgrade to Pro for bulk 30-day ingests.

---

## 📡 Data Sources

| Source | Type | Key? | Free Limit |
|--------|------|------|-----------|
| BBC Middle East | RSS | ❌ | Unlimited |
| Al Jazeera | RSS | ❌ | Unlimited |
| Reuters World | RSS | ❌ | Unlimited |
| Arab News | RSS | ❌ | Unlimited |
| The Guardian | RSS | ❌ | Unlimited |
| Gulf News | RSS | ❌ | Unlimited |
| The National UAE | RSS | ❌ | Unlimited |
| Hacker News Algolia | REST | ❌ | Unlimited |
| **Reddit (10 ME subs)** | **Public JSON** | **❌** | ~1,000 posts/bulk |
| Open-Meteo (Weather) | REST | ❌ | Unlimited |
| ExchangeRate-API (FX) | REST | ❌ | Unlimited |
| **Gemini 2.5 Flash** | Serverless | **✅ Free key** | 1M tokens/day |

### Reddit Public JSON
No OAuth, no PRAW, no rate-limit concerns. Direct `.json` API:
```
https://www.reddit.com/r/UAE/top.json?limit=100&t=month      ← bulk (30d)
https://www.reddit.com/r/UAE/hot.json?limit=15&t=week        ← live refresh
```

---

## ⚡ 30-Day Bulk Ingest

Click **"Bulk Ingest 30d"** in the sidebar. This calls `GET /api/ingest`, which:

1. Fetches all 7 RSS feeds **in parallel**
2. Fetches all 10 Reddit subs with `top.json?t=month&limit=100` **in parallel** → up to 1,000 posts
3. Runs 10 targeted HN Algolia queries with a 30-day timestamp filter **in parallel** → up to ~200 stories
4. Classifies every article (section, country, sentiment) server-side in one pass
5. Returns a single pre-processed JSON payload with aggregate stats
6. Cached on Vercel's edge for 30 minutes

Results merge into the live feed — new articles are appended, duplicates dropped.

---

## 🗺️ Dashboard Pages

| Page | What it shows |
|------|--------------|
| **Crisis Overview** | Pulse score, KPIs, section breakdown, country sentiment index, trending feed |
| **Intelligence Feed** | RSS + HN, searchable + filterable by sentiment / section |
| **Reddit MENA Pulse** | 10 subreddits live, sentiment breakdown, country distribution |
| **Country Deep-Dive** | Per-country sentiment, top topics, source breakdown, full article list |
| **AI Brief** | Gemini 2.5 Flash synthesis — threat level, key trends, watch items |
| **Data Sources** | Live status table, quickstart code |

---

## 🔬 Topic Taxonomy

| Section | Keywords |
|---------|---------|
| 🚨 Crisis & Safety | war, conflict, ceasefire, houthi, missile, fire, flood, outbreak… |
| 💼 Economy & Business | oil, opec, aramco, vision 2030, neom, investment, rent… |
| 🏛️ Politics & Governance | government, election, diplomacy, sanction, summit, nuclear… |
| 🌐 Expat & Daily Life | visa, golden visa, cost of living, iqama, traffic, metro… |
| 🕌 Culture & Society | ramadan, eid, entertainment, education, sports… |
| 💻 Tech & Innovation | AI, startup, crypto, smart city, solar, g42… |

---

## 💻 Local Development

```bash
npm install
cp .env.example .env.local
# Add GEMINI_API_KEY to .env.local
npm run dev               # http://localhost:5173
# For /api/* locally:
vercel dev                # needs Vercel CLI
```

