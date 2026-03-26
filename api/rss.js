// api/rss.js — RSS proxy with allowlist, redirect-following, CDATA support
// Replaces Gulf News, The National UAE, Reuters (all block Vercel IPs) with
// working alternatives: Middle East Eye, The National UAE (correct URL), Anadolu Agency, DW

export default async function handler(req, res) {
  const url = req.method === "POST" ? req.body?.url : req.query?.url;
  if (!url) return res.status(400).json({ error: "url parameter is required" });

  // Allowlist of RSS-friendly domains
  const ALLOWED = [
    "feeds.bbci.co.uk",
    "www.aljazeera.com",
    "www.theguardian.com",
    "www.arabnews.com",
    "www.middleeasteye.net",
    "www.thenationalnews.com",
    "www.aa.com.tr",
    "rss.dw.com",
    "feeds.skynews.com",
    "www.france24.com",
    "rss.cnn.com",
    "feeds.reuters.com",
    "abcnews.go.com",
    "rsshub.app",
  ];

  let parsedUrl;
  try { parsedUrl = new URL(url); }
  catch { return res.status(400).json({ error: "Invalid URL" }); }

  if (!ALLOWED.includes(parsedUrl.hostname)) {
    return res.status(403).json({ error: `Domain not in allowlist: ${parsedUrl.hostname}` });
  }

  try {
    // Use node-fetch-compatible approach with redirect following
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OpenEye-OSINT/1.0; +https://open-eye-nu.vercel.app)",
        "Accept": "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Upstream ${parsedUrl.hostname} returned ${response.status}` });
    }

    const xml = await response.text();
    if (!xml || xml.length < 100) {
      return res.status(502).json({ error: `Empty response from ${parsedUrl.hostname}` });
    }

    const items = parseRSS(xml);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ items, source: parsedUrl.hostname, count: items.length });
  } catch (err) {
    return res.status(500).json({ error: err.message, source: parsedUrl.hostname });
  }
}

// ── RSS/Atom parser — handles CDATA, encoded content, and redirect-resolved feeds ──
function parseRSS(xml) {
  const items = [];
  const isAtom = /<feed[\s>]/i.test(xml) && /xmlns.*atom/i.test(xml);

  if (isAtom) {
    const entries = xml.match(/<entry[\s\S]*?<\/entry>/g) || [];
    for (const e of entries.slice(0, 10)) {
      const title   = extractTag(e, "title");
      const summary = extractTag(e, "summary") || extractTag(e, "content") || "";
      const link    = extractAttr(e, "link", "href") || extractTag(e, "link") || "";
      const updated = extractTag(e, "updated") || extractTag(e, "published") || "";
      if (title) items.push({
        title:   clean(title),
        summary: clean(stripTags(summary)).slice(0, 240),
        link, pubDate: updated,
        guid: extractTag(e, "id") || link,
      });
    }
  } else {
    // RSS 2.0 — match items, skipping the channel-level <title>
    const channelEnd = xml.indexOf("<item");
    const itemsXml = channelEnd >= 0 ? xml.slice(channelEnd) : xml;
    const entries = itemsXml.match(/<item[\s\S]*?<\/item>/g) || [];
    for (const e of entries.slice(0, 10)) {
      const title   = extractTag(e, "title");
      const summary = extractTag(e, "description") || extractTag(e, "content:encoded") || "";
      const link    = extractTag(e, "link") || extractAttr(e, "link", "href") || "";
      const pubDate = extractTag(e, "pubDate") || extractTag(e, "dc:date") || "";
      const guid    = extractTag(e, "guid") || link;
      if (title) items.push({
        title:   clean(title),
        summary: clean(stripTags(summary)).slice(0, 240),
        link, pubDate, guid,
      });
    }
  }

  return items;
}

function extractTag(xml, tag) {
  // Match CDATA or plain text, handles self-closing and namespaced tags
  const re = new RegExp(
    `<${tag}(?:[^>]*)>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*<\\/${tag}>`,
    "i"
  );
  const m = xml.match(re);
  return m ? (m[1] ?? m[2] ?? "").trim() : "";
}

function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m ? m[1] : "";
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function clean(str) {
  return str
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}
