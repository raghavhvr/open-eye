// api/lottery.js
// Fetches open-source signals about lottery, gambling & winning sentiment
// from Reddit (JSON API, no auth), HN, and Wikipedia — all free, no keys.

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const results = [];

  // ── 1. Reddit — r/lottery, r/Powerball, r/gambling (public JSON, no auth) ──
  const subreddits = [
    { sub: "lottery",   tag: "LOTTERY" },
    { sub: "Powerball", tag: "JACKPOT" },
    { sub: "gambling",  tag: "GAMBLING" },
    { sub: "WinSomeLoose", tag: "WINNING" },
    { sub: "personalfinance", tag: "FINANCE" },
  ];

  for (const { sub, tag } of subreddits) {
    try {
      const r = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=8&t=week`,
        { headers: { "User-Agent": "OpenEye-OSINT/1.0" }, signal: AbortSignal.timeout(5000) }
      );
      if (!r.ok) continue;
      const d = await r.json();
      const posts = d?.data?.children || [];
      for (const { data: p } of posts) {
        if (!p.title) continue;
        results.push({
          id:        "reddit-" + p.id,
          title:     p.title,
          summary:   (p.selftext || "").slice(0, 200) || `${p.score} upvotes · ${p.num_comments} comments`,
          url:       "https://reddit.com" + p.permalink,
          timestamp: new Date(p.created_utc * 1000).toISOString(),
          source:    "r/" + sub,
          tag,
          score:     p.score,
          comments:  p.num_comments,
          upvoteRatio: p.upvote_ratio,
        });
      }
    } catch { /* skip failed subreddit */ }
  }

  // ── 2. Hacker News — lottery/gambling/winning (recent only) ──────────────
  const hnKeywords = ["lottery", "gambling", "jackpot", "winning", "powerball"];
  for (const kw of hnKeywords) {
    try {
      const since = Math.floor(Date.now() / 1000) - 30 * 24 * 3600; // last 30 days
      const d = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(kw)}&tags=story&hitsPerPage=3&numericFilters=created_at_i>${since}`,
        { signal: AbortSignal.timeout(4000) }
      ).then(r => r.json());
      for (const h of (d.hits || [])) {
        if (!h.title) continue;
        results.push({
          id:        "hn-lottery-" + h.objectID,
          title:     h.title,
          summary:   `${h.points || 0} points · ${h.num_comments || 0} comments`,
          url:       h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
          timestamp: h.created_at,
          source:    "Hacker News",
          tag:       "TECH",
          score:     h.points,
          comments:  h.num_comments,
          upvoteRatio: 1,
        });
      }
    } catch { /* skip */ }
  }

  // ── 3. Wikipedia — lottery topic context ──────────────────────────────────
  const wikiTopics = ["Lottery", "Powerball", "EuroMillions", "Problem gambling"];
  for (const topic of wikiTopics) {
    try {
      const d = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`,
        { signal: AbortSignal.timeout(4000) }
      ).then(r => r.json());
      if (d.extract) {
        results.push({
          id:        "wiki-lottery-" + topic,
          title:     d.title,
          summary:   d.extract.slice(0, 250),
          url:       d.content_urls?.desktop?.page || "",
          timestamp: new Date().toISOString(),
          source:    "Wikipedia",
          tag:       "INTEL",
          score:     0,
          comments:  0,
          upvoteRatio: 1,
        });
      }
    } catch { /* skip */ }
  }

  // ── Compute uncertainty score ──────────────────────────────────────────────
  // Uncertainty = how polarised / noisy the signal is.
  // High score = signals are mixed / contradictory → harder to read sentiment.
  // Based on: variance in upvote ratios, spread across sources, low sample size.
  const totalSignals = results.length;
  const ratios = results.filter(r => r.upvoteRatio > 0).map(r => r.upvoteRatio);
  const avgRatio = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0.5;
  const ratioVariance = ratios.length
    ? ratios.reduce((acc, r) => acc + Math.pow(r - avgRatio, 2), 0) / ratios.length
    : 0.5;
  const sourceDiversity = new Set(results.map(r => r.source)).size;

  // Low signals OR high variance OR low source diversity = high uncertainty
  const uncertaintyRaw =
    (totalSignals < 10 ? 0.4 : 0) +
    (ratioVariance * 2) +
    (sourceDiversity < 3 ? 0.3 : 0) +
    (avgRatio < 0.6 ? 0.2 : 0);

  const uncertaintyScore = Math.min(99, Math.max(1, Math.round(uncertaintyRaw * 100)));

  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=360");
  return res.status(200).json({
    items: results,
    meta: {
      totalSignals,
      sourceDiversity,
      avgUpvoteRatio: Math.round(avgRatio * 100),
      uncertaintyScore,
    },
  });
}
