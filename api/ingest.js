// api/ingest.js — Horizon Sentinel · 30-day Bulk Ingest
// Fetches all sources in parallel and pre-processes them server-side.
// Returns a single normalised JSON payload ready for the dashboard.
// No API keys required except GEMINI_API_KEY (optional — skipped if missing).

const SECTIONS = {
  "🚨 Crisis & Safety":       ["war","conflict","ceasefire","attack","bomb","fire","flood","storm","houthi","missile","casualties","emergency","killed","explosion","drought","earthquake","pandemic","virus","outbreak","shooting","riot","protest","clash"],
  "💼 Economy & Business":    ["oil","opec","economy","gdp","inflation","market","investment","trade","startup","fund","aramco","adnoc","property","rent","salary","job","tourism","vision 2030","neom","stock","revenue","profit","budget","export","import","privatisation","ipo"],
  "🏛️ Politics & Governance": ["government","minister","policy","election","parliament","diplomacy","sanction","treaty","reform","law","decree","summit","president","prime minister","royal","cabinet","geopolitics","nuclear","coup","alliance","un resolution","veto","embassy"],
  "🌐 Expat & Daily Life":    ["visa","expat","cost of living","iqama","golden visa","traffic","metro","food","restaurant","transport","immigration","residency","permit","school","healthcare","rent prices","housing","utility","grocery"],
  "🕌 Culture & Society":     ["ramadan","eid","mosque","religion","entertainment","festival","education","university","women","sports","arts","culture","social","marriage","family","heritage","cinema","music","gaming","tourism"],
  "💻 Tech & Innovation":     ["ai","artificial intelligence","startup","tech","innovation","crypto","blockchain","smart city","5g","solar","renewable","fintech","digital","cybersecurity","g42","microsoft","google","meta","nvidia","data center"],
};

const POS_WORDS = ["growth","surge","record","success","deal","agreement","expands","boost","profit","milestone","launch","opens","stable","peace","recovery","award","invest","improve","achieve","develop","partnership","advance","innovation","strong","win","hope","progress","rise","benefit","support"];
const NEG_WORDS = ["crisis","attack","conflict","warning","risk","decline","concern","tension","threat","disruption","sanction","collapse","killed","explosion","flood","fire","war","bomb","strike","missile","casualties","arrest","ban","shortage","inflation","debt","corruption","failure","violence","terrorism","hostage","dead","wounded","detained","drought","famine"];
const NEGATIONS = ["not","no","never","don't","doesn't","didn't","won't","can't","isn't","aren't","wasn't","without"];

function classifySection(text) {
  const t = (text || "").toLowerCase();
  let best = "Other", bestScore = 0;
  for (const [sec, keywords] of Object.entries(SECTIONS)) {
    const score = keywords.filter(k => t.includes(k)).length;
    if (score > bestScore) { best = sec; bestScore = score; }
  }
  return best;
}

function detectCountry(text) {
  const t = (text || "").toLowerCase();
  if (["uae","dubai","abu dhabi","emirati","sharjah"].some(k=>t.includes(k))) return "UAE";
  if (["saudi","riyadh","jeddah","aramco","ksa","mecca"].some(k=>t.includes(k))) return "Saudi Arabia";
  if (["qatar","doha"].some(k=>t.includes(k))) return "Qatar";
  if (t.includes("kuwait")) return "Kuwait";
  if (["jordan","amman"].some(k=>t.includes(k))) return "Jordan";
  if (["oman","muscat"].some(k=>t.includes(k))) return "Oman";
  if (t.includes("bahrain")) return "Bahrain";
  if (["lebanon","beirut"].some(k=>t.includes(k))) return "Lebanon";
  if (["israel","tel aviv","jerusalem"].some(k=>t.includes(k))) return "Israel";
  if (t.includes("iran")) return "Iran";
  if (t.includes("yemen")) return "Yemen";
  return "Regional";
}

function analyseSentiment(text) {
  if (!text) return { label:"NEUTRAL", score: 0 };
  const words = text.toLowerCase().split(/\W+/);
  let pos = 0, neg = 0;
  words.forEach((w, i) => {
    const negated = NEGATIONS.includes(words[i-1] || "");
    if (POS_WORDS.includes(w)) negated ? neg++ : pos++;
    if (NEG_WORDS.includes(w)) negated ? pos++ : neg++;
  });
  if (neg > pos + 1) return { label:"CRITICAL", score: -2 };
  if (neg > pos)     return { label:"WARNING",  score: -1 };
  if (pos > neg + 1) return { label:"POSITIVE", score:  2 };
  if (pos > neg)     return { label:"STABLE",   score:  1 };
  return               { label:"NEUTRAL",  score:  0 };
}

function normalise(raw) {
  const text = `${raw.title || ""} ${raw.summary || ""}`;
  return {
    id:         raw.id,
    title:      raw.title,
    summary:    (raw.summary || "").slice(0, 240),
    url:        raw.url,
    timestamp:  raw.timestamp,
    source:     raw.source,
    sourceType: raw.sourceType,
    tag:        raw.tag,
    country:    raw.country || detectCountry(text),
    section:    classifySection(text),
    sentiment:  analyseSentiment(text),
    score:      raw.score || 0,
    comments:   raw.comments || 0,
  };
}

// ── RSS Parser ────────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const items = [];
  const isAtom = xml.includes("<feed") && xml.includes('xmlns="http://www.w3.org/2005/Atom"');
  const tag = (s, t) => { const r = new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${t}>`, "i"); const m = s.match(r); return m ? (m[1]??m[2]??"").trim() : ""; };
  const attr = (s, t, a) => { const r = new RegExp(`<${t}[^>]*${a}="([^"]*)"`, "i"); const m = s.match(r); return m ? m[1] : ""; };
  const strip = h => h.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,240);
  const dec = s => s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));

  const entries = isAtom
    ? (xml.match(/<entry[\s\S]*?<\/entry>/g) || [])
    : (xml.match(/<item[\s\S]*?<\/item>/g) || []);

  for (const e of entries.slice(0, 30)) {
    const title   = isAtom ? tag(e,"title")  : tag(e,"title");
    const summary = isAtom ? (tag(e,"summary")||tag(e,"content")) : (tag(e,"description")||tag(e,"content:encoded"));
    const link    = isAtom ? (attr(e,"link","href")||tag(e,"link")) : tag(e,"link");
    const pubDate = isAtom ? (tag(e,"updated")||tag(e,"published")) : tag(e,"pubDate");
    const guid    = isAtom ? tag(e,"id") : tag(e,"guid");
    if (title) items.push({ title:dec(title), summary:dec(strip(summary)), link, pubDate, guid:guid||link });
  }
  return items;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────
const RSS_SOURCES = [
  { id:"bbc-me",   label:"BBC Middle East",  url:"https://feeds.bbci.co.uk/news/world/middle_east/rss.xml" },
  { id:"aljazeera",label:"Al Jazeera",        url:"https://www.aljazeera.com/xml/rss/all.xml" },
  { id:"reuters",  label:"Reuters World",     url:"https://feeds.reuters.com/reuters/topNews" },
  { id:"arabnews", label:"Arab News",         url:"https://www.arabnews.com/rss.xml" },
  { id:"guardian", label:"The Guardian",      url:"https://www.theguardian.com/world/rss" },
  { id:"gulfnews", label:"Gulf News",         url:"https://gulfnews.com/rss/uae" },
  { id:"national", label:"The National UAE",  url:"https://www.thenationalnews.com/rss/world.xml" },
];

// ── Mastodon ME tags ──────────────────────────────────────────────────────────
const MASTODON_TAGS = [
  { tag: "UAE",         country: "UAE",          tag_label: "UAE"  },
  { tag: "Dubai",       country: "UAE",          tag_label: "UAE"  },
  { tag: "SaudiArabia", country: "Saudi Arabia", tag_label: "KSA"  },
  { tag: "MENA",        country: "Regional",     tag_label: "ME"   },
  { tag: "MiddleEast",  country: "Regional",     tag_label: "ME"   },
  { tag: "Qatar",       country: "Qatar",        tag_label: "QAT"  },
  { tag: "Kuwait",      country: "Kuwait",       tag_label: "KUW"  },
  { tag: "Jordan",      country: "Jordan",       tag_label: "JOR"  },
  { tag: "Gaza",        country: "Palestine",    tag_label: "PSE"  },
  { tag: "Iran",        country: "Iran",         tag_label: "IRN"  },
  { tag: "OPEC",        country: "Regional",     tag_label: "GCC"  },
  { tag: "Israel",      country: "Israel",       tag_label: "ISR"  },
];

// ── Lemmy search queries ──────────────────────────────────────────────────────
const LEMMY_QUERIES = [
  { q: "UAE Dubai",        country: "UAE"          },
  { q: "Saudi Arabia",     country: "Saudi Arabia" },
  { q: "Qatar Doha",       country: "Qatar"        },
  { q: "MENA geopolitics", country: "Regional"     },
  { q: "Middle East",      country: "Regional"     },
  { q: "OPEC oil",         country: "Regional"     },
  { q: "Houthi Red Sea",   country: "Yemen"        },
  { q: "Iran nuclear",     country: "Iran"         },
  { q: "Israel Gaza",      country: "Palestine"    },
  { q: "Egypt economy",    country: "Egypt"        },
];


async function fetchMastodonTag({ tag, country }) {
  try {
    const r = await fetch(
      `https://mastodon.social/api/v1/timelines/tag/${tag}?limit=20`,
      { headers: { "Accept": "application/json", "User-Agent": "HorizonSentinel-OSINT/3.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return [];
    const posts = await r.json();
    return posts
      .filter(p => p.content && !p.reblog)
      .map(p => {
        const txt = p.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return {
          id: "masto-" + p.id,
          title: txt.slice(0, 160) || `#${tag} signal`,
          summary: txt.slice(0, 240),
          url: p.url || "",
          timestamp: p.created_at,
          source: `#${tag} (Mastodon)`,
          sourceType: "Mastodon",
          tag: tag.toUpperCase(),
          country,
          score: p.favourites_count || 0,
          comments: p.replies_count || 0,
        };
      });
  } catch { return []; }
}

async function fetchLemmyQuery({ q, country }) {
  try {
    const r = await fetch(
      `https://lemmy.world/api/v3/search?q=${encodeURIComponent(q)}&type_=Posts&sort=TopAll&limit=15`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return [];
    const d = await r.json();
    return (d.posts || []).map(p => {
      const post = p.post; const counts = p.counts || {};
      return {
        id: "lemmy-" + post.id,
        title: post.name,
        summary: (post.body || "").slice(0, 220) || `↑${counts.score || 0} · 💬${counts.comments || 0}`,
        url: post.ap_id || post.url || "",
        timestamp: post.published,
        source: `Lemmy`,
        sourceType: "Lemmy",
        tag: "SOCIAL",
        country,
        score: counts.score || 0,
        comments: counts.comments || 0,
      };
    });
  } catch { return []; }
}


async function fetchHN30d() {
  const since = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
  const queries = ["UAE Dubai","Saudi Arabia Riyadh","Qatar Doha","Gulf OPEC","Middle East geopolitics","Houthi Red Sea","Israel Gaza ceasefire","Iran nuclear","NEOM Saudi","GCC economy"];
  const all = [];
  const seen = new Set();
  await Promise.allSettled(queries.map(async (q) => {
    try {
      const d = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=20&numericFilters=created_at_i>${since}`
      ).then(r => r.json());
      for (const h of (d.hits || [])) {
        if (!h.title || seen.has(h.objectID)) continue;
        seen.add(h.objectID);
        all.push({
          id:         "hn-" + h.objectID,
          title:      h.title,
          summary:    `${h.points||0} pts · ${h.num_comments||0} comments`,
          url:        h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
          timestamp:  h.created_at,
          source:     "Hacker News",
          sourceType: "HN",
          tag:        "TECH",
          score:      h.points || 0,
          comments:   h.num_comments || 0,
        });
      }
    } catch { /* skip */ }
  }));
  return all;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startedAt = Date.now();

  // Run all sources in parallel
  const [rssResults, mastoResults, lemmyResults, hnItems] = await Promise.all([
    // RSS: all 7 feeds in parallel
    Promise.all(RSS_SOURCES.map(src => fetchRSSSource(src))),
    // Mastodon: 12 ME hashtag timelines (replaces Reddit — 403 from Vercel IPs)
    Promise.allSettled(MASTODON_TAGS.map(t => fetchMastodonTag(t))),
    // Lemmy: 10 MENA search queries (federated, open API)
    Promise.allSettled(LEMMY_QUERIES.map(q => fetchLemmyQuery(q))),
    // HN: 10 MENA queries × 20 results
    fetchHN30d(),
  ]);

  const rawAll = [
    ...rssResults.flat(),
    ...mastoResults.filter(r => r.status === "fulfilled").flatMap(r => r.value),
    ...lemmyResults.filter(r => r.status === "fulfilled").flatMap(r => r.value),
    ...hnItems,
  ];

  // Deduplicate by ID
  const seen = new Set();
  const raw = rawAll.filter(i => {
    if (!i.id || seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  // Normalise — classify section + detect country + sentiment in one pass
  const articles = raw.map(normalise);

  // Filter to last 30 days
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = articles.filter(a => new Date(a.timestamp).getTime() > cutoff);

  // Sort newest first
  recent.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Aggregate stats
  const sentDist = { POSITIVE:0, STABLE:0, NEUTRAL:0, WARNING:0, CRITICAL:0 };
  const sectionDist = {}, countryDist = {}, sourceDist = {};
  for (const a of recent) {
    sentDist[a.sentiment.label] = (sentDist[a.sentiment.label] || 0) + 1;
    sectionDist[a.section]  = (sectionDist[a.section]  || 0) + 1;
    countryDist[a.country]  = (countryDist[a.country]  || 0) + 1;
    sourceDist[a.sourceType]= (sourceDist[a.sourceType]|| 0) + 1;
  }

  // Pulse score
  const pulse = Math.min(98, Math.max(10, Math.round(
    50 + (sentDist.POSITIVE*4 + sentDist.STABLE*2) - (sentDist.CRITICAL*9 + sentDist.WARNING*4)
  )));

  // Source health
  const mastoActive = mastoResults.filter(r => r.status === "fulfilled" && r.value.length > 0).length;
  const lemmyActive = lemmyResults.filter(r => r.status === "fulfilled" && r.value.length > 0).length;
  const sourceHealth = {
    rss:      rssResults.map((r,i) => ({ id: RSS_SOURCES[i].id, count: r.length, status: r.length > 0 ? "active" : "error" })),
    mastodon: { count: mastoActive, active: mastoActive, status: mastoActive > 0 ? "active" : "warn" },
    lemmy:    { count: lemmyActive, active: lemmyActive, status: lemmyActive > 0 ? "active" : "warn" },
    hn:       { count: hnItems.length, status: hnItems.length > 0 ? "active" : "warn" },
  };

  const elapsedMs = Date.now() - startedAt;

  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600"); // cache 30 min on Vercel edge
  return res.status(200).json({
    ok: true,
    meta: {
      ingestedAt:   new Date().toISOString(),
      windowDays:   30,
      totalRaw:     raw.length,
      totalFiltered: recent.length,
      elapsedMs,
      sentDist,
      sectionDist,
      countryDist,
      sourceDist,
      pulse,
    },
    sourceHealth,
    articles: recent,
  });
}
