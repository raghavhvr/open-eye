// api/reddit.js — Reddit signals via Pullpush.io archive (no API key needed)
// Pullpush mirrors all public Reddit posts and doesn't block datacenter IPs.

const ME_SUBREDDITS = [
  { sub:"dubai",        country:"UAE"          },
  { sub:"UAE",          country:"UAE"          },
  { sub:"saudiarabia",  country:"Saudi Arabia" },
  { sub:"qatar",        country:"Qatar"        },
  { sub:"kuwait",       country:"Kuwait"       },
  { sub:"oman",         country:"Oman"         },
  { sub:"bahrain",      country:"Bahrain"      },
  { sub:"expats",       country:"Regional"     },
  { sub:"middleeast",   country:"Regional"     },
  { sub:"arabs",        country:"Regional"     },
];

const POS_W = ["growth","surge","record","success","deal","agreement","boost","profit","launch","stable","peace","recovery","invest","milestone","win","winner","prize","awarded","hope","progress","improve","develop","signed","approved","relief","support"];
const NEG_W = ["crisis","attack","conflict","warning","risk","decline","tension","threat","disruption","collapse","killed","explosion","war","bomb","scam","fraud","banned","debt","struggling","arrested","detained","siege","airstrike","casualties","dead","wounded"];
const NEGS  = ["not","no","never","don't","doesn't","didn't","won't","can't","isn't","aren't","wasn't","without"];

function sentiment(text) {
  const words = (text||"").toLowerCase().split(/\W+/);
  let pos = 0, neg = 0;
  words.forEach((w,i) => {
    const negated = NEGS.includes(words[i-1]||"");
    if (POS_W.includes(w)) negated ? neg++ : pos++;
    if (NEG_W.includes(w)) negated ? pos++ : neg++;
  });
  if (neg > pos+1) return { label:"CRITICAL", score:-2 };
  if (neg > pos)   return { label:"WARNING",  score:-1 };
  if (pos > neg+1) return { label:"POSITIVE", score: 2 };
  if (pos > neg)   return { label:"STABLE",   score: 1 };
  return             { label:"NEUTRAL",  score: 0 };
}

function section(text) {
  const t = (text||"").toLowerCase();
  if (["war","conflict","attack","bomb","missile","killed","explosion","ceasefire","airstrike","siege","houthi"].some(k=>t.includes(k))) return "🚨 Crisis";
  if (["oil","opec","economy","gdp","inflation","market","investment","trade","salary","job","business","aramco","startup","ipo"].some(k=>t.includes(k))) return "💼 Economy";
  if (["visa","expat","iqama","golden visa","traffic","rent","transport","school","immigration","residency","cost of living"].some(k=>t.includes(k))) return "🌐 Expat";
  if (["government","minister","policy","election","parliament","diplomacy","sanction","treaty","reform","summit","president","royal"].some(k=>t.includes(k))) return "🏛️ Politics";
  if (["ai","tech","startup","blockchain","5g","solar","fintech","digital","cybersecurity","innovation","crypto"].some(k=>t.includes(k))) return "💻 Tech";
  if (["ramadan","eid","mosque","culture","sports","arts","education","heritage","cinema","women","religion"].some(k=>t.includes(k))) return "🕌 Culture";
  return "Other";
}

function country(text) {
  const t = (text||"").toLowerCase();
  if (["uae","dubai","abu dhabi","emirati","sharjah"].some(k=>t.includes(k))) return "UAE";
  if (["saudi","riyadh","jeddah","aramco","ksa","mecca","neom"].some(k=>t.includes(k))) return "Saudi Arabia";
  if (["qatar","doha","qatari"].some(k=>t.includes(k))) return "Qatar";
  if (["kuwait","kuwaiti"].some(k=>t.includes(k))) return "Kuwait";
  if (["jordan","amman","jordanian"].some(k=>t.includes(k))) return "Jordan";
  if (["oman","muscat","omani"].some(k=>t.includes(k))) return "Oman";
  if (["bahrain","manama"].some(k=>t.includes(k))) return "Bahrain";
  if (["lebanon","beirut","lebanese"].some(k=>t.includes(k))) return "Lebanon";
  if (["iraq","baghdad","iraqi","basra","mosul"].some(k=>t.includes(k))) return "Iraq";
  if (["egypt","cairo","egyptian","suez"].some(k=>t.includes(k))) return "Egypt";
  if (["israel","tel aviv","jerusalem","idf"].some(k=>t.includes(k))) return "Israel";
  if (["palestine","gaza","west bank","hamas","palestinian"].some(k=>t.includes(k))) return "Palestine";
  if (["yemen","sanaa","houthi","yemeni"].some(k=>t.includes(k))) return "Yemen";
  if (["iran","tehran","iranian","irgc"].some(k=>t.includes(k))) return "Iran";
  return "Regional";
}

async function fetchSubreddit({ sub, country: defaultCountry }, size = 25) {
  try {
    // Pullpush uses absolute epoch timestamps for after=
    const since = Math.floor(Date.now()/1000) - 30*24*3600;
    const url = `https://api.pullpush.io/reddit/search/submission/?subreddit=${sub}&size=${size}&sort=desc&sort_type=created_utc&after=${since}`;
    const r = await fetch(url, {
      headers: { "User-Agent":"OpenEye-OSINT/1.0" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return [];
    const d = await r.json();
    if (!d.data) return [];
    return d.data
      .filter(p => p.title && !p.removed_by_category) // skip removed posts
      .map(p => {
        const text = `${p.title||""} ${p.selftext||""}`;
        const det = country(text) !== "Regional" ? country(text) : defaultCountry;
        return {
          id:          `reddit-${p.id}`,
          title:       p.title || "",
          summary:     (p.selftext||"").replace(/\n+/g," ").trim().slice(0,240) || `↑${p.score||0} · 💬${p.num_comments||0} comments`,
          url:         p.url || `https://reddit.com${p.permalink||""}`,
          timestamp:   new Date((p.created_utc||0)*1000).toISOString(),
          source:      `r/${sub}`,
          sourceType:  "Reddit",
          tag:         sub.toUpperCase(),
          country:     det,
          section:     section(text),
          sentiment:   sentiment(text),
          score:       p.score || 0,
          comments:    p.num_comments || 0,
          upvoteRatio: p.upvote_ratio || 0.75,
        };
      });
  } catch { return []; }
}

export default async function handler(req, res) {
  const results = await Promise.allSettled(
    ME_SUBREDDITS.map(s => fetchSubreddit(s))
  );

  const all = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value);

  const seen = new Set();
  const unique = all
    .filter(i => { if (!i.id || seen.has(i.id)) return false; seen.add(i.id); return true; })
    .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

  const sourceDist = {};
  unique.forEach(a => { sourceDist[a.source] = (sourceDist[a.source]||0)+1; });

  res.setHeader("Cache-Control","s-maxage=300,stale-while-revalidate=600");
  return res.status(200).json({
    ok: true,
    articles: unique,
    count: unique.length,
    meta: { sourceDist, subreddits: ME_SUBREDDITS.map(s=>s.sub) },
  });
}
