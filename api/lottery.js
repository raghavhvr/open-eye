// api/lottery.js — Middle East Lottery & Luck Sentiment
// Fetches signals specifically about lottery, lucky draws, gambling and
// "winning" sentiment from ME communities. All free, no auth keys.

// ── Sentiment keywords tuned for ME lottery context ───────────────────────────
const HOPEFUL  = ["win","winner","jackpot","lucky","dream","hope","million","tonight","ticket","chance","raffle","prize","draw","big","huge","blessed","fortune","rich","wealth","dream job"];
const CYNICAL  = ["scam","fraud","rigged","impossible","never","waste","sucker","tax","odds","cheat","fake","trap","joke","nonsense","illegal","banned","haram","forbidden","government","corrupt"];
const ANXIOUS  = ["debt","desperate","lost","spent","need","last","only","please","help","poor","broke","struggling","crisis","emergency","family","children","worried","stress","afford"];
const NEUTRAL  = ["lottery","powerball","euromillions","numbers","draw","ticket","prize","winner","jackpot","gambling","casino","betting","raffle","sweepstake"];

function classifyLottery(text) {
  const t = (text || "").toLowerCase();
  const h = HOPEFUL.filter(w => t.includes(w)).length;
  const c = CYNICAL.filter(w => t.includes(w)).length;
  const a = ANXIOUS.filter(w => t.includes(w)).length;
  if (a > 1)   return "ANXIOUS";
  if (c > h+1) return "CYNICAL";
  if (h > c+1) return "HOPEFUL";
  if (h > 0)   return "HOPEFUL";
  return "NEUTRAL";
}

// ── ME-specific subreddits searched for lottery/luck/winning content ──────────
const ME_LOTTERY_QUERIES = [
  // Country subs with lottery-adjacent searches
  { sub: "UAE",          query: "lottery lucky draw raffle prize win",    country: "UAE",          tag: "ME-LOTTERY" },
  { sub: "dubai",        query: "lottery raffle lucky draw win prize",    country: "UAE",          tag: "ME-LOTTERY" },
  { sub: "saudiarabia",  query: "lottery lucky win prize raffle",         country: "Saudi Arabia", tag: "ME-LOTTERY" },
  { sub: "qatar",        query: "lottery lucky win prize draw",           country: "Qatar",        tag: "ME-LOTTERY" },
  { sub: "Kuwait",       query: "lottery lucky win raffle prize",         country: "Kuwait",       tag: "ME-LOTTERY" },
  { sub: "bahrain",      query: "lottery lucky win prize draw",           country: "Bahrain",      tag: "ME-LOTTERY" },
  { sub: "jordan",       query: "lottery lucky win prize",                country: "Jordan",       tag: "ME-LOTTERY" },
  { sub: "lebanon",      query: "lottery lucky win prize",                country: "Lebanon",      tag: "ME-LOTTERY" },
  { sub: "MiddleEast",   query: "lottery lucky gambling winning prize",   country: "Regional",     tag: "ME-LOTTERY" },
  { sub: "expats",       query: "lottery lucky draw UAE Dubai prize win", country: "Regional",     tag: "EXPAT"       },
  // General lottery subs for baseline global sentiment
  { sub: "lottery",      query: "",                                       country: "Global",       tag: "LOTTERY"     },
  { sub: "gambling",     query: "",                                       country: "Global",       tag: "GAMBLING"    },
];

// ── HN queries specifically about ME lottery/gambling ─────────────────────────
const HN_ME_QUERIES = [
  "lottery UAE Dubai",
  "gambling middle east",
  "lucky draw UAE",
  "lottery illegal gulf",
  "online gambling GCC",
  "lottery winning psychology",
  "gambling addiction",
  "cryptocurrency lottery",
];

// ── Wikipedia topics for context ──────────────────────────────────────────────
const WIKI_TOPICS = [
  "Lottery",
  "Gambling in the United Arab Emirates",
  "Problem gambling",
  "Lucky draw",
  "Dubai Duty Free Millennium Millionaire", // famous ME lottery
];

// ── Uncertainty score calculation ─────────────────────────────────────────────
// Measures how contradictory / noisy the ME lottery signal is.
// High = people are very divided (e.g. hopeful + cynical in equal measure)
// Low  = clear dominant mood (e.g. overwhelmingly hopeful or cynical)
function calcUncertainty(items) {
  if (!items.length) return 75; // no data = high uncertainty

  const moodCounts = { HOPEFUL: 0, CYNICAL: 0, ANXIOUS: 0, NEUTRAL: 0 };
  const ratios = [];

  for (const item of items) {
    const mood = classifyLottery(item.title + " " + (item.summary || ""));
    moodCounts[mood]++;
    if (item.upvoteRatio > 0) ratios.push(item.upvoteRatio);
  }

  const total = items.length;
  const dominant = Math.max(...Object.values(moodCounts));
  const dominance = dominant / total; // 1 = all same, 0.25 = perfectly split

  const avgRatio = ratios.length ? ratios.reduce((a,b)=>a+b,0)/ratios.length : 0.6;
  const ratioVariance = ratios.length
    ? ratios.reduce((acc,r) => acc + Math.pow(r - avgRatio, 2), 0) / ratios.length
    : 0.25;

  const sourceDiversity = new Set(items.map(i => i.source)).size;
  const meSources = items.filter(i => i.tag === "ME-LOTTERY" || i.tag === "EXPAT").length;
  const meCoverage = meSources / total;

  // Low dominance = high uncertainty (signals split)
  // High variance = high uncertainty (community divided)
  // Low ME coverage = high uncertainty (mostly global, not ME-specific)
  const raw =
    (1 - dominance) * 50 +          // 0–50 pts: how split the mood is
    ratioVariance * 30 +             // 0–30 pts: upvote ratio variance
    (meCoverage < 0.3 ? 20 : 0);    // 20 pts: too few ME-specific signals

  return Math.min(99, Math.max(1, Math.round(raw)));
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const results = [];
  const seen = new Set();

  // ── 1. ME Reddit — search each ME sub for lottery/lucky content ──────────────
  await Promise.allSettled(ME_LOTTERY_QUERIES.map(async ({ sub, query, country, tag }) => {
    try {
      // Use Reddit search if query provided, otherwise hot posts
      const url = query
        ? `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=top&t=month&limit=15`
        : `https://www.reddit.com/r/${sub}/hot.json?limit=10`;

      const r = await fetch(url, {
        headers: { "User-Agent": "OpenEye-OSINT/2.0-lottery" },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) return;
      const d = await r.json();
      const posts = d?.data?.children || [];

      for (const { data: p } of posts) {
        if (!p.title || p.stickied || seen.has(p.id)) continue;
        // For ME subs without query, filter to lottery-relevant titles
        if (!query) {
          const relevant = [...HOPEFUL, ...NEUTRAL, "lucky", "win", "prize", "jackpot", "lottery", "raffle"];
          if (!relevant.some(w => p.title.toLowerCase().includes(w))) continue;
        }
        seen.add(p.id);
        results.push({
          id:          "reddit-" + p.id,
          title:       p.title,
          summary:     (p.selftext || "").slice(0, 200) || `↑${p.score} · 💬${p.num_comments}`,
          url:         "https://reddit.com" + p.permalink,
          timestamp:   new Date(p.created_utc * 1000).toISOString(),
          source:      "r/" + sub,
          sourceType:  "Reddit",
          tag,
          country,
          score:       p.score,
          comments:    p.num_comments,
          upvoteRatio: p.upvote_ratio || 0.7,
        });
      }
    } catch { /* skip */ }
  }));

  // ── 2. HN — ME lottery/gambling queries ──────────────────────────────────────
  const since30d = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
  await Promise.allSettled(HN_ME_QUERIES.map(async (q) => {
    try {
      const d = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=5&numericFilters=created_at_i>${since30d}`,
        { signal: AbortSignal.timeout(4000) }
      ).then(r => r.json());
      for (const h of (d.hits || [])) {
        if (!h.title || seen.has(h.objectID)) continue;
        seen.add(h.objectID);
        results.push({
          id:          "hn-lot-" + h.objectID,
          title:       h.title,
          summary:     `${h.points||0} pts · ${h.num_comments||0} comments`,
          url:         h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
          timestamp:   h.created_at,
          source:      "Hacker News",
          sourceType:  "HN",
          tag:         "TECH",
          country:     "Global",
          score:       h.points || 0,
          comments:    h.num_comments || 0,
          upvoteRatio: 0.8,
        });
      }
    } catch { /* skip */ }
  }));

  // ── 3. Wikipedia — ME lottery context ────────────────────────────────────────
  await Promise.allSettled(WIKI_TOPICS.map(async (topic) => {
    try {
      const d = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`,
        { signal: AbortSignal.timeout(4000) }
      ).then(r => r.json());
      if (!d.extract || seen.has("wiki-" + topic)) return;
      seen.add("wiki-" + topic);
      results.push({
        id:          "wiki-lot-" + topic,
        title:       d.title,
        summary:     d.extract.slice(0, 280),
        url:         d.content_urls?.desktop?.page || "",
        timestamp:   new Date().toISOString(),
        source:      "Wikipedia",
        sourceType:  "Wiki",
        tag:         "INTEL",
        country:     topic.toLowerCase().includes("uae") || topic.toLowerCase().includes("dubai") ? "UAE" : "Global",
        score:       0,
        comments:    0,
        upvoteRatio: 1,
      });
    } catch { /* skip */ }
  }));

  // ── Sort by score desc then recency ──────────────────────────────────────────
  results.sort((a, b) => (b.score - a.score) || (new Date(b.timestamp) - new Date(a.timestamp)));

  // ── Compute stats ─────────────────────────────────────────────────────────────
  const moodDist = { HOPEFUL: 0, CYNICAL: 0, ANXIOUS: 0, NEUTRAL: 0 };
  for (const item of results) {
    const mood = classifyLottery(item.title + " " + (item.summary || ""));
    moodDist[mood]++;
  }

  const totalSignals    = results.length;
  const sourceDiversity = new Set(results.map(r => r.source)).size;
  const meSignals       = results.filter(r => r.tag === "ME-LOTTERY" || r.tag === "EXPAT").length;
  const ratios          = results.filter(r => r.upvoteRatio > 0).map(r => r.upvoteRatio);
  const avgUpvoteRatio  = ratios.length ? Math.round((ratios.reduce((a,b)=>a+b,0)/ratios.length)*100) : 60;
  const uncertaintyScore = calcUncertainty(results);

  const dominantMood = Object.entries(moodDist).sort((a,b)=>b[1]-a[1])[0]?.[0] || "NEUTRAL";

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({
    items: results,
    meta: {
      totalSignals,
      meSignals,
      sourceDiversity,
      avgUpvoteRatio,
      uncertaintyScore,
      dominantMood,
      moodDist,
    },
  });
}
