// api/backfill.js — Browser-triggered 30-day backfill
// Hit this URL once in your browser after deploying:
//   https://open-eye-nu.vercel.app/api/backfill?secret=YOUR_SECRET&batch=1
//
// Runs in 4 batches to stay within Vercel's 60s function limit.
// Call batch=1, then batch=2, batch=3, batch=4 — each takes ~15s.
// Or use ?secret=...&all=1 to auto-chain (uses streaming response).
//
// Set BACKFILL_SECRET in Vercel env vars to protect this endpoint.

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SECRET        = process.env.BACKFILL_SECRET;

// ── Sentiment + classify (mirrors ingest.js) ─────────────────────────────────
const SECTIONS = {
  "Crisis & Safety":    ["war","conflict","ceasefire","attack","bomb","fire","flood","houthi","missile","killed","explosion","earthquake"],
  "Economy & Business": ["oil","opec","economy","gdp","inflation","market","investment","trade","aramco","adnoc","property","salary","tourism"],
  "Politics":           ["government","minister","policy","election","parliament","diplomacy","sanction","treaty","reform","summit","president","royal"],
  "Expat & Daily Life": ["visa","expat","cost of living","golden visa","traffic","metro","food","transport","immigration","residency","permit","school"],
  "Tech & Innovation":  ["ai","artificial intelligence","startup","tech","blockchain","smart city","5g","solar","renewable","fintech","digital"],
};
const POS = ["growth","surge","record","success","deal","agreement","boost","profit","launch","stable","peace","recovery","invest"];
const NEG = ["crisis","attack","conflict","warning","risk","decline","tension","threat","disruption","sanction","collapse","killed","explosion","war"];
const NEGS = ["not","no","never","don't","doesn't","didn't","won't","can't","isn't","aren't"];

function classifySection(text) {
  const t = (text||"").toLowerCase();
  let best = "Other", bestScore = 0;
  for (const [sec, kws] of Object.entries(SECTIONS)) {
    const score = kws.filter(k=>t.includes(k)).length;
    if (score > bestScore) { best = sec; bestScore = score; }
  }
  return best;
}
function detectCountry(text) {
  const t = (text||"").toLowerCase();
  if (["uae","dubai","abu dhabi","emirati"].some(k=>t.includes(k))) return "UAE";
  if (["saudi","riyadh","jeddah","aramco","ksa"].some(k=>t.includes(k))) return "Saudi Arabia";
  if (["qatar","doha"].some(k=>t.includes(k))) return "Qatar";
  if (t.includes("kuwait")) return "Kuwait";
  if (["jordan","amman"].some(k=>t.includes(k))) return "Jordan";
  if (["oman","muscat"].some(k=>t.includes(k))) return "Oman";
  if (t.includes("bahrain")) return "Bahrain";
  if (["lebanon","beirut"].some(k=>t.includes(k))) return "Lebanon";
  if (t.includes("iran")) return "Iran";
  if (t.includes("israel")) return "Israel";
  if (t.includes("yemen")) return "Yemen";
  if (t.includes("egypt")) return "Egypt";
  return "Regional";
}
function analyseSentiment(text) {
  const words = (text||"").toLowerCase().split(/\W+/);
  let pos = 0, neg = 0;
  words.forEach((w,i)=>{
    const negated = NEGS.includes(words[i-1]||"");
    if (POS.includes(w)) negated ? neg++ : pos++;
    if (NEG.includes(w)) negated ? pos++ : neg++;
  });
  if (neg > pos+1) return { label:"CRITICAL", score:-2 };
  if (neg > pos)   return { label:"WARNING",  score:-1 };
  if (pos > neg+1) return { label:"POSITIVE", score: 2 };
  if (pos > neg)   return { label:"STABLE",   score: 1 };
  return             { label:"NEUTRAL",  score: 0 };
}
function normalise(raw) {
  const text = (raw.title||"")+" "+(raw.summary||"");
  return {
    id: raw.id, title: raw.title,
    summary: (raw.summary||"").slice(0,240),
    url: raw.url, timestamp: raw.timestamp,
    source: raw.source, sourceType: raw.sourceType, tag: raw.tag,
    country: raw.country || detectCountry(text),
    section: classifySection(text),
    sentiment: analyseSentiment(text),
    score: raw.score||0, comments: raw.comments||0,
  };
}

// ── RSS parser ────────────────────────────────────────────────────────────────
function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? (m[1]??m[2]??"").trim() : "";
}
function clean(s) {
  return s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
          .replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g," ").trim();
}
function parseRSS(xml, sourceId, sourceLabel) {
  const items = [];
  const channelEnd = xml.indexOf("<item");
  const body = channelEnd >= 0 ? xml.slice(channelEnd) : xml;
  const entries = body.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const e of entries) {
    const title = clean(extractTag(e,"title"));
    const link  = extractTag(e,"link") || "";
    const date  = extractTag(e,"pubDate") || "";
    const desc  = clean(extractTag(e,"description").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).slice(0,240);
    if (!title) continue;
    const ts = date ? new Date(date).toISOString() : new Date().toISOString();
    const idB = Buffer.from(link||title).toString("base64").slice(0,16);
    items.push({ id:`rss-${sourceId}-${idB}`, title, summary:desc, url:link, timestamp:ts, source:sourceLabel, sourceType:"RSS", tag:"NEWS" });
  }
  return items;
}

// ── Source lists ──────────────────────────────────────────────────────────────
const RSS_SOURCES = [
  { id:"bbc-me",   label:"BBC Middle East",  url:"https://feeds.bbci.co.uk/news/world/middle_east/rss.xml" },
  { id:"aljazeera",label:"Al Jazeera",        url:"https://www.aljazeera.com/xml/rss/all.xml" },
  { id:"arabnews", label:"Arab News",         url:"https://www.arabnews.com/rss.xml" },
  { id:"guardian", label:"The Guardian",      url:"https://www.theguardian.com/world/rss" },
  { id:"national", label:"The National UAE",  url:"https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml" },
  { id:"mee",      label:"Middle East Eye",   url:"https://www.middleeasteye.net/rss" },
  { id:"aa",       label:"Anadolu Agency",    url:"https://www.aa.com.tr/en/rss/default?cat=world" },
];

const MASTODON_TAGS = [
  { tag:"MiddleEast",country:"Regional" },{ tag:"UAE",country:"UAE" },
  { tag:"Dubai",country:"UAE" },{ tag:"SaudiArabia",country:"Saudi Arabia" },
  { tag:"Qatar",country:"Qatar" },{ tag:"Gaza",country:"Palestine" },
  { tag:"Iran",country:"Iran" },{ tag:"OPEC",country:"Regional" },
  { tag:"Israel",country:"Israel" },{ tag:"Yemen",country:"Yemen" },
];

// HN queries split into 4 batches for the 4-call approach
const HN_QUERY_BATCHES = [
  ["UAE Dubai","Saudi Arabia Riyadh"],
  ["Qatar Doha","Gulf OPEC"],
  ["Middle East geopolitics","Houthi Red Sea"],
  ["Israel Gaza","Iran nuclear","NEOM Saudi","GCC economy"],
];

// ── Fetchers ──────────────────────────────────────────────────────────────────
async function fetchRSS({ id, label, url }) {
  try {
    const r = await fetch(url, {
      headers:{ "User-Agent":"Mozilla/5.0 (compatible; OpenEye-Backfill/1.0)" },
      redirect:"follow", signal:AbortSignal.timeout(12000),
    });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseRSS(xml, id, label);
  } catch { return []; }
}

async function fetchMastodon({ tag, country }) {
  try {
    const r = await fetch(
      `https://mastodon.social/api/v1/timelines/tag/${tag}?limit=40`,
      { headers:{"User-Agent":"OpenEye-Backfill/1.0"}, signal:AbortSignal.timeout(8000) }
    );
    if (!r.ok) return [];
    const posts = await r.json();
    return posts.filter(p=>p.content&&!p.reblog).map(p=>{
      const txt = p.content.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
      return { id:"masto-"+p.id, title:txt.slice(0,160)||`#${tag} signal`, summary:txt.slice(0,240),
               url:p.url||"", timestamp:p.created_at, source:`#${tag} (Mastodon)`,
               sourceType:"Mastodon", tag:tag.toUpperCase(), country,
               score:p.favourites_count||0, comments:p.replies_count||0 };
    });
  } catch { return []; }
}

async function fetchHNBatch(queries) {
  const since = Math.floor(Date.now()/1000) - 30*24*3600;
  const all = []; const seen = new Set();
  for (const q of queries) {
    try {
      const d = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=40&numericFilters=created_at_i>${since}`
      ).then(r=>r.json());
      for (const h of (d.hits||[])) {
        if (!h.title||seen.has(h.objectID)) continue;
        seen.add(h.objectID);
        all.push({ id:"hn-"+h.objectID, title:h.title,
                   summary:`${h.points||0} pts · ${h.num_comments||0} comments`,
                   url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,
                   timestamp:h.created_at, source:"Hacker News",
                   sourceType:"HN", tag:"TECH", score:h.points||0, comments:h.num_comments||0 });
      }
    } catch { /* skip */ }
  }
  return all;
}

// ── Redis helpers ─────────────────────────────────────────────────────────────
async function redisGet(key) {
  const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
    headers:{ "Authorization":`Bearer ${UPSTASH_TOKEN}` },
  });
  const j = await res.json(); return j.result||null;
}
async function redisPipeline(commands) {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method:"POST",
    headers:{ "Authorization":`Bearer ${UPSTASH_TOKEN}`, "Content-Type":"application/json" },
    body: JSON.stringify(commands),
  });
  return res.json();
}

// ── Merge new items into Redis ─────────────────────────────────────────────────
async function mergeToRedis(newItems) {
  const existingRaw = await redisGet("signals:articles");
  const existing = existingRaw ? JSON.parse(existingRaw) : [];
  const existingIds = new Set(existing.map(a=>a.id));
  const cutoff = Date.now() - 30*24*60*60*1000;

  const added = newItems
    .filter(a=>!existingIds.has(a.id))
    .map(normalise)
    .filter(a=>new Date(a.timestamp).getTime()>cutoff);

  const merged = [...added, ...existing]
    .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))
    .slice(0, 3000);

  const meta = {
    lastIngest: new Date().toISOString(),
    totalPushed: merged.length,
    backfilledAt: new Date().toISOString(),
  };

  await redisPipeline([
    ["SET","signals:articles", JSON.stringify(merged)],
    ["SET","signals:meta",     JSON.stringify(meta)],
  ]);

  return { added: added.length, total: merged.length };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Auth check
  if (SECRET && req.query.secret !== SECRET) {
    return res.status(401).json({ error: "Unauthorized. Add ?secret=YOUR_BACKFILL_SECRET" });
  }
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(503).json({ error: "UPSTASH_REDIS_REST_URL / TOKEN not set in Vercel env vars" });
  }

  const batch = parseInt(req.query.batch || "1");
  if (batch < 1 || batch > 4) {
    return res.status(400).json({
      error: "batch must be 1-4",
      instructions: [
        "Call these 4 URLs in order (each takes ~15s):",
        `/api/backfill?secret=YOUR_SECRET&batch=1  ← RSS + Mastodon`,
        `/api/backfill?secret=YOUR_SECRET&batch=2  ← Lemmy`,
        `/api/backfill?secret=YOUR_SECRET&batch=3  ← HN part 1`,
        `/api/backfill?secret=YOUR_SECRET&batch=4  ← HN part 2`,
      ]
    });
  }

  const t0 = Date.now();
  let items = [];
  let label = "";

  if (batch === 1) {
    label = "RSS + Mastodon";
    const [rssItems, mastoItems] = await Promise.all([
      Promise.all(RSS_SOURCES.map(fetchRSS)).then(r=>r.flat()),
      Promise.allSettled(MASTODON_TAGS.map(fetchMastodon)).then(r=>
        r.filter(x=>x.status==="fulfilled").flatMap(x=>x.value)
      ),
    ]);
    items = [...rssItems, ...mastoItems];
  }
  else if (batch === 2) {
    label = "Lemmy";
    const LEMMY_QUERIES = [
      { q:"UAE Dubai",country:"UAE" },{ q:"Saudi Arabia",country:"Saudi Arabia" },
      { q:"Qatar Doha",country:"Qatar" },{ q:"Middle East",country:"Regional" },
      { q:"OPEC oil",country:"Regional" },{ q:"Iran nuclear",country:"Iran" },
      { q:"Israel Gaza",country:"Palestine" },{ q:"Egypt economy",country:"Egypt" },
    ];
    items = (await Promise.allSettled(LEMMY_QUERIES.map(async ({q,country})=>{
      try {
        const r = await fetch(`https://lemmy.world/api/v3/search?q=${encodeURIComponent(q)}&type_=Posts&sort=TopMonth&limit=20`,
          { signal:AbortSignal.timeout(10000) });
        if (!r.ok) return [];
        const d = await r.json();
        return (d.posts||[]).map(p=>{
          const post=p.post; const counts=p.counts||{};
          return { id:"lemmy-"+post.id, title:post.name,
                   summary:(post.body||"").slice(0,220)||`score:${counts.score||0}`,
                   url:post.ap_id||post.url||"", timestamp:post.published,
                   source:"Lemmy", sourceType:"Lemmy", tag:"SOCIAL", country,
                   score:counts.score||0, comments:counts.comments||0 };
        });
      } catch { return []; }
    }))).filter(r=>r.status==="fulfilled").flatMap(r=>r.value);
  }
  else if (batch === 3) {
    label = "HN batch 1";
    items = await fetchHNBatch([...HN_QUERY_BATCHES[0], ...HN_QUERY_BATCHES[1]]);
  }
  else if (batch === 4) {
    label = "HN batch 2";
    items = await fetchHNBatch([...HN_QUERY_BATCHES[2], ...HN_QUERY_BATCHES[3]]);
  }

  // Dedup within this batch
  const seen = new Set();
  const unique = items.filter(i=>{ if(!i.id||seen.has(i.id)) return false; seen.add(i.id); return true; });

  // Merge into Redis
  const result = await mergeToRedis(unique);

  const nextBatch = batch < 4 ? batch + 1 : null;
  const nextUrl = nextBatch
    ? `/api/backfill?secret=${req.query.secret||"YOUR_SECRET"}&batch=${nextBatch}`
    : null;

  return res.status(200).json({
    ok: true,
    batch,
    label,
    fetched: unique.length,
    addedToRedis: result.added,
    totalInRedis: result.total,
    elapsedMs: Date.now() - t0,
    next: nextUrl
      ? { batch: nextBatch, url: nextUrl, message: `Visit this URL next to continue backfill` }
      : { message: "✅ All 4 batches complete! Backfill done." },
  });
}
