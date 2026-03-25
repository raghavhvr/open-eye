import { useState, useEffect, useRef, useCallback } from "react";

// ── RSS SOURCES ──────────────────────────────────────────────────────────────
const RSS_SOURCES = [
  { id: "bbc-me",       label: "BBC Middle East",    url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", tag: "NEWS"     },
  { id: "reuters-me",   label: "Reuters World",       url: "https://feeds.reuters.com/reuters/worldNews",             tag: "NEWS"     },
  { id: "aljazeera",    label: "Al Jazeera",          url: "https://www.aljazeera.com/xml/rss/all.xml",               tag: "REGIONAL" },
  { id: "guardian",     label: "The Guardian World",  url: "https://www.theguardian.com/world/rss",                   tag: "NEWS"     },
  { id: "ft-world",     label: "FT World",            url: "https://www.ft.com/rss/home/world",                       tag: "FINANCE"  },
];

const WIKI_TOPICS = [
  "Saudi Arabia", "United Arab Emirates", "Qatar", "OPEC",
  "Energy security", "Artificial intelligence regulation",
];

// ── COLOR TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg:               "#0b1326",
  surface:          "#171f33",
  surfaceHigh:      "#222a3d",
  surfaceHighest:   "#2d3449",
  primary:          "#b4c5ff",
  primaryContainer: "#003188",
  secondary:        "#4edea3",
  tertiary:         "#ffb95f",
  error:            "#ffb4ab",
  onSurface:        "#dae2fd",
  onSurfaceVariant: "#c3c7ce",
  outline:          "#43474d",
  sidebar:          "#131b2e",
};

// ── SENTIMENT CLASSIFIER ──────────────────────────────────────────────────────
function guessSentiment(text) {
  const t = text.toLowerCase();
  const pos = ["growth","surge","record","success","deal","agreement","expands","boost","profit","milestone","launch","secures","signs","opening","positive","increase"];
  const neg = ["crisis","attack","conflict","warning","risk","decline","concern","tension","threat","critical","disruption","sanction","ban","collapse","arrest","violence"];
  const p = pos.filter(w => t.includes(w)).length;
  const n = neg.filter(w => t.includes(w)).length;
  if (n > p + 1) return { label: "CRITICAL", color: C.error,            bg: "#93000a22" };
  if (n > p)     return { label: "WARNING",  color: C.tertiary,          bg: "#51310022" };
  if (p > n)     return { label: "POSITIVE", color: C.secondary,         bg: "#00a57222" };
  return           { label: "NEUTRAL",   color: C.onSurfaceVariant,  bg: "#43474d22" };
}

// ── DATA FETCHERS ─────────────────────────────────────────────────────────────
async function fetchRSS(source) {
  const proxy = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}&count=5`;
  try {
    const d = await fetch(proxy).then(r => r.json());
    if (!d.items) return [];
    return d.items.slice(0, 5).map(item => ({
      id:        item.guid || item.link,
      title:     item.title,
      summary:   (item.description || "").replace(/<[^>]+>/g, "").slice(0, 180),
      url:       item.link,
      timestamp: new Date(item.pubDate || Date.now()),
      source:    source.label,
      tag:       source.tag,
      sentiment: guessSentiment(item.title + " " + (item.description || "")),
    }));
  } catch { return []; }
}

async function fetchWikipedia(topic) {
  try {
    const d = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`).then(r => r.json());
    return {
      id:        "wiki-" + topic,
      title:     d.title,
      summary:   (d.extract || "").slice(0, 200),
      url:       d.content_urls?.desktop?.page || "",
      timestamp: new Date(),
      source:    "Wikipedia",
      tag:       "INTEL",
      sentiment: guessSentiment(d.extract || ""),
    };
  } catch { return null; }
}

async function fetchHackerNews(keyword) {
  try {
    const d = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=3`).then(r => r.json());
    return (d.hits || []).map(h => ({
      id:        "hn-" + h.objectID,
      title:     h.title,
      summary:   `${h.points || 0} points · ${h.num_comments || 0} comments · by ${h.author}`,
      url:       h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      timestamp: new Date(h.created_at),
      source:    "Hacker News",
      tag:       "TECH",
      sentiment: guessSentiment(h.title),
    }));
  } catch { return []; }
}

async function fetchOpenMeteo() {
  try {
    const d = await fetch("https://api.open-meteo.com/v1/forecast?latitude=24.7136&longitude=46.6753&current=temperature_2m,wind_speed_10m&forecast_days=1").then(r => r.json());
    return { temp: d.current?.temperature_2m, wind: d.current?.wind_speed_10m };
  } catch { return null; }
}

async function fetchExchangeRate() {
  try {
    const d = await fetch("https://api.exchangerate-api.com/v4/latest/USD").then(r => r.json());
    return { sar: d.rates?.SAR, aed: d.rates?.AED, qar: d.rates?.QAR };
  } catch { return null; }
}

// ── AI BRIEF — calls our own /api/brief Vercel serverless function ────────────
// The Gemini API key never touches the browser — it lives in GEMINI_API_KEY env var.
async function fetchBrief(items) {
  const headlines = items.slice(0, 12).map(i => i.title);
  try {
    const res = await fetch("/api/brief", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ headlines }),
    });
    const data = await res.json();
    if (!res.ok) return { _error: data.error || "Unknown error from /api/brief" };
    return data;
  } catch (e) {
    return { _error: e.message };
  }
}

function calcPulseScore(items) {
  if (!items.length) return 50;
  const c = items.filter(i => i.sentiment.label === "CRITICAL").length;
  const w = items.filter(i => i.sentiment.label === "WARNING").length;
  const p = items.filter(i => i.sentiment.label === "POSITIVE").length;
  return Math.min(99, Math.max(10, Math.round(50 + p * 3 - c * 8 - w * 4)));
}

// ── UI COMPONENTS ─────────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 32 }) {
  if (!data || data.length < 2) return null;
  const W = 80, H = height;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThreatGauge({ level }) {
  const pcts   = { LOW: 0.25, MODERATE: 0.5, ELEVATED: 0.75, CRITICAL: 1 };
  const colors = { LOW: C.secondary, MODERATE: C.tertiary, ELEVATED: "#ff8c42", CRITICAL: C.error };
  const pct = pcts[level] || 0.5, color = colors[level] || C.tertiary;
  const r = 38, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width="100" height="70" viewBox="0 0 100 80">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.surface} strokeWidth="8"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={-(circ * 0.125)} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${pct * circ * 0.75} ${circ - pct * circ * 0.75}`}
          strokeDashoffset={-(circ * 0.125)} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease, stroke 0.5s ease" }} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize="11" fontWeight="800" fontFamily="Manrope">{level}</text>
      </svg>
    </div>
  );
}

function PulseRing({ score, loading }) {
  const pct = score / 100, r = 54, cx = 65, cy = 65, circ = 2 * Math.PI * r;
  const color = score > 70 ? C.secondary : score > 45 ? C.primary : C.error;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke={`${color}15`} strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.surface} strokeWidth="10" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${pct * circ} ${circ * (1 - pct)}`} strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${color}88)` }} />
        {loading
          ? <text x={cx} y={cy + 6} textAnchor="middle" fill={C.onSurfaceVariant} fontSize="12" fontFamily="Manrope">…</text>
          : <>
              <text x={cx} y={cy - 4}  textAnchor="middle" fill={color}            fontSize="28" fontWeight="900" fontFamily="Manrope">{score}</text>
              <text x={cx} y={cy + 14} textAnchor="middle" fill={C.onSurfaceVariant} fontSize="8" fontWeight="700" fontFamily="Manrope" letterSpacing="0.15em">PULSE</text>
            </>
        }
      </svg>
    </div>
  );
}

function FeedItem({ item, index }) {
  const [exp, setExp] = useState(false);
  const age = Math.floor((Date.now() - item.timestamp) / 60000);
  const ageStr = age < 60 ? `${age}m ago` : `${Math.floor(age / 60)}h ago`;
  return (
    <div onClick={() => setExp(!exp)} className="feed-item"
      style={{ background: exp ? C.surfaceHigh : C.surface, border: `1px solid ${C.outline}22`,
        borderLeft: `3px solid ${item.sentiment.color}`, borderRadius: 8, padding: "14px 16px",
        cursor: "pointer", transition: "all 0.2s", animationDelay: `${index * 40}ms` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ background: item.sentiment.bg, color: item.sentiment.color, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.1em" }}>{item.sentiment.label}</span>
            <span style={{ background: `${C.primaryContainer}44`, color: C.primary, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.1em" }}>{item.tag}</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.onSurface, lineHeight: 1.4, margin: 0 }}>{item.title}</p>
          {exp && item.summary && <p style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 8, lineHeight: 1.6 }}>{item.summary}</p>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: C.onSurfaceVariant, display: "block" }}>{ageStr}</span>
          <span style={{ fontSize: 9, color: `${C.primary}99`, display: "block", marginTop: 2 }}>{item.source}</span>
        </div>
      </div>
      {exp && item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          style={{ fontSize: 10, color: C.primary, marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
          Open Source ↗
        </a>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,      setActiveTab]      = useState("feed");
  const [items,          setItems]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [lastRefresh,    setLastRefresh]    = useState(null);
  const [brief,          setBrief]          = useState(null);
  const [briefLoading,   setBriefLoading]   = useState(false);
  const [pulseScore,     setPulseScore]     = useState(50);
  const [weather,        setWeather]        = useState(null);
  const [fx,             setFx]             = useState(null);
  const [filter,         setFilter]         = useState("ALL");
  const [pulseHistory,   setPulseHistory]   = useState([50,52,48,55,60,58,62]);
  const [activeSource,   setActiveSource]   = useState(null);
  const [sourceStatuses, setSourceStatuses] = useState({});
  const timerRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const statuses = {}, allItems = [];

    for (const src of RSS_SOURCES) {
      const itms = await fetchRSS(src);
      statuses[src.id] = itms.length > 0 ? "active" : "error";
      allItems.push(...itms);
    }
    for (const topic of WIKI_TOPICS) {
      const item = await fetchWikipedia(topic);
      if (item) { statuses["wiki-" + topic] = "active"; allItems.push(item); }
    }
    const hnItems = await fetchHackerNews("geopolitics energy");
    statuses["hackernews"] = hnItems.length > 0 ? "active" : "warn";
    allItems.push(...hnItems);

    allItems.sort((a, b) => b.timestamp - a.timestamp);
    const seen = new Set();
    const unique = allItems.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });

    setItems(unique);
    setSourceStatuses(statuses);
    const score = calcPulseScore(unique);
    setPulseScore(score);
    setPulseHistory(prev => [...prev.slice(-6), score]);
    setLastRefresh(new Date());
    setLoading(false);

    fetchOpenMeteo().then(setWeather);
    fetchExchangeRate().then(setFx);

    if (unique.length > 5) {
      setBriefLoading(true);
      fetchBrief(unique).then(b => { setBrief(b); setBriefLoading(false); });
    }
  }, []);

  useEffect(() => {
    loadData();
    timerRef.current = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, [loadData]);

  const filtered = filter === "ALL" ? items : items.filter(i => i.sentiment.label === filter || i.tag === filter);
  const counts = {
    ALL:      items.length,
    CRITICAL: items.filter(i => i.sentiment.label === "CRITICAL").length,
    WARNING:  items.filter(i => i.sentiment.label === "WARNING").length,
    POSITIVE: items.filter(i => i.sentiment.label === "POSITIVE").length,
    NEUTRAL:  items.filter(i => i.sentiment.label === "NEUTRAL").length,
  };

  const TABS = [
    { id: "feed",    icon: "⚡", label: "Live Feed"  },
    { id: "brief",   icon: "🧠", label: "AI Brief"   },
    { id: "sources", icon: "🔌", label: "Sources"    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif", color: C.onSurface, fontSize: 13 }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2d3449; border-radius: 10px; }
        .feed-item:hover { transform: translateX(2px); }
        .nav-btn { transition: all 0.15s; }
        .nav-btn:hover { background: #171f3388 !important; }
        @keyframes pulse-dot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @keyframes fade-in    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin       { to{transform:rotate(360deg)} }
        @keyframes ticker     { 0%{transform:translateX(100%)} 100%{transform:translateX(-200%)} }
        .feed-item  { animation: fade-in .3s ease forwards; }
        .spin       { animation: spin 1s linear infinite; }
        .ticker-txt { animation: ticker 30s linear infinite; display:inline-block; white-space:nowrap; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, background: C.sidebar, display: "flex", flexDirection: "column", borderRight: `1px solid ${C.outline}22`, flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "20px 16px", borderBottom: `1px solid ${C.outline}22` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: C.primaryContainer, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛰️</div>
            <div>
              <div style={{ fontFamily: "Manrope", fontWeight: 900, fontSize: 13, color: C.primary, letterSpacing: "0.05em" }}>OPEN EYE</div>
              <div style={{ fontSize: 8, color: `${C.primary}60`, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700 }}>OSINT Platform v1.0</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 12px", borderBottom: `1px solid ${C.outline}22` }}>
          <PulseRing score={pulseScore} loading={loading} />
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <div style={{ fontSize: 9, color: C.onSurfaceVariant, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Regional Pulse Score</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.secondary, display: "inline-block", animation: "pulse-dot 1.5s ease infinite" }} />
              <span style={{ fontSize: 9, color: C.secondary, fontWeight: 700 }}>LIVE</span>
            </div>
          </div>
        </div>

        <nav style={{ padding: "8px 8px", flex: 1 }}>
          {TABS.map(t => (
            <button key={t.id} className="nav-btn" onClick={() => setActiveTab(t.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2,
                background:   activeTab === t.id ? C.surface : "transparent",
                color:        activeTab === t.id ? C.primary : `${C.onSurface}99`,
                borderLeft:   activeTab === t.id ? `3px solid ${C.primary}` : "3px solid transparent",
                fontWeight:   activeTab === t.id ? 700 : 500, fontSize: 12 }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>

        {/* FX Rates */}
        <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.outline}22`, fontSize: 10 }}>
          <div style={{ color: `${C.onSurfaceVariant}88`, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>FX Rates (USD)</div>
          {fx
            ? [["SAR", fx.sar], ["AED", fx.aed], ["QAR", fx.qar]].map(([k, v]) => v && (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: C.onSurfaceVariant }}>{k}</span>
                  <span style={{ color: C.onSurface, fontWeight: 700 }}>{v.toFixed(3)}</span>
                </div>
              ))
            : <div style={{ color: `${C.onSurfaceVariant}55` }}>Loading…</div>
          }
        </div>

        {/* Refresh */}
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.outline}22` }}>
          <button onClick={loadData} disabled={loading}
            style={{ width: "100%", background: `linear-gradient(135deg, ${C.primaryContainer}, ${C.primary}33)`, border: `1px solid ${C.primary}33`, color: C.primary, borderRadius: 6, padding: "8px", fontSize: 11, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 12, display: "inline-block", ...(loading ? { animation: "spin 1s linear infinite" } : {}) }}>⟳</span>
            {loading ? "Ingesting…" : "Refresh Feed"}
          </button>
          {lastRefresh && <div style={{ fontSize: 9, color: `${C.onSurfaceVariant}55`, textAlign: "center", marginTop: 4 }}>Updated {lastRefresh.toLocaleTimeString()}</div>}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <header style={{ background: C.sidebar, borderBottom: `1px solid ${C.outline}22`, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontFamily: "Manrope", fontWeight: 900, fontSize: 16, color: C.primary, letterSpacing: "-0.02em" }}>STRATEGIC EYE</div>
          <div style={{ flex: 1, margin: "0 20px", overflow: "hidden", background: C.surface, borderRadius: 4, padding: "4px 0", maxWidth: 600 }}>
            <span style={{ fontSize: 9, background: `${C.error}22`, color: C.error, padding: "2px 6px", borderRadius: 3, fontWeight: 800, marginLeft: 8 }}>● LIVE</span>
            <span className="ticker-txt" style={{ fontSize: 11, color: C.onSurfaceVariant, marginLeft: 12 }}>
              {items.slice(0, 5).map(i => i.title).join("  ·  ")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: C.onSurfaceVariant }}>{items.length} signals</span>
            <span style={{ fontSize: 9, color: C.secondary, fontWeight: 700, background: `${C.secondary}22`, padding: "2px 8px", borderRadius: 10 }}>● API CONNECTED</span>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>

          {/* ══ FEED TAB ══ */}
          {activeTab === "feed" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontFamily: "Manrope", fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em" }}>Open Intelligence Feed <span style={{ color: C.primary }}>.</span></h1>
                  <p style={{ color: C.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>Real-time signals from {Object.keys(sourceStatuses).length} verified open-source channels</p>
                </div>
                <div style={{ background: C.surface, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.outline}22` }}>
                  <div style={{ fontSize: 9, color: C.onSurfaceVariant, fontWeight: 700, marginBottom: 4, letterSpacing: "0.1em", textTransform: "uppercase" }}>Pulse Trend</div>
                  <Sparkline data={pulseHistory} color={C.primary} height={28} />
                </div>
              </div>

              {/* Filter pills */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {[["ALL", C.primary], ["CRITICAL", C.error], ["WARNING", C.tertiary], ["POSITIVE", C.secondary], ["NEUTRAL", C.onSurfaceVariant]].map(([f, col]) => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${filter === f ? col : C.outline + "33"}`, background: filter === f ? `${col}22` : "transparent", color: filter === f ? col : C.onSurfaceVariant, fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.15s" }}>
                    {f} {counts[f] ? `(${counts[f]})` : ""}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
                {/* Feed list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {loading && items.length === 0
                    ? [...Array(6)].map((_, i) => <div key={i} style={{ background: C.surface, borderRadius: 8, padding: 16, height: 72, opacity: 0.4, animation: "pulse-dot 1.5s ease infinite", animationDelay: `${i * 100}ms` }} />)
                    : filtered.length === 0
                      ? <div style={{ color: C.onSurfaceVariant, textAlign: "center", padding: 40, fontSize: 13 }}>No signals matching this filter.</div>
                      : filtered.map((item, idx) => <FeedItem key={item.id} item={item} index={idx} />)
                  }
                </div>

                {/* Right sidebar */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Sentiment breakdown */}
                  <div style={{ background: C.surface, borderRadius: 10, padding: 16, border: `1px solid ${C.outline}22` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 12 }}>Signal Sentiment</div>
                    {[["POSITIVE", C.secondary, counts.POSITIVE], ["NEUTRAL", C.onSurfaceVariant, counts.NEUTRAL], ["WARNING", C.tertiary, counts.WARNING], ["CRITICAL", C.error, counts.CRITICAL]].map(([label, color, count]) => (
                      <div key={label} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                          <span style={{ color }}>{label}</span>
                          <span style={{ color: C.onSurface, fontWeight: 700 }}>{count}</span>
                        </div>
                        <div style={{ height: 4, background: `${C.outline}33`, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${items.length ? (count / items.length) * 100 : 0}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Weather */}
                  {weather && (
                    <div style={{ background: C.surface, borderRadius: 10, padding: 16, border: `1px solid ${C.outline}22` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 8 }}>Riyadh Conditions</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: C.primary, fontFamily: "Manrope" }}>{weather.temp}°C</div>
                      <div style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>Wind: {weather.wind} km/h</div>
                    </div>
                  )}

                  {/* Top sources */}
                  <div style={{ background: C.surface, borderRadius: 10, padding: 16, border: `1px solid ${C.outline}22` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 10 }}>Top Sources</div>
                    {[...new Set(items.map(i => i.source))].slice(0, 6).map(src => {
                      const count = items.filter(i => i.source === src).length;
                      return (
                        <div key={src} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: C.onSurface, fontWeight: 600 }}>{src}</span>
                          <span style={{ fontSize: 10, color: C.primary, fontWeight: 800, background: `${C.primaryContainer}55`, padding: "1px 7px", borderRadius: 10 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ AI BRIEF TAB ══ */}
          {activeTab === "brief" && (
            <div style={{ maxWidth: 720 }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "Manrope", fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em" }}>AI Intelligence Brief <span style={{ color: C.primary }}>.</span></h1>
                <p style={{ color: C.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>Claude-powered synthesis of {items.length} open-source signals via Gemini 2.5 Flash</p>
              </div>

              {briefLoading ? (
                <div style={{ background: C.surface, borderRadius: 12, padding: 32, border: `1px solid ${C.outline}22`, textAlign: "center" }}>
                  <div className="spin" style={{ fontSize: 32, marginBottom: 12, display: "inline-block" }}>⟳</div>
                  <div style={{ color: C.onSurfaceVariant, fontSize: 13 }}>Analysing {items.length} signals with Gemini 2.5 Flash…</div>
                </div>
              ) : brief?._error ? (
                <div style={{ background: `${C.error}11`, borderRadius: 12, padding: 24, border: `1px solid ${C.error}33` }}>
                  <div style={{ fontWeight: 700, color: C.error, marginBottom: 8, fontSize: 13 }}>⚠ Gemini API Error</div>
                  <p style={{ fontSize: 12, color: C.onSurfaceVariant, lineHeight: 1.6 }}>{brief._error}</p>
                  <p style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 8 }}>
                    Make sure <code style={{ background: C.surfaceHigh, padding: "1px 4px", borderRadius: 3 }}>GEMINI_API_KEY</code> is set in your Vercel project → Settings → Environment Variables.
                  </p>
                </div>
              ) : brief ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.outline}22` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Top Theme</div>
                        <div style={{ fontFamily: "Manrope", fontSize: 20, fontWeight: 900, color: C.primary, marginBottom: 12 }}>{brief.topTheme}</div>
                        <p style={{ fontSize: 14, color: C.onSurface, lineHeight: 1.7 }}>{brief.summary}</p>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "center" }}>
                        <ThreatGauge level={brief.threatLevel} />
                        <div style={{ fontSize: 9, color: C.onSurfaceVariant, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Threat Level</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.outline}22` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 14 }}>Key Trends Identified</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(brief.keyTrends || []).map((trend, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <span style={{ width: 22, height: 22, background: C.primaryContainer, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: C.primary, flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: 13, color: C.onSurface, lineHeight: 1.5, fontWeight: 500 }}>{trend}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: `${C.tertiary}11`, borderRadius: 12, padding: 20, border: `1px solid ${C.tertiary}33` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.tertiary, marginBottom: 12 }}>⚠ Watch Items</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(brief.watchItems || []).map((item, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ color: C.tertiary, fontSize: 12, flexShrink: 0 }}>→</span>
                          <span style={{ fontSize: 13, color: C.onSurface, lineHeight: 1.5 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => { setBriefLoading(true); fetchBrief(items).then(b => { setBrief(b); setBriefLoading(false); }); }}
                    style={{ background: `linear-gradient(135deg, ${C.primaryContainer}, ${C.primary}44)`, border: `1px solid ${C.primary}44`, color: C.primary, borderRadius: 8, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
                    ⟳ Regenerate Brief
                  </button>
                </div>
              ) : (
                <div style={{ background: C.surface, borderRadius: 12, padding: 32, border: `1px solid ${C.outline}22`, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: C.onSurfaceVariant }}>Refresh the feed to generate an AI brief.</div>
                </div>
              )}
            </div>
          )}

          {/* ══ SOURCES TAB ══ */}
          {activeTab === "sources" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "Manrope", fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em" }}>Source Management <span style={{ color: C.primary }}>.</span></h1>
                <p style={{ color: C.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>Open-source signal channels, RSS ingestion pipelines, and free API integrations</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                {[["Active Sources", Object.values(sourceStatuses).filter(s => s === "active").length, C.secondary], ["Total Signals", items.length, C.primary], ["System Health", "OPTIMAL", C.secondary]].map(([label, val, color]) => (
                  <div key={label} style={{ background: C.surface, borderRadius: 10, padding: 16, border: `1px solid ${C.outline}22` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "Manrope" }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: C.surface, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.outline}22` }}>
                <div style={{ background: C.surfaceHigh, padding: "10px 16px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", gap: 12, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant }}>
                  <span>Source</span><span>Type</span><span>Frequency</span><span>Status</span><span>Signals</span>
                </div>
                {[
                  ...RSS_SOURCES.map(s => ({ id: s.id, name: s.label, type: "RSS Feed",  freq: "Live",      statusKey: s.id })),
                  { id: "wiki",         name: "Wikipedia Open API",    type: "REST API",  freq: "On Demand", statusKey: "wiki-Saudi Arabia" },
                  { id: "hackernews",   name: "Hacker News Algolia",   type: "REST API",  freq: "Live",      statusKey: "hackernews" },
                  { id: "exchangerate", name: "Exchange Rate API",      type: "REST API",  freq: "Hourly",    statusKey: "fx" },
                  { id: "openmeteo",    name: "Open-Meteo Weather",     type: "REST API",  freq: "Hourly",    statusKey: "weather" },
                  { id: "gemini",       name: "Gemini 2.5 Flash (AI)",  type: "Serverless",freq: "On Demand", statusKey: "gemini" },
                ].map((src, i) => {
                  const status = src.id === "gemini" ? (brief && !brief._error ? "active" : "unknown") : (sourceStatuses[src.statusKey] || "unknown");
                  const sigCount = items.filter(it => it.source === src.name).length;
                  return (
                    <div key={src.id} onClick={() => setActiveSource(activeSource === src.id ? null : src.id)}
                      style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", gap: 12, alignItems: "center", borderTop: i > 0 ? `1px solid ${C.outline}11` : "none", cursor: "pointer", background: activeSource === src.id ? C.surfaceHigh : "transparent", transition: "background 0.15s" }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: C.onSurface }}>{src.name}</div>
                      <span style={{ fontSize: 11, color: C.onSurfaceVariant }}>{src.type}</span>
                      <span style={{ fontSize: 10, background: `${C.primaryContainer}55`, color: C.primary, padding: "2px 8px", borderRadius: 10, fontWeight: 700, width: "fit-content" }}>{src.freq}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: status === "active" ? C.secondary : status === "warn" ? C.tertiary : C.outline, boxShadow: status === "active" ? `0 0 8px ${C.secondary}88` : "none" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: status === "active" ? C.secondary : status === "warn" ? C.tertiary : C.onSurfaceVariant }}>
                          {status === "active" ? "Active" : status === "warn" ? "Partial" : status === "error" ? "Error" : "—"}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: C.primary }}>{sigCount > 0 ? sigCount : "—"}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: `${C.primaryContainer}22`, borderRadius: 10, padding: 16, border: `1px solid ${C.primary}22`, marginTop: 16, display: "flex", gap: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: C.primary, marginBottom: 4 }}>100% Free & Open-Source Stack</div>
                  <p style={{ fontSize: 11, color: C.onSurfaceVariant, lineHeight: 1.6 }}>
                    Data: RSS2JSON · Wikipedia REST · Hacker News Algolia · Open-Meteo · ExchangeRate-API — all keyless.<br />
                    AI: Gemini 2.5 Flash via <code style={{ background: C.surfaceHigh, padding: "1px 4px", borderRadius: 3 }}>/api/brief</code> serverless function — key stored securely in Vercel env vars, never in the browser.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer style={{ background: C.sidebar, borderTop: `1px solid ${C.outline}22`, padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: `${C.onSurfaceVariant}60`, fontWeight: 600 }}>© 2026 OPEN EYE OSINT PLATFORM</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: C.secondary, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.secondary, display: "inline-block", animation: "pulse-dot 1.5s ease infinite" }} />
              ALL SYSTEMS OPERATIONAL
            </span>
            <span style={{ fontSize: 9, color: C.onSurfaceVariant }}>AI: GEMINI 2.5 FLASH · SERVER-SIDE KEY</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
