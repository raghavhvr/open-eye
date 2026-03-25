// api/rss.js
// Vercel Serverless Function — fetches and parses RSS feeds server-side.
// This avoids CORS issues that block RSS proxies when called from the browser.

export default async function handler(req, res) {
  // Allow GET or POST
  const url = req.method === "POST" ? req.body?.url : req.query?.url;

  if (!url) {
    return res.status(400).json({ error: "url parameter is required" });
  }

  // Basic allowlist — only fetch RSS/Atom feeds from known news domains
  const ALLOWED_DOMAINS = [
    "feeds.bbci.co.uk",
    "feeds.reuters.com",
    "www.aljazeera.com",
    "www.theguardian.com",
    "www.ft.com",
    "www.arabnews.com",
    "rsshub.app",
    "rss.cnn.com",
    "feeds.skynews.com",
    "feeds.washingtonpost.com",
  ];

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
    return res.status(403).json({ error: `Domain not in allowlist: ${parsedUrl.hostname}` });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OpenEye-OSINT/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Upstream returned ${response.status}` });
    }

    const xml = await response.text();

    // Parse RSS/Atom XML into JSON
    const items = parseRSS(xml);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600"); // cache 5 min on Vercel edge
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ── Lightweight RSS/Atom parser (no dependencies) ─────────────────────────────
function parseRSS(xml) {
  const items = [];

  // Detect Atom vs RSS
  const isAtom = xml.includes("<feed") && xml.includes("xmlns=\"http://www.w3.org/2005/Atom\"");

  if (isAtom) {
    // Atom feed
    const entries = xml.match(/<entry[\s\S]*?<\/entry>/g) || [];
    for (const entry of entries.slice(0, 8)) {
      const title   = extractTag(entry, "title")   || "";
      const summary = extractTag(entry, "summary") || extractTag(entry, "content") || "";
      const link    = extractAttr(entry, "link", "href") || extractTag(entry, "link") || "";
      const updated = extractTag(entry, "updated") || extractTag(entry, "published") || "";
      const id      = extractTag(entry, "id") || link;
      if (title) items.push({ title: decodeEntities(title), summary: decodeEntities(stripTags(summary)), link, pubDate: updated, guid: id });
    }
  } else {
    // RSS 2.0
    const entries = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    for (const entry of entries.slice(0, 8)) {
      const title   = extractTag(entry, "title")       || "";
      const summary = extractTag(entry, "description") || extractTag(entry, "content:encoded") || "";
      const link    = extractTag(entry, "link")        || "";
      const pubDate = extractTag(entry, "pubDate")     || "";
      const guid    = extractTag(entry, "guid")        || link;
      if (title) items.push({ title: decodeEntities(title), summary: decodeEntities(stripTags(summary)), link, pubDate, guid });
    }
  }

  return items;
}

function extractTag(xml, tag) {
  // Handle CDATA and plain text
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? (m[1] ?? m[2] ?? "").trim() : "";
}

function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m ? m[1] : "";
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
