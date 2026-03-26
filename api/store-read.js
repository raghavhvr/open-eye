// api/store-read.js — Read signals from Redis store
// Called by the frontend as an alternative to /api/ingest when Redis is configured
// Much faster (just a Redis GET, no live fetching)

export default async function handler(req, res) {
  const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(503).json({ error: "Redis not configured", configured: false });
  }

  try {
    const [articlesRes, metaRes] = await Promise.all([
      fetch(`${UPSTASH_URL}/get/${encodeURIComponent("signals:articles")}`, {
        headers: { "Authorization": `Bearer ${UPSTASH_TOKEN}` },
      }),
      fetch(`${UPSTASH_URL}/get/${encodeURIComponent("signals:meta")}`, {
        headers: { "Authorization": `Bearer ${UPSTASH_TOKEN}` },
      }),
    ]);

    const [articlesJson, metaJson] = await Promise.all([
      articlesRes.json(),
      metaRes.json(),
    ]);

    const articles = articlesJson.result ? JSON.parse(articlesJson.result) : [];
    const meta     = metaJson.result     ? JSON.parse(metaJson.result)     : {};

    if (articles.length === 0) {
      return res.status(200).json({ ok: false, configured: true, empty: true, articles: [], meta });
    }

    // Build quick stats
    const sentDist = { POSITIVE:0, STABLE:0, NEUTRAL:0, WARNING:0, CRITICAL:0 };
    const sectionDist = {}, countryDist = {}, sourceDist = {};
    for (const a of articles) {
      if (a.sentiment?.label) sentDist[a.sentiment.label] = (sentDist[a.sentiment.label]||0) + 1;
      if (a.section)   sectionDist[a.section]   = (sectionDist[a.section]||0) + 1;
      if (a.country)   countryDist[a.country]   = (countryDist[a.country]||0) + 1;
      if (a.sourceType)sourceDist[a.sourceType] = (sourceDist[a.sourceType]||0) + 1;
    }
    const pulse = Math.min(98, Math.max(10, Math.round(
      50 + (sentDist.POSITIVE*4 + sentDist.STABLE*2) - (sentDist.CRITICAL*9 + sentDist.WARNING*4)
    )));

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json({
      ok: true,
      configured: true,
      storage: "redis",
      meta: {
        ...meta,
        totalFiltered: articles.length,
        sentDist, sectionDist, countryDist, sourceDist, pulse,
      },
      articles,
    });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
