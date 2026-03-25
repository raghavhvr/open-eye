import { useState, useEffect, useRef, useCallback } from "react";

// ── RSS SOURCES ───────────────────────────────────────────────────────────────
const RSS_SOURCES = [
  { id: "bbc-me",    label: "BBC Middle East",   url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", tag: "NEWS"     },
  { id: "aljazeera", label: "Al Jazeera",         url: "https://www.aljazeera.com/xml/rss/all.xml",               tag: "REGIONAL" },
  { id: "guardian",  label: "The Guardian World", url: "https://www.theguardian.com/world/rss",                   tag: "NEWS"     },
  { id: "arabnews",  label: "Arab News",          url: "https://www.arabnews.com/rss.xml",                        tag: "REGIONAL" },
  { id: "ap-world",  label: "AP World News",      url: "https://rsshub.app/apnews/world-news",                    tag: "NEWS"     },
];
const WIKI_TOPICS = ["Saudi Arabia","United Arab Emirates","Qatar","OPEC","Energy security","AI regulation"];

// ── COLORS ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0b1326", surface:"#171f33", surfaceHigh:"#222a3d", surfaceHighest:"#2d3449",
  primary:"#b4c5ff", primaryContainer:"#003188",
  secondary:"#4edea3", tertiary:"#ffb95f", error:"#ffb4ab",
  lottery:"#e879f9", lotteryDim:"#7e22ce",  // purple for lottery section
  onSurface:"#dae2fd", onSurfaceVariant:"#c3c7ce", outline:"#43474d", sidebar:"#131b2e",
};

// ── SENTIMENT ─────────────────────────────────────────────────────────────────
function guessSentiment(text) {
  const t = (text||"").toLowerCase();
  const pos = ["growth","surge","record","success","deal","agreement","expands","boost","profit","milestone","launch","win","winner","jackpot","lucky"];
  const neg = ["crisis","attack","conflict","warning","risk","decline","concern","tension","threat","disruption","sanction","collapse","problem","addiction","loss","scam","fraud"];
  const p = pos.filter(w=>t.includes(w)).length;
  const n = neg.filter(w=>t.includes(w)).length;
  if (n>p+1) return {label:"CRITICAL",color:C.error,          bg:"#93000a22"};
  if (n>p)   return {label:"WARNING", color:C.tertiary,        bg:"#51310022"};
  if (p>n)   return {label:"POSITIVE",color:C.secondary,       bg:"#00a57222"};
  return          {label:"NEUTRAL", color:C.onSurfaceVariant, bg:"#43474d22"};
}

function guessLotterySentiment(text) {
  const t = (text||"").toLowerCase();
  const hopeful  = ["win","winner","jackpot","lucky","dream","hope","million","big","tonight","ticket","chance"];
  const cynical  = ["scam","fraud","addiction","problem","waste","rigged","never","impossible","sucker","tax","odds"];
  const anxious  = ["debt","desperate","lost","spent","need","last","only","please","help","poor"];
  const h = hopeful.filter(w=>t.includes(w)).length;
  const c = cynical.filter(w=>t.includes(w)).length;
  const a = anxious.filter(w=>t.includes(w)).length;
  if (a>1)      return {label:"ANXIOUS",  color:"#f87171", bg:"#7f1d1d22"};
  if (c>h)      return {label:"CYNICAL",  color:C.tertiary, bg:"#51310022"};
  if (h>c+1)    return {label:"HOPEFUL",  color:C.lottery,  bg:"#7e22ce22"};
  return              {label:"NEUTRAL",  color:C.onSurfaceVariant, bg:"#43474d22"};
}

// ── DATA FETCHERS ─────────────────────────────────────────────────────────────
async function fetchRSS(source) {
  try {
    const res = await fetch("/api/rss",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:source.url})});
    const d = await res.json();
    if (!d.items||!Array.isArray(d.items)) return [];
    return d.items.slice(0,5).map(item=>({
      id:item.guid||item.link, title:item.title,
      summary:(item.summary||"").slice(0,180), url:item.link,
      timestamp:new Date(item.pubDate||Date.now()),
      source:source.label, tag:source.tag,
      sentiment:guessSentiment(item.title+" "+(item.summary||"")),
    }));
  } catch {return [];}
}
async function fetchWikipedia(topic) {
  try {
    const d = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`).then(r=>r.json());
    return {id:"wiki-"+topic,title:d.title,summary:(d.extract||"").slice(0,200),url:d.content_urls?.desktop?.page||"",timestamp:new Date(),source:"Wikipedia",tag:"INTEL",sentiment:guessSentiment(d.extract||"")};
  } catch {return null;}
}
async function fetchHackerNews(keyword) {
  try {
    const since = Math.floor(Date.now()/1000)-7*24*3600;
    const d = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=5&numericFilters=created_at_i>${since}`).then(r=>r.json());
    return (d.hits||[]).map(h=>({id:"hn-"+h.objectID,title:h.title,summary:`${h.points||0} pts · ${h.num_comments||0} comments`,url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,timestamp:new Date(h.created_at),source:"Hacker News",tag:"TECH",sentiment:guessSentiment(h.title)}));
  } catch {return [];}
}
async function fetchOpenMeteo() {
  try {
    const d = await fetch("https://api.open-meteo.com/v1/forecast?latitude=24.7136&longitude=46.6753&current=temperature_2m,wind_speed_10m&forecast_days=1").then(r=>r.json());
    return {temp:d.current?.temperature_2m,wind:d.current?.wind_speed_10m};
  } catch {return null;}
}
async function fetchExchangeRate() {
  try {
    const d = await fetch("https://api.exchangerate-api.com/v4/latest/USD").then(r=>r.json());
    return {sar:d.rates?.SAR,aed:d.rates?.AED,qar:d.rates?.QAR};
  } catch {return null;}
}
async function fetchLotterySignals() {
  try {
    const res = await fetch("/api/lottery",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    return await res.json();
  } catch {return {items:[],meta:{totalSignals:0,uncertaintyScore:50,avgUpvoteRatio:50,sourceDiversity:0}};}
}
async function fetchBrief(items, mode="intelligence") {
  const headlines = items.slice(0,15).map(i=>i.title||i);
  try {
    const res = await fetch("/api/brief",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({headlines,mode})});
    const data = await res.json();
    if (!res.ok) return {_error:data.error||"Unknown error"};
    return data;
  } catch(e) {return {_error:e.message};}
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function calcPulseScore(items) {
  if (!items.length) return 50;
  const c=items.filter(i=>i.sentiment?.label==="CRITICAL").length;
  const w=items.filter(i=>i.sentiment?.label==="WARNING").length;
  const p=items.filter(i=>i.sentiment?.label==="POSITIVE").length;
  return Math.min(99,Math.max(10,Math.round(50+p*3-c*8-w*4)));
}
function fmtAge(ts) {
  const m = Math.floor((Date.now()-new Date(ts))/60000);
  if (m<60)    return `${m}m ago`;
  if (m<1440)  return `${Math.floor(m/60)}h ago`;
  return `${Math.floor(m/1440)}d ago`;
}

// ── SVG COMPONENTS ────────────────────────────────────────────────────────────
function Sparkline({data,color,h=28}) {
  if (!data||data.length<2) return null;
  const W=80,H=h,mn=Math.min(...data),mx=Math.max(...data),r=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*W},${H-((v-mn)/r)*H}`).join(" ");
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function PulseRing({score,loading,color}) {
  const col = color||(score>70?C.secondary:score>45?C.primary:C.error);
  const r=54,cx=65,cy=65,circ=2*Math.PI*r;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx={cx} cy={cy} r={r+8} fill="none" stroke={`${col}15`} strokeWidth="1"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.surface} strokeWidth="10"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="10"
        strokeDasharray={`${(score/100)*circ} ${circ*(1-score/100)}`} strokeDashoffset={circ/4}
        strokeLinecap="round" style={{transition:"stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)",filter:`drop-shadow(0 0 6px ${col}88)`}}/>
      {loading
        ? <text x={cx} y={cy+6} textAnchor="middle" fill={C.onSurfaceVariant} fontSize="12" fontFamily="Manrope">…</text>
        : <><text x={cx} y={cy-4} textAnchor="middle" fill={col} fontSize="28" fontWeight="900" fontFamily="Manrope">{score}</text>
           <text x={cx} y={cy+14} textAnchor="middle" fill={C.onSurfaceVariant} fontSize="8" fontWeight="700" fontFamily="Manrope" letterSpacing="0.15em">PULSE</text></>
      }
    </svg>
  );
}

function UncertaintyGauge({score}) {
  // score 0–99: low=good signal, high=noisy/uncertain
  const col = score<30?C.secondary:score<60?C.tertiary:C.error;
  const label = score<30?"CLEAR":score<60?"MIXED":"NOISY";
  const r=32,cx=40,cy=40,circ=2*Math.PI*r;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${col}22`} strokeWidth="7"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="7"
          strokeDasharray={`${(score/100)*circ} ${circ}`} strokeDashoffset={circ/4}
          strokeLinecap="round" style={{transition:"stroke-dasharray 1s ease"}}/>
        <text x={cx} y={cx-3} textAnchor="middle" fill={col} fontSize="13" fontWeight="900" fontFamily="Manrope">{score}</text>
        <text x={cx} y={cx+10} textAnchor="middle" fill={col} fontSize="7" fontWeight="800" fontFamily="Manrope" letterSpacing="0.1em">%</text>
      </svg>
      <span style={{fontSize:9,fontWeight:800,color:col,letterSpacing:"0.1em"}}>{label}</span>
    </div>
  );
}

function ThreatGauge({level}) {
  const pcts={LOW:0.25,MODERATE:0.5,ELEVATED:0.75,CRITICAL:1};
  const cols={LOW:C.secondary,MODERATE:C.tertiary,ELEVATED:"#ff8c42",CRITICAL:C.error};
  const pct=pcts[level]||0.5,col=cols[level]||C.tertiary;
  const r=38,cx=50,cy=50,circ=2*Math.PI*r;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <svg width="100" height="70" viewBox="0 0 100 80">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.surface} strokeWidth="8" strokeDasharray={`${circ*0.75} ${circ*0.25}`} strokeDashoffset={-(circ*0.125)} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="8"
          strokeDasharray={`${pct*circ*0.75} ${circ-pct*circ*0.75}`} strokeDashoffset={-(circ*0.125)}
          strokeLinecap="round" style={{transition:"stroke-dasharray 1s ease,stroke 0.5s ease"}}/>
        <text x={cx} y={cy+5} textAnchor="middle" fill={col} fontSize="11" fontWeight="800" fontFamily="Manrope">{level||"—"}</text>
      </svg>
    </div>
  );
}

function MoodOrb({mood}) {
  const moodMap = {
    EUPHORIC:  {color:"#e879f9",glow:"#e879f988",icon:"🎰"},
    HOPEFUL:   {color:"#a78bfa",glow:"#a78bfa88",icon:"🍀"},
    ANXIOUS:   {color:"#f87171",glow:"#f8717188",icon:"😰"},
    CYNICAL:   {color:"#ffb95f",glow:"#ffb95f88",icon:"🙄"},
    RESIGNED:  {color:"#c3c7ce",glow:"#c3c7ce44",icon:"😑"},
  };
  const m = moodMap[mood]||{color:C.onSurfaceVariant,glow:"#43474d44",icon:"❓"};
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <div style={{width:56,height:56,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%, ${m.color}cc, ${m.color}44)`,boxShadow:`0 0 24px ${m.glow}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`2px solid ${m.color}55`}}>
        {m.icon}
      </div>
      <span style={{fontSize:9,fontWeight:800,color:m.color,letterSpacing:"0.12em",textTransform:"uppercase"}}>{mood||"—"}</span>
    </div>
  );
}

// ── FEED ITEM ─────────────────────────────────────────────────────────────────
function FeedItem({item,index,lotteryMode}) {
  const [exp,setExp]=useState(false);
  const sent = lotteryMode ? guessLotterySentiment(item.title) : (item.sentiment||guessSentiment(item.title));
  return (
    <div onClick={()=>setExp(!exp)} className="feed-item"
      style={{background:exp?C.surfaceHigh:C.surface,border:`1px solid ${C.outline}22`,
        borderLeft:`3px solid ${sent.color}`,borderRadius:8,padding:"12px 16px",
        cursor:"pointer",transition:"all 0.2s",animationDelay:`${index*30}ms`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:5,marginBottom:5,flexWrap:"wrap"}}>
            <span style={{background:sent.bg,color:sent.color,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:4,letterSpacing:"0.1em"}}>{sent.label}</span>
            {item.tag&&<span style={{background:`${C.primaryContainer}44`,color:C.primary,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,letterSpacing:"0.1em"}}>{item.tag}</span>}
            {item.score>100&&<span style={{background:`${C.secondary}22`,color:C.secondary,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4}}>↑{item.score}</span>}
          </div>
          <p style={{fontSize:13,fontWeight:700,color:C.onSurface,lineHeight:1.4,margin:0}}>{item.title}</p>
          {exp&&item.summary&&<p style={{fontSize:11,color:C.onSurfaceVariant,marginTop:6,lineHeight:1.6}}>{item.summary}</p>}
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <span style={{fontSize:9,color:C.onSurfaceVariant,display:"block"}}>{fmtAge(item.timestamp)}</span>
          <span style={{fontSize:9,color:`${lotteryMode?C.lottery:C.primary}99`,display:"block",marginTop:2}}>{item.source}</span>
        </div>
      </div>
      {exp&&item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:lotteryMode?C.lottery:C.primary,marginTop:6,display:"inline-flex",alignItems:"center",gap:4,textDecoration:"none"}}>Open Source ↗</a>}
    </div>
  );
}

// ── SENTIMENT BAR ─────────────────────────────────────────────────────────────
function SentimentBar({label,color,pct}) {
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}>
        <span style={{color}}>{label}</span><span style={{color:C.onSurface,fontWeight:700}}>{pct}%</span>
      </div>
      <div style={{height:4,background:`${C.outline}33`,borderRadius:2,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:2,transition:"width 0.8s ease"}}/>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  // — feed state
  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [lastRefresh,   setLastRefresh]   = useState(null);
  const [pulseScore,    setPulseScore]    = useState(50);
  const [pulseHistory,  setPulseHistory]  = useState([50,52,48,55,60,58,62]);
  const [sourceStatuses,setSourceStatuses]= useState({});
  const [weather,       setWeather]       = useState(null);
  const [fx,            setFx]            = useState(null);
  const [filter,        setFilter]        = useState("ALL");
  // — brief state
  const [brief,         setBrief]         = useState(null);
  const [briefLoading,  setBriefLoading]  = useState(false);
  // — lottery state
  const [lotteryData,   setLotteryData]   = useState(null);
  const [lotteryLoading,setLotteryLoading]= useState(true);
  const [lotteryBrief,  setLotteryBrief]  = useState(null);
  const [lotteryBriefLoading,setLotteryBriefLoading] = useState(false);
  const [lotteryFilter, setLotteryFilter] = useState("ALL");
  // — nav
  const [activeTab,     setActiveTab]     = useState("feed");
  const timerRef = useRef(null);

  const loadMain = useCallback(async () => {
    setLoading(true);
    const statuses={}, allItems=[];
    for (const src of RSS_SOURCES) {
      const itms = await fetchRSS(src);
      statuses[src.id] = itms.length>0?"active":"error";
      allItems.push(...itms);
    }
    for (const topic of WIKI_TOPICS) {
      const item = await fetchWikipedia(topic);
      if (item){statuses["wiki-"+topic]="active";allItems.push(item);}
    }
    const hnItems = await fetchHackerNews("geopolitics energy mena");
    statuses["hackernews"] = hnItems.length>0?"active":"warn";
    allItems.push(...hnItems);
    allItems.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    const seen=new Set();
    const unique=allItems.filter(i=>{if(seen.has(i.id))return false;seen.add(i.id);return true;});
    setItems(unique); setSourceStatuses(statuses);
    const score=calcPulseScore(unique);
    setPulseScore(score);
    setPulseHistory(prev=>[...prev.slice(-6),score]);
    setLastRefresh(new Date()); setLoading(false);
    fetchOpenMeteo().then(setWeather);
    fetchExchangeRate().then(setFx);
    if (unique.length>5) {
      setBriefLoading(true);
      fetchBrief(unique,"intelligence").then(b=>{setBrief(b);setBriefLoading(false);});
    }
  },[]);

  const loadLottery = useCallback(async () => {
    setLotteryLoading(true);
    const data = await fetchLotterySignals();
    setLotteryData(data);
    setLotteryLoading(false);
    if (data.items?.length>3) {
      setLotteryBriefLoading(true);
      fetchBrief(data.items,"lottery").then(b=>{setLotteryBrief(b);setLotteryBriefLoading(false);});
    }
  },[]);

  useEffect(()=>{
    loadMain(); loadLottery();
    timerRef.current = setInterval(()=>{loadMain();loadLottery();}, 5*60*1000);
    return ()=>clearInterval(timerRef.current);
  },[loadMain,loadLottery]);

  const filtered = filter==="ALL" ? items : items.filter(i=>i.sentiment?.label===filter||i.tag===filter);
  const lotteryItems = lotteryData?.items||[];
  const lotteryFiltered = lotteryFilter==="ALL" ? lotteryItems
    : lotteryItems.filter(i=>guessLotterySentiment(i.title).label===lotteryFilter||i.tag===lotteryFilter);

  const counts = {
    ALL:items.length,
    CRITICAL:items.filter(i=>i.sentiment?.label==="CRITICAL").length,
    WARNING:items.filter(i=>i.sentiment?.label==="WARNING").length,
    POSITIVE:items.filter(i=>i.sentiment?.label==="POSITIVE").length,
    NEUTRAL:items.filter(i=>i.sentiment?.label==="NEUTRAL").length,
  };
  const lotCounts = {
    ALL:lotteryItems.length,
    HOPEFUL:lotteryItems.filter(i=>guessLotterySentiment(i.title).label==="HOPEFUL").length,
    CYNICAL:lotteryItems.filter(i=>guessLotterySentiment(i.title).label==="CYNICAL").length,
    ANXIOUS:lotteryItems.filter(i=>guessLotterySentiment(i.title).label==="ANXIOUS").length,
    NEUTRAL:lotteryItems.filter(i=>guessLotterySentiment(i.title).label==="NEUTRAL").length,
  };

  const TABS = [
    {id:"feed",   icon:"⚡", label:"Live Feed"},
    {id:"lottery",icon:"🎰", label:"Lottery Pulse"},
    {id:"brief",  icon:"🧠", label:"AI Brief"},
    {id:"sources",icon:"🔌", label:"Sources"},
  ];

  const userSentimentColor = brief?.userSentiment
    ? ({OPTIMISTIC:C.secondary,CAUTIOUS:C.primary,ANXIOUS:C.tertiary,FEARFUL:C.error,INDIFFERENT:C.onSurfaceVariant}[brief.userSentiment]||C.primary)
    : C.primary;

  return (
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:"'Inter',sans-serif",color:C.onSurface,fontSize:13}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2d3449;border-radius:10px}
        .feed-item:hover{transform:translateX(2px)}.nav-btn{transition:all 0.15s}.nav-btn:hover{background:#171f3388!important}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
        @keyframes fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes ticker{0%{transform:translateX(100%)}100%{transform:translateX(-200%)}}
        @keyframes lottery-glow{0%,100%{box-shadow:0 0 12px #e879f944}50%{box-shadow:0 0 24px #e879f988}}
        .feed-item{animation:fade-in .3s ease forwards}.spin{animation:spin 1s linear infinite}
        .ticker-txt{animation:ticker 30s linear infinite;display:inline-block;white-space:nowrap}
        .lottery-panel{animation:lottery-glow 3s ease infinite}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{width:224,background:C.sidebar,display:"flex",flexDirection:"column",borderRight:`1px solid ${C.outline}22`,flexShrink:0,position:"sticky",top:0,height:"100vh"}}>
        <div style={{padding:"18px 16px",borderBottom:`1px solid ${C.outline}22`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,background:C.primaryContainer,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🛰️</div>
            <div>
              <div style={{fontFamily:"Manrope",fontWeight:900,fontSize:13,color:C.primary,letterSpacing:"0.05em"}}>OPEN EYE</div>
              <div style={{fontSize:8,color:`${C.primary}60`,letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700}}>OSINT Platform v2.0</div>
            </div>
          </div>
        </div>

        {/* Dual Pulse Rings */}
        <div style={{padding:"14px 12px",borderBottom:`1px solid ${C.outline}22`,display:"flex",justifyContent:"space-around",alignItems:"center"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <PulseRing score={pulseScore} loading={loading}/>
            <div style={{fontSize:8,color:C.onSurfaceVariant,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",textAlign:"center"}}>Regional<br/>Pulse</div>
            <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:C.secondary,display:"inline-block",animation:"pulse-dot 1.5s ease infinite"}}/>
              <span style={{fontSize:8,color:C.secondary,fontWeight:700}}>LIVE</span>
            </div>
          </div>
          <div style={{width:1,height:80,background:`${C.outline}33`}}/>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <PulseRing score={lotteryData?.meta?.uncertaintyScore??50} loading={lotteryLoading} color={C.lottery}/>
            <div style={{fontSize:8,color:C.onSurfaceVariant,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",textAlign:"center"}}>Lottery<br/>Uncertainty</div>
          </div>
        </div>

        {/* User Sentiment */}
        {brief?.userSentiment && (
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.outline}22`}}>
            <div style={{fontSize:8,color:C.onSurfaceVariant,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>User Sentiment</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:userSentimentColor,boxShadow:`0 0 8px ${userSentimentColor}88`}}/>
              <span style={{fontSize:12,fontWeight:800,color:userSentimentColor,fontFamily:"Manrope"}}>{brief.userSentiment}</span>
            </div>
            {brief.sentimentDrivers?.slice(0,2).map((d,i)=>(
              <div key={i} style={{fontSize:9,color:C.onSurfaceVariant,marginTop:3,paddingLeft:16}}>· {d}</div>
            ))}
          </div>
        )}

        <nav style={{padding:"8px 8px",flex:1}}>
          {TABS.map(t=>(
            <button key={t.id} className="nav-btn" onClick={()=>setActiveTab(t.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:6,border:"none",cursor:"pointer",textAlign:"left",marginBottom:2,
                background:activeTab===t.id?C.surface:"transparent",
                color:activeTab===t.id?(t.id==="lottery"?C.lottery:C.primary):`${C.onSurface}99`,
                borderLeft:activeTab===t.id?`3px solid ${t.id==="lottery"?C.lottery:C.primary}`:"3px solid transparent",
                fontWeight:activeTab===t.id?700:500,fontSize:12}}>
              <span style={{fontSize:14}}>{t.icon}</span>
              {t.label}
              {t.id==="lottery"&&lotteryItems.length>0&&<span style={{marginLeft:"auto",fontSize:9,background:`${C.lottery}22`,color:C.lottery,padding:"1px 5px",borderRadius:8,fontWeight:800}}>{lotteryItems.length}</span>}
            </button>
          ))}
        </nav>

        {/* FX */}
        <div style={{padding:"10px 14px",borderTop:`1px solid ${C.outline}22`,fontSize:10}}>
          <div style={{color:`${C.onSurfaceVariant}88`,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>FX (USD)</div>
          {fx?[["SAR",fx.sar],["AED",fx.aed],["QAR",fx.qar]].map(([k,v])=>v&&(
            <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{color:C.onSurfaceVariant}}>{k}</span>
              <span style={{color:C.onSurface,fontWeight:700}}>{v.toFixed(3)}</span>
            </div>
          )):<div style={{color:`${C.onSurfaceVariant}55`}}>Loading…</div>}
        </div>

        <div style={{padding:"10px 14px",borderTop:`1px solid ${C.outline}22`}}>
          <button onClick={()=>{loadMain();loadLottery();}} disabled={loading&&lotteryLoading}
            style={{width:"100%",background:`linear-gradient(135deg,${C.primaryContainer},${C.primary}33)`,border:`1px solid ${C.primary}33`,color:C.primary,borderRadius:6,padding:"8px",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <span style={{fontSize:12,display:"inline-block",...((loading||lotteryLoading)?{animation:"spin 1s linear infinite"}:{})}}>⟳</span>
            {(loading||lotteryLoading)?"Ingesting…":"Refresh All"}
          </button>
          {lastRefresh&&<div style={{fontSize:9,color:`${C.onSurfaceVariant}55`,textAlign:"center",marginTop:3}}>{lastRefresh.toLocaleTimeString()}</div>}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Topbar */}
        <header style={{background:C.sidebar,borderBottom:`1px solid ${C.outline}22`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{fontFamily:"Manrope",fontWeight:900,fontSize:16,color:C.primary,letterSpacing:"-0.02em"}}>STRATEGIC EYE</div>
          <div style={{flex:1,margin:"0 20px",overflow:"hidden",background:C.surface,borderRadius:4,padding:"4px 0",maxWidth:600}}>
            <span style={{fontSize:9,background:`${C.error}22`,color:C.error,padding:"2px 6px",borderRadius:3,fontWeight:800,marginLeft:8}}>● LIVE</span>
            <span className="ticker-txt" style={{fontSize:11,color:C.onSurfaceVariant,marginLeft:12}}>
              {items.slice(0,5).map(i=>i.title).join("  ·  ")}
            </span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:10,color:C.onSurfaceVariant}}>{items.length} signals</span>
            <span style={{fontSize:9,color:C.lottery,fontWeight:700,background:`${C.lottery}22`,padding:"2px 8px",borderRadius:10}}>🎰 {lotteryItems.length} lottery</span>
            <span style={{fontSize:9,color:C.secondary,fontWeight:700,background:`${C.secondary}22`,padding:"2px 8px",borderRadius:10}}>● ONLINE</span>
          </div>
        </header>

        <div style={{flex:1,overflow:"auto",padding:"20px"}}>

          {/* ══ LIVE FEED ══ */}
          {activeTab==="feed"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <h1 style={{fontFamily:"Manrope",fontSize:24,fontWeight:900,letterSpacing:"-0.03em"}}>Open Intelligence Feed <span style={{color:C.primary}}>.</span></h1>
                  <p style={{color:C.onSurfaceVariant,fontSize:12,marginTop:4}}>{items.length} signals from {Object.values(sourceStatuses).filter(s=>s==="active").length} active sources</p>
                </div>
                <div style={{background:C.surface,borderRadius:8,padding:"10px 14px",border:`1px solid ${C.outline}22`}}>
                  <div style={{fontSize:9,color:C.onSurfaceVariant,fontWeight:700,marginBottom:4,letterSpacing:"0.1em",textTransform:"uppercase"}}>Pulse Trend</div>
                  <Sparkline data={pulseHistory} color={C.primary} h={28}/>
                </div>
              </div>

              <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
                {[["ALL",C.primary],["CRITICAL",C.error],["WARNING",C.tertiary],["POSITIVE",C.secondary],["NEUTRAL",C.onSurfaceVariant]].map(([f,col])=>(
                  <button key={f} onClick={()=>setFilter(f)}
                    style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${filter===f?col:C.outline+"33"}`,background:filter===f?`${col}22`:"transparent",color:filter===f?col:C.onSurfaceVariant,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:"0.08em",transition:"all 0.15s"}}>
                    {f} {counts[f]?`(${counts[f]})`:""}</button>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:16}}>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {loading&&items.length===0
                    ?[...Array(5)].map((_,i)=><div key={i} style={{background:C.surface,borderRadius:8,padding:16,height:72,opacity:0.4,animation:"pulse-dot 1.5s ease infinite",animationDelay:`${i*100}ms`}}/>)
                    :filtered.length===0
                      ?<div style={{color:C.onSurfaceVariant,textAlign:"center",padding:40}}>No signals matching this filter.</div>
                      :filtered.map((item,idx)=><FeedItem key={item.id} item={item} index={idx}/>)
                  }
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{background:C.surface,borderRadius:10,padding:16,border:`1px solid ${C.outline}22`}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.onSurfaceVariant,marginBottom:12}}>Signal Sentiment</div>
                    {[["POSITIVE",C.secondary,counts.POSITIVE],["NEUTRAL",C.onSurfaceVariant,counts.NEUTRAL],["WARNING",C.tertiary,counts.WARNING],["CRITICAL",C.error,counts.CRITICAL]].map(([lbl,col,cnt])=>(
                      <SentimentBar key={lbl} label={lbl} color={col} pct={items.length?Math.round((cnt/items.length)*100):0}/>
                    ))}
                  </div>
                  {weather&&(
                    <div style={{background:C.surface,borderRadius:10,padding:16,border:`1px solid ${C.outline}22`}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.onSurfaceVariant,marginBottom:6}}>Riyadh Conditions</div>
                      <div style={{fontSize:24,fontWeight:900,color:C.primary,fontFamily:"Manrope"}}>{weather.temp}°C</div>
                      <div style={{fontSize:11,color:C.onSurfaceVariant,marginTop:2}}>Wind: {weather.wind} km/h</div>
                    </div>
                  )}
                  <div style={{background:C.surface,borderRadius:10,padding:16,border:`1px solid ${C.outline}22`}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.onSurfaceVariant,marginBottom:10}}>Top Sources</div>
                    {[...new Set(items.map(i=>i.source))].slice(0,6).map(src=>{
                      const cnt=items.filter(i=>i.source===src).length;
                      return <div key={src} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                        <span style={{fontSize:11,color:C.onSurface,fontWeight:600}}>{src}</span>
                        <span style={{fontSize:10,color:C.primary,fontWeight:800,background:`${C.primaryContainer}55`,padding:"1px 7px",borderRadius:10}}>{cnt}</span>
                      </div>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ LOTTERY PULSE ══ */}
          {activeTab==="lottery"&&(
            <div>
              {/* Hero header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                    <span style={{fontSize:28}}>🎰</span>
                    <h1 style={{fontFamily:"Manrope",fontSize:24,fontWeight:900,letterSpacing:"-0.03em"}}>
                      Lottery Pulse <span style={{color:C.lottery}}>.</span>
                    </h1>
                  </div>
                  <p style={{color:C.onSurfaceVariant,fontSize:12}}>
                    Real-time public sentiment around lottery, gambling & winning — Reddit, HN, Wikipedia
                  </p>
                </div>
              </div>

              {/* Stat strip */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
                {[
                  ["Signals",        lotteryData?.meta?.totalSignals??0,      C.lottery],
                  ["Sources",        lotteryData?.meta?.sourceDiversity??0,    C.primary],
                  ["Avg Upvote",     `${lotteryData?.meta?.avgUpvoteRatio??0}%`,C.secondary],
                  ["Uncertainty",    `${lotteryData?.meta?.uncertaintyScore??0}%`,lotteryData?.meta?.uncertaintyScore>60?C.error:lotteryData?.meta?.uncertaintyScore>30?C.tertiary:C.secondary],
                ].map(([lbl,val,col])=>(
                  <div key={lbl} style={{background:C.surface,borderRadius:10,padding:14,border:`1px solid ${C.outline}22`}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.onSurfaceVariant,marginBottom:5}}>{lbl}</div>
                    <div style={{fontSize:20,fontWeight:900,color:col,fontFamily:"Manrope"}}>{val}</div>
                  </div>
                ))}
              </div>

              {/* AI Mood + Uncertainty + Sentiment split */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>

                {/* Mood orb card */}
                <div className="lottery-panel" style={{background:C.surface,borderRadius:12,padding:20,border:`1px solid ${C.lottery}33`,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:C.lottery,alignSelf:"flex-start"}}>Public Mood</div>
                  {lotteryBriefLoading
                    ?<div className="spin" style={{fontSize:28,marginTop:10}}>⟳</div>
                    :<MoodOrb mood={lotteryBrief?.overallMood}/>
                  }
                  {lotteryBrief?.dominantNarrative&&(
                    <div style={{fontSize:11,color:C.onSurface,fontWeight:700,textAlign:"center",fontFamily:"Manrope"}}>"{lotteryBrief.dominantNarrative}"</div>
                  )}
                </div>

                {/* Uncertainty gauge */}
                <div style={{background:C.surface,borderRadius:12,padding:20,border:`1px solid ${C.outline}22`,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:C.onSurfaceVariant,alignSelf:"flex-start"}}>Signal Uncertainty</div>
                  <UncertaintyGauge score={lotteryData?.meta?.uncertaintyScore??50}/>
                  <div style={{fontSize:10,color:C.onSurfaceVariant,textAlign:"center",lineHeight:1.5}}>
                    {(lotteryData?.meta?.uncertaintyScore??50)<30
                      ?"Strong clear signal — sentiment is consistent across sources"
                      :(lotteryData?.meta?.uncertaintyScore??50)<60
                        ?"Mixed signals — some variance between communities"
                        :"High noise — contradictory signals, interpret cautiously"}
                  </div>
                </div>

                {/* Sentiment split */}
                <div style={{background:C.surface,borderRadius:12,padding:20,border:`1px solid ${C.outline}22`}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:C.onSurfaceVariant,marginBottom:14}}>Sentiment Split</div>
                  {lotteryBrief?.sentimentSplit
                    ?[["Positive",C.secondary,lotteryBrief.sentimentSplit.positive],["Neutral",C.onSurfaceVariant,lotteryBrief.sentimentSplit.neutral],["Negative",C.error,lotteryBrief.sentimentSplit.negative]].map(([l,c,v])=>(
                        <SentimentBar key={l} label={l} color={c} pct={v||0}/>
                      ))
                    :[["HOPEFUL",C.lottery,lotCounts.HOPEFUL],["NEUTRAL",C.onSurfaceVariant,lotCounts.NEUTRAL],["CYNICAL",C.tertiary,lotCounts.CYNICAL],["ANXIOUS","#f87171",lotCounts.ANXIOUS]].map(([l,c,v])=>(
                        <SentimentBar key={l} label={l} color={c} pct={lotteryItems.length?Math.round((v/lotteryItems.length)*100):0}/>
                      ))
                  }
                </div>
              </div>

              {/* AI Psych insight */}
              {lotteryBrief&&!lotteryBrief._error&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                  <div style={{background:`${C.lottery}0d`,borderRadius:12,padding:18,border:`1px solid ${C.lottery}33`}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:C.lottery,marginBottom:10}}>🧠 Psych Insight</div>
                    <p style={{fontSize:13,color:C.onSurface,lineHeight:1.7}}>{lotteryBrief.psychInsight}</p>
                    {lotteryBrief.keyEmotions?.length>0&&(
                      <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}>
                        {lotteryBrief.keyEmotions.map(e=>(
                          <span key={e} style={{fontSize:10,background:`${C.lottery}22`,color:C.lottery,padding:"2px 8px",borderRadius:10,fontWeight:700}}>{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{background:`${C.secondary}0d`,borderRadius:10,padding:14,border:`1px solid ${C.secondary}22`,flex:1}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.secondary,marginBottom:8}}>✓ Opportunity Signals</div>
                      {lotteryBrief.opportunitySignals?.map((s,i)=>(
                        <div key={i} style={{display:"flex",gap:8,marginBottom:5}}><span style={{color:C.secondary}}>→</span><span style={{fontSize:12,color:C.onSurface}}>{s}</span></div>
                      ))}
                    </div>
                    <div style={{background:`${C.error}0d`,borderRadius:10,padding:14,border:`1px solid ${C.error}22`,flex:1}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.error,marginBottom:8}}>⚠ Risk Signals</div>
                      {lotteryBrief.riskSignals?.map((s,i)=>(
                        <div key={i} style={{display:"flex",gap:8,marginBottom:5}}><span style={{color:C.error}}>→</span><span style={{fontSize:12,color:C.onSurface}}>{s}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Filter pills */}
              <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                {[["ALL",C.primary],["HOPEFUL",C.lottery],["CYNICAL",C.tertiary],["ANXIOUS","#f87171"],["NEUTRAL",C.onSurfaceVariant]].map(([f,col])=>(
                  <button key={f} onClick={()=>setLotteryFilter(f)}
                    style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${lotteryFilter===f?col:C.outline+"33"}`,background:lotteryFilter===f?`${col}22`:"transparent",color:lotteryFilter===f?col:C.onSurfaceVariant,fontSize:10,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>
                    {f} {lotCounts[f]?`(${lotCounts[f]})`:""}</button>
                ))}
              </div>

              {/* Lottery feed */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {lotteryLoading&&lotteryItems.length===0
                  ?[...Array(5)].map((_,i)=><div key={i} style={{background:C.surface,borderRadius:8,padding:16,height:68,opacity:0.4,animation:"pulse-dot 1.5s ease infinite",animationDelay:`${i*100}ms`}}/>)
                  :lotteryFiltered.length===0
                    ?<div style={{color:C.onSurfaceVariant,textAlign:"center",padding:40}}>No lottery signals yet. Try refreshing.</div>
                    :lotteryFiltered.map((item,idx)=><FeedItem key={item.id} item={item} index={idx} lotteryMode/>)
                }
              </div>
            </div>
          )}

          {/* ══ AI BRIEF ══ */}
          {activeTab==="brief"&&(
            <div style={{maxWidth:720}}>
              <div style={{marginBottom:24}}>
                <h1 style={{fontFamily:"Manrope",fontSize:24,fontWeight:900,letterSpacing:"-0.03em"}}>AI Intelligence Brief <span style={{color:C.primary}}>.</span></h1>
                <p style={{color:C.onSurfaceVariant,fontSize:12,marginTop:4}}>Gemini 2.5 Flash synthesis of {items.length} open-source signals</p>
              </div>
              {briefLoading?(
                <div style={{background:C.surface,borderRadius:12,padding:32,border:`1px solid ${C.outline}22`,textAlign:"center"}}>
                  <div className="spin" style={{fontSize:32,marginBottom:12,display:"inline-block"}}>⟳</div>
                  <div style={{color:C.onSurfaceVariant,fontSize:13}}>Analysing {items.length} signals…</div>
                </div>
              ):brief?._error?(
                <div style={{background:`${C.error}11`,borderRadius:12,padding:24,border:`1px solid ${C.error}33`}}>
                  <div style={{fontWeight:700,color:C.error,marginBottom:8}}>⚠ Gemini API Error</div>
                  <p style={{fontSize:12,color:C.onSurfaceVariant}}>{brief._error}</p>
                  <p style={{fontSize:11,color:C.onSurfaceVariant,marginTop:8}}>Check that <code style={{background:C.surfaceHigh,padding:"1px 4px",borderRadius:3}}>GEMINI_API_KEY</code> is set in Vercel → Settings → Environment Variables.</p>
                </div>
              ):brief?(
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  <div style={{background:C.surface,borderRadius:12,padding:24,border:`1px solid ${C.outline}22`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:C.onSurfaceVariant,marginBottom:6}}>Top Theme</div>
                        <div style={{fontFamily:"Manrope",fontSize:20,fontWeight:900,color:C.primary,marginBottom:12}}>{brief.topTheme}</div>
                        <p style={{fontSize:14,color:C.onSurface,lineHeight:1.7}}>{brief.summary}</p>
                        {brief.userSentiment&&(
                          <div style={{marginTop:14,display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:`${userSentimentColor}11`,borderRadius:8,border:`1px solid ${userSentimentColor}22`}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:userSentimentColor,boxShadow:`0 0 8px ${userSentimentColor}88`}}/>
                            <span style={{fontSize:12,fontWeight:700,color:userSentimentColor}}>User Sentiment: {brief.userSentiment}</span>
                            <span style={{fontSize:11,color:C.onSurfaceVariant}}>— {brief.sentimentDrivers?.[0]||""}</span>
                          </div>
                        )}
                      </div>
                      <div style={{flexShrink:0,textAlign:"center"}}>
                        <ThreatGauge level={brief.threatLevel}/>
                        <div style={{fontSize:9,color:C.onSurfaceVariant,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Threat Level</div>
                      </div>
                    </div>
                  </div>
                  <div style={{background:C.surface,borderRadius:12,padding:24,border:`1px solid ${C.outline}22`}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:C.onSurfaceVariant,marginBottom:14}}>Key Trends</div>
                    {(brief.keyTrends||[]).map((t,i)=>(
                      <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:10}}>
                        <span style={{width:22,height:22,background:C.primaryContainer,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:C.primary,flexShrink:0}}>{i+1}</span>
                        <span style={{fontSize:13,color:C.onSurface,lineHeight:1.5}}>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:`${C.tertiary}11`,borderRadius:12,padding:20,border:`1px solid ${C.tertiary}33`}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:C.tertiary,marginBottom:12}}>⚠ Watch Items</div>
                    {(brief.watchItems||[]).map((item,i)=>(
                      <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                        <span style={{color:C.tertiary,fontSize:12,flexShrink:0}}>→</span>
                        <span style={{fontSize:13,color:C.onSurface,lineHeight:1.5}}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>{setBriefLoading(true);fetchBrief(items,"intelligence").then(b=>{setBrief(b);setBriefLoading(false);});}}
                    style={{background:`linear-gradient(135deg,${C.primaryContainer},${C.primary}44)`,border:`1px solid ${C.primary}44`,color:C.primary,borderRadius:8,padding:"10px 20px",fontSize:12,fontWeight:700,cursor:"pointer",alignSelf:"flex-start"}}>
                    ⟳ Regenerate Brief
                  </button>
                </div>
              ):(
                <div style={{background:C.surface,borderRadius:12,padding:32,border:`1px solid ${C.outline}22`,textAlign:"center"}}>
                  <div style={{fontSize:13,color:C.onSurfaceVariant}}>Refresh the feed to generate an AI brief.</div>
                </div>
              )}
            </div>
          )}

          {/* ══ SOURCES ══ */}
          {activeTab==="sources"&&(
            <div>
              <div style={{marginBottom:24}}>
                <h1 style={{fontFamily:"Manrope",fontSize:24,fontWeight:900,letterSpacing:"-0.03em"}}>Source Management <span style={{color:C.primary}}>.</span></h1>
                <p style={{color:C.onSurfaceVariant,fontSize:12,marginTop:4}}>All open-source ingestion channels — news, social, intelligence & lottery signals</p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
                {[
                  ["News Sources",   Object.values(sourceStatuses).filter(s=>s==="active").length, C.secondary],
                  ["Total Signals",  items.length,                                                  C.primary],
                  ["Lottery Signals",lotteryItems.length,                                            C.lottery],
                  ["System Health",  "OPTIMAL",                                                      C.secondary],
                ].map(([l,v,c])=>(
                  <div key={l} style={{background:C.surface,borderRadius:10,padding:14,border:`1px solid ${C.outline}22`}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.onSurfaceVariant,marginBottom:5}}>{l}</div>
                    <div style={{fontSize:20,fontWeight:900,color:c,fontFamily:"Manrope"}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.surface,borderRadius:10,overflow:"hidden",border:`1px solid ${C.outline}22`}}>
                <div style={{background:C.surfaceHigh,padding:"10px 16px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 80px",gap:12,fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.onSurfaceVariant}}>
                  <span>Source</span><span>Type</span><span>Frequency</span><span>Status</span><span>Signals</span>
                </div>
                {[
                  ...RSS_SOURCES.map(s=>({id:s.id,name:s.label,type:"RSS Feed",freq:"Live",statusKey:s.id,section:"NEWS"})),
                  {id:"wiki",         name:"Wikipedia Open API",    type:"REST API",   freq:"On Demand",statusKey:"wiki-Saudi Arabia",section:"INTEL"},
                  {id:"hackernews",   name:"Hacker News Algolia",   type:"REST API",   freq:"Live",     statusKey:"hackernews",       section:"TECH"},
                  {id:"reddit-lot",   name:"Reddit r/lottery",      type:"Public JSON",freq:"Live",     statusKey:"reddit",           section:"LOTTERY"},
                  {id:"reddit-pow",   name:"Reddit r/Powerball",    type:"Public JSON",freq:"Live",     statusKey:"reddit",           section:"LOTTERY"},
                  {id:"reddit-gamb",  name:"Reddit r/gambling",     type:"Public JSON",freq:"Live",     statusKey:"reddit",           section:"LOTTERY"},
                  {id:"exchangerate", name:"Exchange Rate API",      type:"REST API",   freq:"Hourly",   statusKey:"fx",               section:"FX"},
                  {id:"openmeteo",    name:"Open-Meteo Weather",     type:"REST API",   freq:"Hourly",   statusKey:"weather",          section:"GEO"},
                  {id:"gemini",       name:"Gemini 2.5 Flash (AI)", type:"Serverless", freq:"On Demand",statusKey:"gemini",            section:"AI"},
                ].map((src,i)=>{
                  const isLottery = src.section==="LOTTERY";
                  const status = src.id==="gemini"?(brief&&!brief._error?"active":"unknown"):isLottery?(lotteryItems.length>0?"active":"unknown"):(sourceStatuses[src.statusKey]||"unknown");
                  const sigCount = isLottery ? lotteryItems.filter(it=>it.source?.includes(src.id.replace("reddit-","r/"))).length : items.filter(it=>it.source===src.name).length;
                  return (
                    <div key={src.id} style={{padding:"11px 16px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 80px",gap:12,alignItems:"center",borderTop:i>0?`1px solid ${C.outline}11`:"none",transition:"background 0.15s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {isLottery&&<span style={{fontSize:10}}>🎰</span>}
                        <span style={{fontWeight:700,fontSize:12,color:isLottery?C.lottery:C.onSurface}}>{src.name}</span>
                      </div>
                      <span style={{fontSize:11,color:C.onSurfaceVariant}}>{src.type}</span>
                      <span style={{fontSize:10,background:`${C.primaryContainer}55`,color:C.primary,padding:"2px 8px",borderRadius:10,fontWeight:700,width:"fit-content"}}>{src.freq}</span>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{width:7,height:7,borderRadius:"50%",background:status==="active"?C.secondary:status==="warn"?C.tertiary:C.outline,boxShadow:status==="active"?`0 0 8px ${C.secondary}88`:"none"}}/>
                        <span style={{fontSize:11,fontWeight:700,color:status==="active"?C.secondary:status==="warn"?C.tertiary:C.onSurfaceVariant}}>{status==="active"?"Active":status==="warn"?"Partial":status==="error"?"Error":"—"}</span>
                      </div>
                      <span style={{fontSize:12,fontWeight:800,color:isLottery?C.lottery:C.primary}}>{sigCount>0?sigCount:"—"}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{background:`${C.primaryContainer}22`,borderRadius:10,padding:16,border:`1px solid ${C.primary}22`,marginTop:16,display:"flex",gap:12}}>
                <span style={{fontSize:18,flexShrink:0}}>ℹ️</span>
                <div>
                  <div style={{fontWeight:700,fontSize:12,color:C.primary,marginBottom:4}}>100% Free & Open-Source Stack</div>
                  <p style={{fontSize:11,color:C.onSurfaceVariant,lineHeight:1.6}}>
                    News: RSS via serverless proxy · Intel: Wikipedia REST · Tech: HN Algolia · Lottery: Reddit public JSON (no auth) + HN + Wikipedia · FX: ExchangeRate-API · Weather: Open-Meteo · AI: Gemini 2.5 Flash via server-side key.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer style={{background:C.sidebar,borderTop:`1px solid ${C.outline}22`,padding:"7px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontSize:9,color:`${C.onSurfaceVariant}60`,fontWeight:600}}>© 2026 OPEN EYE OSINT PLATFORM v2.0</div>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <span style={{fontSize:9,color:C.secondary,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:C.secondary,display:"inline-block",animation:"pulse-dot 1.5s ease infinite"}}/>
              ALL SYSTEMS OPERATIONAL
            </span>
            <span style={{fontSize:9,color:C.lottery}}>🎰 LOTTERY PULSE ACTIVE</span>
            <span style={{fontSize:9,color:C.onSurfaceVariant}}>AI: GEMINI 2.5 FLASH</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
