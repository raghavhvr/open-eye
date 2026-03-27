// api/reddit.js — Reddit signals via Pullpush.io (no API key needed)
// Pullpush is a community Reddit archive that doesn't block datacenter IPs.
// Fetches from ME subreddits + lottery subreddits in parallel.

const ME_SUBREDDITS = [
  { sub: "dubai",        country: "UAE"          },
  { sub: "UAE",          country: "UAE"          },
  { sub: "saudiarabia",  country: "Saudi Arabia" },
  { sub: "qatar",        country: "Qatar"        },
  { sub: "kuwait",       country: "Kuwait"       },
  { sub: "oman",         country: "Oman"         },
  { sub: "bahrain",      country: "Bahrain"      },
  { sub: "expats",       country: "Regional"     },
  { sub: "middleeast",   country: "Regional"     },
];

const LOT_SUBREDDITS = [
  { sub: "lottery",      country: "Global"       },
  { sub: "dubai",        country: "UAE"          }, // Big Ticket / Duty Free discussions
  { sub: "expats",       country: "Regional"     },
];

const LOT_KW = ["lottery","jackpot","win","winning","won","lucky","raffle","prize","draw","million","ticket","duty free","big ticket","mahzooz","sweepstake","gambling","casino"];

// Sentiment
const POS_WORDS = ["growth","surge","record","success","deal","agreement","boost","profit","launch","stable","peace","recovery","invest","milestone","win","winner","jackpot","prize","awarded"];
const NEG_WORDS = ["crisis","attack","conflict","warning","risk","decline","tension","threat","disruption","collapse","killed","explosion","war","bomb","scam","fraud","banned","debt","struggling"];
const NEGS = ["not","no","never","don't","doesn't","didn't","won't","can't","isn't","aren't"];

function analyseSentiment(text) {
  const words = (text||"").toLowerCase().split(/\W+/);
  let pos = 0, neg = 0;
  words.forEach((w,i) => {
    const negated = NEGS.includes(words[i-1]||"");
    if (POS_WORDS.includes(w)) negated ? neg++ : pos++;
    if (NEG_WORDS.includes(w)) negated ? pos++ : neg++;
  });
  if (neg > pos+1) return { label:"CRITICAL", score:-2 };
  if (neg > pos)   return { label:"WARNING",  score:-1 };
  if (pos > neg+1) return { label:"POSITIVE", score: 2 };
  if (pos > neg)   return { label:"STABLE",   score: 1 };
  return             { label:"NEUTRAL",  score: 0 };
}

function classifySection(text) {
  const t = (text||"").toLowerCase();
  if (["war","conflict","attack","bomb","missile","killed","explosion","ceasefire"].some(k=>t.includes(k))) return "🚨 Crisis & Safety";
  if (["oil","economy","market","investment","trade","salary","job","business","startup","aramco"].some(k=>t.includes(k))) return "💼 Economy & Business";
  if (["visa","expat","iqama","golden visa","traffic","rent","transport","school","immigration"].some(k=>t.includes(k))) return "🌐 Expat & Daily Life";
  if (["government","minister","policy","election","diplomacy","sanction","summit","president"].some(k=>t.includes(k))) return "🏛️ Politics & Governance";
  if (["ai","tech","startup","blockchain","5g","solar","fintech","digital","cybersecurity"].some(k=>t.includes(k))) return "💻 Tech & Innovation";
  if (["ramadan","eid","mosque","culture","sports","arts","education","heritage","cinema"].some(k=>t.includes(k))) return "🕌 Culture & Society";
  return "Other";
}

async function fetchSubreddit({ sub, country }, size = 25) {
  try {
    const since = Math.floor(Date.now()/1000) - 30*24*3600;
    const url = `https://api.pullpush.io/reddit/search/submission/?subreddit=${sub}&size=${size}&sort=desc&sort_type=created_utc&after=${since}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "OpenEye-OSINT/1.0 (open source MENA intelligence)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.data || []).map(p => {
      const text = `${p.title||""} ${p.selftext||""}`;
      return {
        id:         `reddit-${p.id}`,
        title:      p.title || "",
        summary:    (p.selftext || "").slice(0, 240) || `↑${p.score||0} · 💬${p.num_comments||0} comments`,
        url:        p.url || `https://reddit.com${p.permalink||""}`,
        timestamp:  new Date((p.created_utc||0)*1000).toISOString(),
        source:     `r/${sub}`,
        sourceType: "Reddit",
        tag:        sub.toUpperCase(),
        country,
        section:    classifySection(text),
        sentiment:  analyseSentiment(text),
        score:      p.score || 0,
        comments:   p.num_comments || 0,
        upvoteRatio: p.upvote_ratio || 0.75,
      };
    });
  } catch { return []; }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const mode = req.query.mode || "main"; // "main" or "lottery"

  if (mode === "lottery") {
    // Lottery mode: fetch lottery subreddits, filter for lottery keywords
    const results = await Promise.allSettled(
      LOT_SUBREDDITS.map(s => fetchSubreddit(s, 30))
    );
    const all = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value)
      .filter(p => LOT_KW.some(k => (p.title+" "+p.summary).toLowerCase().includes(k)));

    const seen = new Set();
    const unique = all.filter(i => { if(seen.has(i.id)) return false; seen.add(i.id); return true; });
    unique.sort((a,b) => b.score - a.score || new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({ ok: true, mode: "lottery", articles: unique, count: unique.length });
  }

  // Main mode: all ME subreddits
  const results = await Promise.allSettled(
    ME_SUBREDDITS.map(s => fetchSubreddit(s, 25))
  );

  const all = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value);

  const seen = new Set();
  const unique = all.filter(i => { if(seen.has(i.id)) return false; seen.add(i.id); return true; });
  unique.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

  const sourceDist = {};
  unique.forEach(a => { sourceDist[a.source] = (sourceDist[a.source]||0)+1; });

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({
    ok: true,
    mode: "main",
    articles: unique,
    count: unique.length,
    meta: { sourceDist, subreddits: ME_SUBREDDITS.map(s=>s.sub) },
  });
}
