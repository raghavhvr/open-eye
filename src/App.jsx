import { useState, useEffect, useRef, useCallback } from "react";

// ─── DESIGN TOKENS — "Strategic Eye" (faithful to DESIGN.md + wireframes) ────
const T = {
  base:"#060e20",surface:"#0b1326",low:"#131b2e",mid:"#171f33",
  high:"#222a3d",highest:"#2d3449",
  primary:"#b4c5ff",priCont:"#003188",
  secondary:"#4edea3",secCont:"#00a572",
  tertiary:"#ffb95f",terCont:"#513100",
  error:"#ffb4ab",errCont:"#93000a",
  onSurf:"#dae2fd",onVar:"#c3c7ce",outline:"#8d9198",outVar:"#43474d",
};

// ─── FULL MENA COUNTRY REGISTRY (21 countries, wireframes only had 5) ────────
const MENA_COUNTRIES = [
  {id:"UAE",         label:"UAE",  flag:"🇦🇪",group:"GCC",    keywords:["uae","dubai","abu dhabi","emirati","sharjah","ajman"]},
  {id:"Saudi Arabia",label:"KSA",  flag:"🇸🇦",group:"GCC",    keywords:["saudi","riyadh","jeddah","aramco","ksa","mecca","neom"]},
  {id:"Qatar",       label:"QAT",  flag:"🇶🇦",group:"GCC",    keywords:["qatar","doha","qatari"]},
  {id:"Kuwait",      label:"KUW",  flag:"🇰🇼",group:"GCC",    keywords:["kuwait","kuwaiti"]},
  {id:"Oman",        label:"OMN",  flag:"🇴🇲",group:"GCC",    keywords:["oman","muscat","omani"]},
  {id:"Bahrain",     label:"BHR",  flag:"🇧🇭",group:"GCC",    keywords:["bahrain","manama"]},
  {id:"Jordan",      label:"JOR",  flag:"🇯🇴",group:"Levant", keywords:["jordan","amman","jordanian"]},
  {id:"Lebanon",     label:"LBN",  flag:"🇱🇧",group:"Levant", keywords:["lebanon","beirut","lebanese"]},
  {id:"Syria",       label:"SYR",  flag:"🇸🇾",group:"Levant", keywords:["syria","damascus","aleppo","syrian"]},
  {id:"Iraq",        label:"IRQ",  flag:"🇮🇶",group:"Levant", keywords:["iraq","baghdad","iraqi","basra","mosul"]},
  {id:"Palestine",   label:"PSE",  flag:"🇵🇸",group:"Levant", keywords:["palestine","gaza","west bank","hamas","palestinian"]},
  {id:"Israel",      label:"ISR",  flag:"🇮🇱",group:"Levant", keywords:["israel","tel aviv","jerusalem","idf"]},
  {id:"Egypt",       label:"EGY",  flag:"🇪🇬",group:"N.Africa",keywords:["egypt","cairo","egyptian","suez","alexandria"]},
  {id:"Libya",       label:"LBY",  flag:"🇱🇾",group:"N.Africa",keywords:["libya","tripoli","benghazi","libyan"]},
  {id:"Tunisia",     label:"TUN",  flag:"🇹🇳",group:"N.Africa",keywords:["tunisia","tunis","tunisian"]},
  {id:"Algeria",     label:"DZA",  flag:"🇩🇿",group:"N.Africa",keywords:["algeria","algiers","algerian"]},
  {id:"Morocco",     label:"MAR",  flag:"🇲🇦",group:"N.Africa",keywords:["morocco","rabat","casablanca","moroccan"]},
  {id:"Sudan",       label:"SDN",  flag:"🇸🇩",group:"N.Africa",keywords:["sudan","khartoum","sudanese"]},
  {id:"Yemen",       label:"YEM",  flag:"🇾🇪",group:"Other",  keywords:["yemen","sanaa","houthi","yemeni","aden"]},
  {id:"Iran",        label:"IRN",  flag:"🇮🇷",group:"Other",  keywords:["iran","tehran","iranian","irgc"]},
  {id:"Regional",    label:"MENA", flag:"🌍", group:"Regional",keywords:["mena","middle east","arab","gulf","gcc"]},
];
const COUNTRY_MAP = Object.fromEntries(MENA_COUNTRIES.map(c=>[c.id,c]));

// ─── TOPIC SECTIONS ───────────────────────────────────────────────────────────
const SECTIONS = {
  "🚨 Crisis":   {color:"#ef4444",label:"Crisis & Safety",      keywords:["war","conflict","ceasefire","attack","bomb","fire","flood","storm","houthi","missile","casualties","killed","explosion","earthquake","pandemic","virus","outbreak","airstrike","siege","displaced"]},
  "💼 Economy":  {color:"#ffb95f",label:"Economy & Business",   keywords:["oil","opec","economy","gdp","inflation","market","investment","trade","startup","fund","aramco","adnoc","property","rent","salary","job","tourism","vision 2030","neom","stock","revenue","ipo"]},
  "🏛️ Politics": {color:"#b4c5ff",label:"Politics & Governance",keywords:["government","minister","policy","election","parliament","diplomacy","sanction","treaty","reform","law","decree","summit","president","prime minister","royal","cabinet","geopolitics","nuclear","coup"]},
  "🌐 Expat":    {color:"#4edea3",label:"Expat & Daily Life",   keywords:["visa","expat","cost of living","iqama","golden visa","traffic","metro","food","restaurant","transport","immigration","residency","permit","school","healthcare","grocery"]},
  "🕌 Culture":  {color:"#06b6d4",label:"Culture & Society",    keywords:["ramadan","eid","mosque","religion","entertainment","festival","education","university","women","sports","arts","culture","social","marriage","family","heritage"]},
  "💻 Tech":     {color:"#8b5cf6",label:"Tech & Innovation",    keywords:["ai","artificial intelligence","startup","tech","innovation","crypto","blockchain","smart city","5g","solar","renewable","fintech","digital","cybersecurity","g42","data center"]},
};

// ─── RSS SOURCES ──────────────────────────────────────────────────────────────
const RSS_SOURCES = [
  {id:"bbc-me",   label:"BBC Middle East", url:"https://feeds.bbci.co.uk/news/world/middle_east/rss.xml"},
  {id:"aljazeera",label:"Al Jazeera",       url:"https://www.aljazeera.com/xml/rss/all.xml"},
  {id:"reuters",  label:"Reuters World",    url:"https://feeds.reuters.com/reuters/topNews"},
  {id:"arabnews", label:"Arab News",        url:"https://www.arabnews.com/rss.xml"},
  {id:"guardian", label:"The Guardian",     url:"https://www.theguardian.com/world/rss"},
  {id:"gulfnews", label:"Gulf News",        url:"https://gulfnews.com/rss/uae"},
  {id:"national", label:"The National UAE", url:"https://www.thenationalnews.com/rss/world.xml"},
];

// ─── REDDIT SUBS (12 — added Iraq + Egypt vs v3's 10) ────────────────────────
const REDDIT_SUBS = [
  {sub:"UAE",         country:"UAE",          flag:"🇦🇪",tag:"UAE"},
  {sub:"saudiarabia", country:"Saudi Arabia", flag:"🇸🇦",tag:"KSA"},
  {sub:"qatar",       country:"Qatar",        flag:"🇶🇦",tag:"QAT"},
  {sub:"Kuwait",      country:"Kuwait",       flag:"🇰🇼",tag:"KUW"},
  {sub:"jordan",      country:"Jordan",       flag:"🇯🇴",tag:"JOR"},
  {sub:"oman",        country:"Oman",         flag:"🇴🇲",tag:"OMN"},
  {sub:"bahrain",     country:"Bahrain",      flag:"🇧🇭",tag:"BAH"},
  {sub:"lebanon",     country:"Lebanon",      flag:"🇱🇧",tag:"LEB"},
  {sub:"iraq",        country:"Iraq",         flag:"🇮🇶",tag:"IRQ"},
  {sub:"egypt",       country:"Egypt",        flag:"🇪🇬",tag:"EGY"},
  {sub:"MiddleEast",  country:"Regional",     flag:"🌍", tag:"ME"},
  {sub:"Arabs",       country:"Regional",     flag:"🌍", tag:"ARAB"},
];

// ─── SENTIMENT ENGINE ─────────────────────────────────────────────────────────
const POS_W=["growth","surge","record","success","deal","agreement","expands","boost","profit","milestone","launch","stable","peace","recovery","invest","improve","achieve","develop","partnership","innovation","win","hope","progress","rise","benefit","support","signed","approved"];
const NEG_W=["crisis","attack","conflict","warning","risk","decline","concern","tension","threat","sanction","collapse","killed","explosion","flood","fire","war","bomb","strike","missile","casualties","arrest","ban","shortage","debt","failure","violence","terrorism","hostage","dead","wounded","detained","airstrike","siege"];
const NEGS=["not","no","never","don't","doesn't","didn't","won't","can't","isn't","aren't","wasn't","without"];

function senti(text){
  if(!text) return{label:"NEUTRAL",score:0};
  const w=text.toLowerCase().split(/\W+/);let p=0,n=0;
  w.forEach((x,i)=>{const neg=NEGS.includes(w[i-1]||"");if(POS_W.includes(x)) neg?n++:p++;if(NEG_W.includes(x)) neg?p++:n++;});
  if(n>p+1) return{label:"CRITICAL",score:-2};if(n>p) return{label:"WARNING",score:-1};
  if(p>n+1) return{label:"POSITIVE",score:2};if(p>n) return{label:"STABLE",score:1};
  return{label:"NEUTRAL",score:0};
}
function classify(text){
  const t=(text||"").toLowerCase();let best="Other",bestN=0;
  for(const[k,{keywords}]of Object.entries(SECTIONS)){const n=keywords.filter(kw=>t.includes(kw)).length;if(n>bestN){best=k;bestN=n;}}
  return best;
}
function detectCountry(text){
  const t=(text||"").toLowerCase();
  for(const c of MENA_COUNTRIES){if(c.id==="Regional")continue;if(c.keywords.some(k=>t.includes(k)))return c.id;}
  return"Regional";
}

// ─── DATA FETCHERS ────────────────────────────────────────────────────────────
async function fetchRSS(src){
  try{
    const res=await fetch("/api/rss",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:src.url})});
    const d=await res.json();if(!d.items||!Array.isArray(d.items))return[];
    return d.items.slice(0,8).map(item=>{const txt=item.title+" "+(item.summary||"");return{
      id:item.guid||item.link,title:item.title,summary:(item.summary||"").slice(0,220),
      url:item.link,timestamp:new Date(item.pubDate||Date.now()),source:src.label,sourceType:"RSS",
      tag:"NEWS",country:detectCountry(txt),section:classify(txt),sentiment:senti(txt),score:0,comments:0};});
  }catch{return[];}
}
async function fetchRedditSub({sub,country,flag,tag}){
  try{
    const r=await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=15&t=week`,
      {headers:{"User-Agent":"StrategicEye-OSINT/4.0"},signal:AbortSignal.timeout(6000)});
    if(!r.ok)return[];const d=await r.json();
    return(d?.data?.children||[]).filter(({data:p})=>p.title&&!p.stickied).map(({data:p})=>{
      const txt=p.title+" "+(p.selftext||"");
      return{id:"reddit-"+p.id,title:p.title,summary:p.selftext?p.selftext.slice(0,220):`↑ ${p.score} · 💬 ${p.num_comments}`,
        url:"https://reddit.com"+p.permalink,timestamp:new Date(p.created_utc*1000),
        source:`r/${sub}`,sourceType:"Reddit",tag,country,flag,
        section:classify(txt),sentiment:senti(txt),score:p.score,comments:p.num_comments};});
  }catch{return[];}
}
async function fetchHackerNews(){
  const since=Math.floor(Date.now()/1000)-7*24*3600;
  const queries=["middle east","OPEC oil","UAE technology","Saudi Arabia","Gulf geopolitics","Israel Gaza","Iran nuclear","Egypt economy","Iraq security"];
  const all=[],seen=new Set();
  for(const q of queries){
    try{const d=await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=4&numericFilters=created_at_i>${since}`).then(r=>r.json());
    for(const h of(d.hits||[])){if(!h.title||seen.has(h.objectID))continue;seen.add(h.objectID);
      all.push({id:"hn-"+h.objectID,title:h.title,summary:`${h.points||0} pts · ${h.num_comments||0} comments`,
        url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,timestamp:new Date(h.created_at),
        source:"Hacker News",sourceType:"HN",tag:"TECH",country:detectCountry(h.title),
        section:classify(h.title),sentiment:senti(h.title),score:h.points||0,comments:h.num_comments||0});}
    }catch{}
  }return all;
}
async function fetchOpenMeteo(){try{const d=await fetch("https://api.open-meteo.com/v1/forecast?latitude=24.7136&longitude=46.6753&current=temperature_2m,wind_speed_10m&forecast_days=1").then(r=>r.json());return{temp:d.current?.temperature_2m,wind:d.current?.wind_speed_10m};}catch{return null;}}
async function fetchExchangeRate(){try{const d=await fetch("https://api.exchangerate-api.com/v4/latest/USD").then(r=>r.json());return{sar:d.rates?.SAR,aed:d.rates?.AED,qar:d.rates?.QAR,kwd:d.rates?.KWD,bhd:d.rates?.BHD};}catch{return null;}}
async function fetchGemini(items){
  const headlines=items.slice(0,14).map(i=>i.title||i);
  try{const res=await fetch("/api/brief",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({headlines,mode:"intelligence"})});
  const data=await res.json();if(!res.ok)return{_error:data.error||"API error"};return data;}catch(e){return{_error:e.message};}
}
async function fetchBulkIngest(onProgress){
  onProgress({stage:"Connecting to ingest pipeline…",pct:5});
  try{const res=await fetch("/api/ingest",{method:"GET",signal:AbortSignal.timeout(55000)});
  onProgress({stage:"Fetching RSS · Reddit · HN in parallel…",pct:30});
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||`HTTP ${res.status}`);}
  onProgress({stage:"Classifying sections & analysing sentiment…",pct:70});
  const data=await res.json();onProgress({stage:"Pre-processing complete — loading…",pct:95});return data;
  }catch(e){throw new Error(e.message);}
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const ago=ts=>{const m=Math.floor((Date.now()-new Date(ts))/60000);return m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`;};
const secColor=s=>SECTIONS[s]?.color||T.outVar;
const sentColor=l=>l==="CRITICAL"?T.error:l==="WARNING"?T.tertiary:l==="POSITIVE"?T.secondary:l==="STABLE"?T.primary:T.onVar;
const sentBg=l=>l==="CRITICAL"?`${T.errCont}55`:l==="WARNING"?`${T.terCont}55`:l==="POSITIVE"?`${T.secCont}33`:l==="STABLE"?`${T.priCont}55`:`${T.outVar}33`;
const srcColor=t=>t==="Reddit"?"#ff6314":t==="RSS"?T.tertiary:t==="HN"?"#f97316":t==="BULK"||t==="AI"?T.primary:T.primary;
function calcPulse(items){if(!items.length)return 50;const c=items.filter(i=>i.sentiment?.label==="CRITICAL").length,w=items.filter(i=>i.sentiment?.label==="WARNING").length,p=items.filter(i=>i.sentiment?.label==="POSITIVE").length,s=items.filter(i=>i.sentiment?.label==="STABLE").length;return Math.min(98,Math.max(10,Math.round(50+(p*4+s*2)-(c*9+w*4))));}

// ─── SVG COMPONENTS ───────────────────────────────────────────────────────────
function PulseRing({score,loading}){
  const col=score>65?T.secondary:score>40?T.primary:T.error;
  const r=46,cx=56,cy=56,circ=2*Math.PI*r;
  return(<svg width="112" height="112" viewBox="0 0 112 112">
    <circle cx={cx} cy={cy} r={r+6} fill="none" stroke={`${col}12`} strokeWidth="1"/>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.mid} strokeWidth="8"/>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="8"
      strokeDasharray={`${(score/100)*circ} ${circ*(1-score/100)}`} strokeDashoffset={circ/4} strokeLinecap="round"
      style={{transition:"stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)",filter:`drop-shadow(0 0 8px ${col}88)`}}/>
    {loading?<text x={cx} y={cy+5} textAnchor="middle" fill={T.onVar} fontSize="11">…</text>
      :<><text x={cx} y={cy-3} textAnchor="middle" fill={col} fontSize="24" fontWeight="900" fontFamily="Manrope">{score}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill={T.onVar} fontSize="7" fontWeight="700" letterSpacing="0.15em">PULSE</text></>}
  </svg>);
}
function Spark({data,color,w=60,h=24}){
  if(!data||data.length<2)return null;
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*h}`).join(" ");
  return(<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}
function SentBar({label,color,pct}){return(<div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}><span style={{color:T.onVar}}>{label}</span><span style={{color,fontWeight:700}}>{pct}%</span></div><div style={{height:3,background:T.high,borderRadius:2,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:2,transition:"width .8s ease"}}/></div></div>);}
function FeedCard({item}){
  const[exp,setExp]=useState(false);
  const s=item.sentiment||{label:"NEUTRAL",score:0};
  const sc=secColor(item.section);const cI=COUNTRY_MAP[item.country]||{flag:"🌍"};
  return(<div onClick={()=>setExp(!exp)} style={{background:exp?T.high:T.mid,borderRadius:5,padding:"13px 15px",cursor:"pointer",transition:"background .15s",borderLeft:`3px solid ${s.label==="CRITICAL"?T.error:s.label==="WARNING"?T.tertiary:s.label==="POSITIVE"?T.secondary:T.outVar}`,marginBottom:7}}>
    <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"flex-start"}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:3,letterSpacing:".08em",background:sentBg(s.label),color:sentColor(s.label)}}>{s.label}</span>
          <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${sc}20`,color:sc}}>{SECTIONS[item.section]?.label||item.section}</span>
          <span style={{fontSize:10}}>{cI.flag}</span>
          {item.score>100&&<span style={{fontSize:9,color:T.secondary,fontWeight:700}}>↑{item.score}</span>}
        </div>
        <p style={{fontSize:13,fontWeight:700,color:T.onSurf,lineHeight:1.4,margin:0}}>{item.title}</p>
        {exp&&item.summary&&<p style={{fontSize:11,color:T.onVar,marginTop:8,lineHeight:1.6}}>{item.summary}</p>}
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <span style={{fontSize:9,color:T.onVar,display:"block"}}>{ago(item.timestamp)}</span>
        <span style={{fontSize:9,color:`${srcColor(item.sourceType)}88`,display:"block",marginTop:2}}>{item.source}</span>
      </div>
    </div>
    {exp&&item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:T.primary,marginTop:8,display:"inline-block",textDecoration:"none"}}>Open source ↗</a>}
  </div>);
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const[items,setItems]=useState([]);
  const[redditItems,setRedditItems]=useState([]);
  const[loading,setLoading]=useState(true);
  const[redditLoading,setRedditLoading]=useState(true);
  const[srcStatuses,setSrcStatuses]=useState({});
  const[redditStatus,setRedditStatus]=useState({});
  const[lastRefresh,setLastRefresh]=useState(null);
  const[pulseHist,setPulseHist]=useState([50,52,48,55,60,58,62]);
  const[weather,setWeather]=useState(null);
  const[fx,setFx]=useState(null);
  const[brief,setBrief]=useState(null);
  const[briefLoading,setBriefLoading]=useState(false);
  const[bulkLoading,setBulkLoading]=useState(false);
  const[bulkProgress,setBulkProgress]=useState({stage:"",pct:0});
  const[bulkMeta,setBulkMeta]=useState(null);
  const[bulkError,setBulkError]=useState(null);
  const[tab,setTab]=useState("overview");
  const[activeCountry,setActiveCountry]=useState("Saudi Arabia");
  const[feedFilter,setFeedFilter]=useState("ALL");
  const[secFilter,setSecFilter]=useState("ALL");
  const[searchQ,setSearchQ]=useState("");
  const[redditFilter,setRedditFilter]=useState("ALL");
  const timerRef=useRef(null);

  const loadMain=useCallback(async()=>{
    setLoading(true);const statuses={},all=[];
    for(const src of RSS_SOURCES){const itms=await fetchRSS(src);statuses[src.id]=itms.length>0?"active":"error";all.push(...itms);}
    const hn=await fetchHackerNews();statuses.hackernews=hn.length>0?"active":"warn";all.push(...hn);
    all.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    const seen=new Set();const unique=all.filter(i=>{if(seen.has(i.id))return false;seen.add(i.id);return true;});
    setItems(unique);setSrcStatuses(statuses);
    const score=calcPulse(unique);setPulseHist(p=>[...p.slice(-6),score]);
    setLastRefresh(new Date());setLoading(false);
    fetchOpenMeteo().then(setWeather);fetchExchangeRate().then(setFx);
    if(unique.length>5){setBriefLoading(true);fetchGemini(unique).then(b=>{setBrief(b);setBriefLoading(false);});}
  },[]);

  const loadReddit=useCallback(async()=>{
    setRedditLoading(true);const all=[],statuses={};
    for(const sub of REDDIT_SUBS){const posts=await fetchRedditSub(sub);statuses[sub.sub]=posts.length>0?"active":"error";all.push(...posts);}
    all.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    const seen=new Set();const unique=all.filter(i=>{if(seen.has(i.id))return false;seen.add(i.id);return true;});
    setRedditItems(unique);setRedditStatus(statuses);setRedditLoading(false);
  },[]);

  const loadBulk=useCallback(async()=>{
    setBulkLoading(true);setBulkError(null);setBulkProgress({stage:"Starting…",pct:2});
    try{
      const data=await fetchBulkIngest(p=>setBulkProgress(p));
      if(!data.ok)throw new Error(data.error||"Ingest failed");
      const existIds=new Set([...items,...redditItems].map(i=>i.id));
      const fresh=(data.articles||[]).filter(a=>!existIds.has(a.id));
      setItems(prev=>{const m=[...prev,...fresh.filter(a=>a.sourceType!=="Reddit")].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));const s=new Set();return m.filter(i=>{if(s.has(i.id))return false;s.add(i.id);return true;});});
      setRedditItems(prev=>{const m=[...prev,...fresh.filter(a=>a.sourceType==="Reddit")].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));const s=new Set();return m.filter(i=>{if(s.has(i.id))return false;s.add(i.id);return true;});});
      if(data.sourceHealth){const ns={};(data.sourceHealth.rss||[]).forEach(s=>{ns[s.id]=s.status;});if(data.sourceHealth.hn)ns.hackernews=data.sourceHealth.hn.status;setSrcStatuses(p=>({...p,...ns}));const nr={};(data.sourceHealth.reddit||[]).forEach(s=>{nr[s.sub]=s.status;});setRedditStatus(p=>({...p,...nr}));}
      setBulkMeta(data.meta);setBulkProgress({stage:"Done!",pct:100});
    }catch(e){setBulkError(e.message);}
    finally{setTimeout(()=>{setBulkLoading(false);setBulkProgress({stage:"",pct:0});},1800);}
  },[items,redditItems]);

  useEffect(()=>{
    loadMain();loadReddit();
    timerRef.current=setInterval(()=>{loadMain();loadReddit();},5*60*1000);
    return()=>clearInterval(timerRef.current);
  },[loadMain,loadReddit]);

  const allItems=[...items,...redditItems].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const pScore=calcPulse(allItems);
  const sentCounts={CRITICAL:0,WARNING:0,POSITIVE:0,STABLE:0,NEUTRAL:0};
  allItems.forEach(i=>{if(sentCounts[i.sentiment?.label]!==undefined)sentCounts[i.sentiment.label]++;});
  const secCounts=Object.keys(SECTIONS).reduce((a,s)=>{a[s]=allItems.filter(i=>i.section===s).length;return a;},{});

  const cData=(cid)=>{
    const ci=allItems.filter(i=>i.country===cid);if(!ci.length)return{items:[],avg:0,dominant:"NEUTRAL",count:0};
    const avg=ci.reduce((s,i)=>s+(i.sentiment?.score||0),0)/ci.length;
    const cnts={};ci.forEach(i=>{const l=i.sentiment?.label||"NEUTRAL";cnts[l]=(cnts[l]||0)+1;});
    return{items:ci,avg,dominant:Object.entries(cnts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"NEUTRAL",count:ci.length};
  };

  const filteredFeed=allItems.filter(i=>{
    if(feedFilter!=="ALL"&&i.sentiment?.label!==feedFilter)return false;
    if(secFilter!=="ALL"&&i.section!==secFilter)return false;
    if(searchQ&&!i.title.toLowerCase().includes(searchQ.toLowerCase())&&!i.country.toLowerCase().includes(searchQ.toLowerCase()))return false;
    return true;
  });
  const filteredReddit=redditItems.filter(i=>redditFilter==="ALL"||i.sentiment?.label===redditFilter);
  const userSentCol=brief?.userSentiment?({OPTIMISTIC:T.secondary,CAUTIOUS:T.primary,ANXIOUS:T.tertiary,FEARFUL:T.error,INDIFFERENT:T.onVar}[brief.userSentiment]||T.primary):T.primary;

  const NAV=[
    {id:"overview",label:"Overview",icon:"dashboard"},
    {id:"feed",label:"Regional News",icon:"rss_feed"},
    {id:"reddit",label:"Social Intel",icon:"forum"},
    {id:"country",label:"Countries",icon:"public"},
    {id:"analysis",label:"Analysis",icon:"monitoring"},
    {id:"sources",label:"Sources",icon:"layers"},
  ];

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}html,body{height:100%;background:${T.surface};color:${T.onSurf};}
    ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${T.high};border-radius:10px}
    .ms{font-family:'Material Symbols Outlined';font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24;vertical-align:middle;font-style:normal;line-height:1}
    .ms-fill{font-family:'Material Symbols Outlined';font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;vertical-align:middle;font-style:normal;line-height:1}
    .nav-link{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:4px;font-size:12px;font-weight:600;color:${T.onVar};cursor:pointer;transition:all .15s;border-bottom:2px solid transparent;font-family:'Inter',sans-serif;background:transparent;border-top:none;border-left:none;border-right:none}
    .nav-link:hover{color:${T.onSurf}}.nav-link.active{color:${T.primary};border-bottom-color:${T.primary}}
    .card{background:${T.mid};border-radius:6px;padding:20px 22px}
    .chip{padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;background:transparent;color:${T.onVar};border:1px solid ${T.outVar}33}
    .chip:hover{color:${T.onSurf};border-color:${T.outVar}}.chip.on{background:${T.priCont};color:${T.primary};border-color:${T.priCont}}
    .cbtn{padding:6px 16px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:.05em;transition:all .15s;background:transparent;color:${T.onVar};border:1px solid transparent;font-family:'Manrope',sans-serif;text-transform:uppercase}
    .cbtn:hover{color:${T.onSurf};background:${T.mid}}.cbtn.active{background:${T.mid};color:${T.primary};border-color:${T.priCont}}
    .cta{background:linear-gradient(45deg,${T.priCont},${T.primary});color:${T.base};font-weight:700;font-size:11px;letter-spacing:.1em;text-transform:uppercase;border:none;border-radius:4px;padding:10px 18px;cursor:pointer;transition:opacity .2s}.cta:hover{opacity:.9}
    .ghost{background:transparent;border:1px solid ${T.primary}33;color:${T.primary};font-size:11px;font-weight:700;letter-spacing:.08em;border-radius:4px;padding:8px 16px;cursor:pointer;transition:all .15s}.ghost:hover{background:${T.priCont}33}
    .glass{background:rgba(45,52,73,0.7);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
    .ticker{white-space:nowrap;display:inline-block;animation:ticker 50s linear infinite}
    @keyframes ticker{0%{transform:translateX(100vw)}100%{transform:translateX(-100%)}}
    @keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.6)}}
    .spin{animation:spin 1s linear infinite;display:inline-block}.live{animation:pulse 2s ease infinite;display:inline-block}
    .srow:hover{background:${T.high}}input::placeholder{color:${T.outVar}}
  `;

  return(
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",background:T.surface,fontFamily:"'Inter',sans-serif",color:T.onSurf,fontSize:13}}>
      <style>{css}</style>

      {/* BULK MODAL */}
      {(bulkLoading||bulkError)&&(
        <div style={{position:"fixed",inset:0,background:"rgba(6,14,32,.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,backdropFilter:"blur(8px)"}}>
          <div className="glass" style={{borderRadius:12,padding:"36px 44px",minWidth:420,maxWidth:520,border:`1px solid ${bulkError?T.error:T.primary}22`,boxShadow:`0 0 60px ${bulkError?"#ef444420":"#b4c5ff18"}`}}>
            {bulkError?(
              <><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <span className="ms" style={{fontSize:28,color:T.error}}>error_outline</span>
                <div style={{fontFamily:"Manrope",fontSize:18,fontWeight:900,color:T.error}}>Ingest Failed</div></div>
                <p style={{fontSize:13,color:T.onVar,lineHeight:1.65,marginBottom:16}}>{bulkError}</p>
                <div style={{fontSize:11,color:T.onVar,background:T.low,padding:"10px 14px",borderRadius:5,fontFamily:"'JetBrains Mono',monospace",marginBottom:20}}>Vercel Hobby plan: 10s limit. Use Refresh or upgrade to Pro for bulk ingest.</div>
                <button className="ghost" onClick={()=>{setBulkError(null);setBulkLoading(false);}}>Dismiss</button></>
            ):(
              <><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                <span className="ms spin" style={{fontSize:24,color:T.primary}}>sync</span>
                <div><div style={{fontFamily:"Manrope",fontSize:17,fontWeight:900}}>Bulk Ingest — 30 Days</div>
                <div style={{fontSize:11,color:T.onVar,marginTop:2}}>RSS · Reddit 100/sub · HN 10 queries — all parallel</div></div></div>
                <div style={{height:6,background:T.high,borderRadius:3,overflow:"hidden",marginBottom:10,position:"relative"}}>
                  <div style={{position:"absolute",inset:0,width:`${bulkProgress.pct}%`,background:`linear-gradient(90deg,${T.priCont},${T.primary})`,borderRadius:3,transition:"width .4s ease"}}/></div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
                  <span style={{fontSize:11,color:T.onVar}}>{bulkProgress.stage}</span>
                  <span style={{fontSize:11,fontWeight:800,color:T.primary,fontFamily:"'JetBrains Mono',monospace"}}>{bulkProgress.pct}%</span></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  {[["rss_feed","RSS Feeds","7 sources",T.tertiary],["forum","Reddit","12 × 100","#ff6314"],["whatshot","HN","10 queries","#f97316"]].map(([ic,l,sub,col])=>(
                    <div key={l} style={{background:T.low,borderRadius:5,padding:"10px 12px"}}>
                      <span className="ms" style={{color:col,fontSize:16,display:"block",marginBottom:4}}>{ic}</span>
                      <div style={{fontSize:11,fontWeight:700}}>{l}</div>
                      <div style={{fontSize:9,color:T.onVar,marginTop:2}}>{sub}</div></div>))}
                </div>
                {bulkProgress.pct===100&&<div style={{marginTop:14,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:`${T.secCont}20`,borderRadius:5}}>
                  <span className="ms" style={{color:T.secondary,fontSize:18}}>check_circle</span>
                  <span style={{fontSize:12,color:T.secondary,fontWeight:700}}>All sources ingested!</span></div>}</>
            )}
          </div>
        </div>
      )}

      {/* TOP NAV — horizontal, matching wireframes */}
      <header style={{background:T.low,borderBottom:`1px solid ${T.outVar}18`,height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",flexShrink:0,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:28}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginRight:4}}>
            <div style={{width:28,height:28,background:`linear-gradient(45deg,${T.priCont},${T.primary})`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span className="ms-fill" style={{color:T.base,fontSize:16}}>shield</span></div>
            <div><div style={{fontFamily:"Manrope",fontWeight:900,fontSize:13,color:T.primary,letterSpacing:"-.02em",lineHeight:1}}>STRATEGIC EYE</div>
              <div style={{fontSize:8,color:`${T.primary}55`,letterSpacing:".12em",textTransform:"uppercase"}}>MENA Intelligence · {MENA_COUNTRIES.length-1} Countries</div></div>
          </div>
          <nav style={{display:"flex",gap:2}}>{NAV.map(n=>(<button key={n.id} className={`nav-link${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}><span className="ms" style={{fontSize:15}}>{n.icon}</span>{n.label}</button>))}</nav>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:7,background:T.mid,borderRadius:4,padding:"5px 11px",width:190}}>
            <span className="ms" style={{fontSize:14,color:T.onVar}}>search</span>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search Intel…"
              style={{background:"transparent",border:"none",outline:"none",fontSize:12,color:T.onSurf,width:"100%"}}/>
          </div>
          <button onClick={()=>{loadMain();loadReddit();}} disabled={loading&&redditLoading}
            style={{background:"transparent",border:`1px solid ${T.outVar}44`,borderRadius:4,padding:"5px 9px",cursor:"pointer",color:T.onVar,display:"flex",alignItems:"center",gap:4,fontSize:11}}>
            <span className={`ms${(loading||redditLoading)?" spin":""}`} style={{fontSize:15}}>{(loading||redditLoading)?"sync":"refresh"}</span>
          </button>
          <button onClick={loadBulk} disabled={bulkLoading} className="cta" style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px"}}>
            <span className={`ms${bulkLoading?" spin":""}`} style={{fontSize:14,color:T.base}}>{bulkLoading?"hourglass_top":"history"}</span>
            {bulkLoading?`${bulkProgress.pct}%`:"Bulk 30d"}
          </button>
          <button style={{background:"transparent",border:"none",cursor:"pointer",color:T.onVar,padding:"3px"}}><span className="ms" style={{fontSize:20}}>notifications</span></button>
          <button style={{background:"transparent",border:"none",cursor:"pointer",color:T.onVar,padding:"3px"}}><span className="ms" style={{fontSize:20}}>settings</span></button>
          <div style={{width:28,height:28,borderRadius:"50%",background:T.priCont,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <span className="ms" style={{fontSize:17,color:T.primary}}>account_circle</span></div>
        </div>
      </header>

      {/* TICKER */}
      <div style={{background:T.base,borderBottom:`1px solid ${T.outVar}18`,padding:"5px 0",overflow:"hidden",flexShrink:0}}>
        <span style={{fontSize:9,fontWeight:800,color:T.error,background:`${T.errCont}55`,padding:"2px 8px",borderRadius:3,marginLeft:16,marginRight:12,letterSpacing:".1em"}}>● BREAKING</span>
        <span className="ticker" style={{fontSize:11,color:T.onVar}}>{allItems.slice(0,8).map(i=>i.title).join("   ·   ")||"Loading intelligence feed…"}</span>
      </div>

      {/* CONTENT */}
      <main style={{flex:1,overflowY:"auto",padding:"28px 32px",background:T.surface}}>

        {/* ── OVERVIEW ────────────────────────────────────────────────── */}
        {tab==="overview"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
              <div>
                <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".2em",fontWeight:700,marginBottom:6}}>Intelligence Feed · MENA Region</div>
                <h1 style={{fontFamily:"Manrope",fontSize:34,fontWeight:900,letterSpacing:"-.5px",lineHeight:1}}>Middle East Activity Heatmap</h1>
                <p style={{color:T.onVar,fontSize:12,marginTop:6,display:"flex",alignItems:"center",gap:8}}>
                  <span className="live" style={{width:6,height:6,borderRadius:"50%",background:T.secondary,flexShrink:0}}/>
                  Real-time alert density · {MENA_COUNTRIES.length-1} MENA hubs · {allItems.length} signals
                </p>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{background:`${T.secCont}33`,color:T.secondary,fontSize:9,fontWeight:800,padding:"5px 12px",borderRadius:3,letterSpacing:".06em"}}>LIVE DATA</div>
                <div style={{background:T.mid,color:T.onVar,fontSize:9,fontWeight:700,padding:"5px 12px",borderRadius:3,letterSpacing:".06em"}}>OPERATIONAL</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20,marginBottom:20}}>
              <div>
                {/* Map */}
                <div style={{background:T.low,borderRadius:6,height:300,position:"relative",overflow:"hidden",marginBottom:14}}>
                  <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 58% 52%, ${T.priCont}55 0%,transparent 65%)`}}/>
                  {[{id:"UAE",x:"67%",y:"53%",col:T.secondary},{id:"Saudi Arabia",x:"52%",y:"50%",col:T.primary},
                    {id:"Qatar",x:"63%",y:"51%",col:T.primary},{id:"Kuwait",x:"60%",y:"43%",col:T.primary},
                    {id:"Iran",x:"72%",y:"36%",col:T.error},{id:"Iraq",x:"63%",y:"37%",col:T.tertiary},
                    {id:"Jordan",x:"54%",y:"43%",col:T.primary},{id:"Israel",x:"51%",y:"42%",col:T.tertiary},
                    {id:"Egypt",x:"44%",y:"47%",col:T.primary},{id:"Yemen",x:"59%",y:"62%",col:T.error},
                    {id:"Lebanon",x:"52%",y:"39%",col:T.tertiary},{id:"Syria",x:"55%",y:"36%",col:T.error},
                    {id:"Libya",x:"34%",y:"44%",col:T.onVar},{id:"Morocco",x:"22%",y:"38%",col:T.onVar},
                    {id:"Sudan",x:"46%",y:"60%",col:T.tertiary},
                  ].map(({id,x,y,col})=>{
                    const cd=cData(id),sz=cd.count>8?14:cd.count>3?10:7,c=COUNTRY_MAP[id];
                    return(<div key={id} onClick={()=>{setActiveCountry(id);setTab("country");}}
                      style={{position:"absolute",left:x,top:y,transform:"translate(-50%,-50%)",cursor:"pointer",zIndex:10}}>
                      <div style={{width:sz,height:sz,borderRadius:"50%",background:col,boxShadow:`0 0 ${sz*2}px ${col}88`,opacity:.9}} title={`${id}: ${cd.count} signals`}/>
                      {cd.count>3&&<div style={{position:"absolute",top:sz+2,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",fontSize:7,color:T.onVar,fontWeight:700,pointerEvents:"none"}}>{c?.label||id}</div>}
                    </div>);
                  })}
                  <div style={{position:"absolute",bottom:10,left:14}}>
                    <div style={{fontFamily:"Manrope",fontSize:13,fontWeight:800,marginBottom:5}}>MENA Activity Map <span style={{fontSize:10,color:T.onVar}}>— click a hub to drill down</span></div>
                    <div style={{display:"flex",gap:12}}>{[[T.error,"Critical"],[T.tertiary,"Warning"],[T.secondary,"Stable"],[T.primary,"Active"]].map(([col,l])=>(
                      <div key={l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:col,boxShadow:`0 0 5px ${col}88`}}/><span style={{fontSize:8,color:T.onVar,fontWeight:700}}>{l}</span></div>))}</div>
                  </div>
                </div>
                {/* Trending topics bento */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                  {Object.entries(secCounts).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([sec,cnt],i)=>(
                    <div key={sec} className="card" style={{cursor:"pointer",padding:"14px 16px"}} onClick={()=>{setSecFilter(sec);setTab("feed");}}>
                      <div style={{fontSize:20,marginBottom:7}}>{sec.slice(0,2)}</div>
                      <div style={{fontSize:8,color:T.onVar,textTransform:"uppercase",letterSpacing:".1em",fontWeight:700,marginBottom:3}}>TOPIC 0{i+1}</div>
                      <div style={{fontFamily:"Manrope",fontSize:12,fontWeight:800,lineHeight:1.3}}>{SECTIONS[sec]?.label||sec}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:secColor(sec),marginTop:5,fontWeight:700}}>{cnt}</div>
                    </div>))}
                </div>
              </div>

              {/* Right column */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="card" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"16px 14px"}}>
                  <PulseRing score={pScore} loading={loading&&!allItems.length}/>
                  <div style={{display:"flex",gap:14}}>{[["CRITICAL",T.error],["WARNING",T.tertiary],["POSITIVE",T.secondary]].map(([l,col])=>(
                    <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"Manrope",fontWeight:800,fontSize:15,color:col}}>{sentCounts[l]||0}</div><div style={{fontSize:8,color:T.onVar,letterSpacing:".08em"}}>{l}</div></div>))}
                  </div>
                  <Spark data={pulseHist} color={T.primary} w={120} h={24}/>
                </div>
                <div className="card">
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:12}}>Market Indicators</div>
                  {[["Brent Crude","$82.44","+1.24%",T.secondary],["DFM Index",fx?`${fx.aed?.toFixed(2)||"3.67"}`:"—","+0.42%",T.secondary],["TASI Index",fx?`${fx.sar?.toFixed(2)||"3.75"}`:"—","-0.15%",T.error]].map(([l,v,ch,col])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div><div style={{fontFamily:"Manrope",fontSize:16,fontWeight:900}}>{v}</div><div style={{fontSize:9,color:T.onVar}}>{l}</div></div>
                      <span style={{fontSize:9,fontWeight:800,background:`${col}22`,color:col,padding:"2px 8px",borderRadius:3}}>{ch}</span>
                    </div>))}
                </div>
                <div className="card" style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar}}>Pulse Updates</div>
                    <button onClick={()=>setTab("feed")} style={{fontSize:10,color:T.primary,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>View All</button>
                  </div>
                  {allItems.slice(0,4).map(item=>{const sc=secColor(item.section);return(
                    <div key={item.id} style={{borderLeft:`2px solid ${sc}`,paddingLeft:10,marginBottom:11}}>
                      <div style={{fontSize:9,fontWeight:700,color:sc,textTransform:"uppercase",letterSpacing:".08em",marginBottom:2}}>{SECTIONS[item.section]?.label||item.section} · {ago(item.timestamp)}</div>
                      <div style={{fontSize:12,fontWeight:700,lineHeight:1.35}}>{item.title}</div>
                      <div style={{fontSize:9,color:T.onVar,marginTop:2}}>{COUNTRY_MAP[item.country]?.flag||"🌍"} {item.source}</div>
                    </div>);})}
                </div>
              </div>
            </div>
            {lastRefresh&&<div style={{fontSize:9,color:T.onVar,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>Last refresh: {lastRefresh.toLocaleTimeString()}{bulkMeta&&` · Bulk: ${bulkMeta.totalFiltered} articles`}</div>}
          </div>
        )}

        {/* ── REGIONAL NEWS FEED ────────────────────────────────────── */}
        {tab==="feed"&&(
          <div>
            {/* Country filter bar — all MENA countries */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:16,flexWrap:"wrap"}}>
              <button className={`cbtn${feedFilter==="ALL"?" active":""}`} onClick={()=>setFeedFilter("ALL")}>All</button>
              {MENA_COUNTRIES.filter(c=>c.id!=="Regional").map(c=>(
                <button key={c.id} className={`cbtn${feedFilter===c.id?" active":""}`} onClick={()=>setFeedFilter(f=>f===c.id?"ALL":c.id)}>{c.flag} {c.label}</button>))}
              <div style={{marginLeft:"auto",fontSize:10,color:T.onVar,display:"flex",alignItems:"center",gap:5}}>
                <span className="live" style={{width:5,height:5,borderRadius:"50%",background:T.secondary}}/>Last: {lastRefresh?ago(lastRefresh):"—"}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16}}>
              <h1 style={{fontFamily:"Manrope",fontSize:30,fontWeight:900,letterSpacing:"-.5px"}}>Regional Feed <span style={{color:T.primary}}>.</span></h1>
              <div style={{display:"flex",gap:14}}>{[["NEUTRAL",T.onVar],["WARNING",T.tertiary],["CRITICAL",T.error]].map(([l,col])=>(
                <span key={l} style={{fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:col}}/><span style={{color:col}}>{sentCounts[l]||0} {l}</span></span>))}</div>
            </div>
            <div style={{display:"flex",gap:5,marginBottom:16,flexWrap:"wrap"}}>
              {["ALL",...Object.keys(SECTIONS)].map(s=>(
                <button key={s} className={`chip${secFilter===s?" on":""}`} onClick={()=>setSecFilter(s)}
                  style={{borderLeft:s!=="ALL"?`2px solid ${secColor(s)}`:undefined}}>{s==="ALL"?"All Sections":SECTIONS[s]?.label||s}</button>))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:18}}>
              <div>
                {filteredFeed[0]&&(
                  <div style={{background:T.low,borderRadius:6,padding:"22px 24px",marginBottom:14,cursor:"pointer"}} onClick={()=>window.open(filteredFeed[0].url,"_blank")}>
                    <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
                      <span style={{fontSize:9,fontWeight:800,padding:"3px 8px",borderRadius:3,background:`${T.secCont}22`,color:T.secondary,letterSpacing:".1em"}}>BREAKING</span>
                      <span style={{fontSize:10,color:T.onVar}}>{ago(filteredFeed[0].timestamp)}</span>
                    </div>
                    <h2 style={{fontFamily:"Manrope",fontSize:20,fontWeight:800,lineHeight:1.3,marginBottom:8}}>{filteredFeed[0].title}</h2>
                    {filteredFeed[0].summary&&<p style={{fontSize:12,color:T.onVar,lineHeight:1.6,marginBottom:12}}>{filteredFeed[0].summary}</p>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:26,height:26,background:T.high,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:T.primary}}>{filteredFeed[0].source.slice(0,3).toUpperCase()}</div>
                        <span style={{fontSize:12,color:T.onVar,fontWeight:600}}>{filteredFeed[0].source}</span>
                      </div>
                      <span style={{fontSize:9,fontWeight:800,padding:"3px 10px",borderRadius:3,background:sentBg(filteredFeed[0].sentiment?.label),color:sentColor(filteredFeed[0].sentiment?.label),letterSpacing:".08em"}}>{filteredFeed[0].sentiment?.label} SENTIMENT</span>
                    </div>
                  </div>
                )}
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:10}}>Aggregated Intel Feed</div>
                {(loading&&!filteredFeed.length)?[...Array(5)].map((_,i)=><div key={i} style={{background:T.mid,height:65,borderRadius:5,marginBottom:7,opacity:.4}}/>)
                  :filteredFeed.slice(1,40).map(item=><FeedCard key={item.id} item={item}/>)}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="card">
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:12}}>Sentiment Distribution</div>
                  <SentBar label="Energy Trends" color={T.secondary} pct={Math.round((sentCounts.POSITIVE+sentCounts.STABLE)/Math.max(allItems.length,1)*100)}/>
                  <SentBar label="Regional Security" color={T.tertiary} pct={Math.round(sentCounts.WARNING/Math.max(allItems.length,1)*100)}/>
                  <SentBar label="Critical Alerts" color={T.error} pct={Math.round(sentCounts.CRITICAL/Math.max(allItems.length,1)*100)}/>
                </div>
                <div className="card">
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:10}}>Live Updates</div>
                  {allItems.slice(0,4).map(item=>(
                    <div key={item.id} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:11,paddingBottom:11,borderBottom:`1px solid ${T.outVar}18`}}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:sentColor(item.sentiment?.label),flexShrink:0,marginTop:4}}/>
                      <div><div style={{fontSize:11,fontWeight:600,lineHeight:1.35,marginBottom:2}}>{item.title}</div>
                      <div style={{fontSize:9,color:T.onVar}}>{item.source} · {ago(item.timestamp)}</div></div>
                    </div>))}
                </div>
                {weather&&<div className="card"><div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:6}}>Riyadh</div><div style={{fontFamily:"Manrope",fontSize:28,fontWeight:900,color:T.primary}}>{weather.temp}°C</div><div style={{fontSize:10,color:T.onVar,marginTop:3}}>Wind {weather.wind} km/h</div></div>}
              </div>
            </div>
          </div>
        )}

        {/* ── SOCIAL INTEL ─────────────────────────────────────────── */}
        {tab==="reddit"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
              <div>
                <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".2em",fontWeight:700,marginBottom:5}}>Public JSON · No Auth Required</div>
                <h1 style={{fontFamily:"Manrope",fontSize:30,fontWeight:900,letterSpacing:"-.5px"}}>Social Intelligence Pulse</h1>
                <p style={{color:T.onVar,fontSize:12,marginTop:5}}>{redditItems.length} posts · {REDDIT_SUBS.length} ME subreddits · reddit.com/r/sub.json</p>
              </div>
              <div style={{background:T.low,borderRadius:5,padding:"12px 16px",display:"flex",flexWrap:"wrap",gap:5,maxWidth:400}}>
                {REDDIT_SUBS.map(s=>(<span key={s.sub} style={{fontSize:9,padding:"2px 6px",borderRadius:3,fontWeight:700,background:redditStatus[s.sub]==="active"?`${T.secCont}25`:`${T.errCont}25`,color:redditStatus[s.sub]==="active"?T.secondary:T.error}}>{s.flag} r/{s.sub}</span>))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:18}}>
              {[["Posts",redditItems.length,"#ff6314"],["Positive",redditItems.filter(i=>["POSITIVE","STABLE"].includes(i.sentiment?.label)).length,T.secondary],["Critical",redditItems.filter(i=>i.sentiment?.label==="CRITICAL").length,T.error],["Avg Score",Math.round(redditItems.reduce((s,i)=>s+i.score,0)/Math.max(redditItems.length,1)),T.tertiary],["Active Subs",Object.values(redditStatus).filter(s=>s==="active").length,T.primary]].map(([l,v,col])=>(
                <div key={l} style={{background:T.low,borderRadius:5,padding:"12px 14px",borderTop:`2px solid ${col}`}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.onVar,marginBottom:4}}>{l}</div>
                  <div style={{fontFamily:"Manrope",fontSize:20,fontWeight:900,color:col}}>{v}</div>
                </div>))}
            </div>
            <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>{["ALL","CRITICAL","WARNING","POSITIVE","STABLE","NEUTRAL"].map(f=>(<button key={f} className={`chip${redditFilter===f?" on":""}`} onClick={()=>setRedditFilter(f)}>{f}</button>))}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:14}}>
              <div>
                {redditLoading&&!redditItems.length?[...Array(6)].map((_,i)=><div key={i} style={{background:T.mid,height:65,borderRadius:5,marginBottom:7,opacity:.4}}/>)
                  :filteredReddit.slice(0,50).map(item=><FeedCard key={item.id} item={item}/>)}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div className="card">
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:10}}>Posts by Country</div>
                  {REDDIT_SUBS.filter(s=>s.country!=="Regional").map(s=>{const cnt=redditItems.filter(i=>i.country===s.country).length;return(<div key={s.sub} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11}}>{s.flag} {s.country}</span><span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:"#ff6314",fontWeight:700}}>{cnt}</span></div>);})}
                </div>
                <div style={{background:T.low,borderRadius:5,padding:"12px 14px",borderLeft:"3px solid #ff6314"}}>
                  <div style={{fontSize:9,fontWeight:800,color:"#ff6314",letterSpacing:".12em",textTransform:"uppercase",marginBottom:5}}>Public JSON</div>
                  <p style={{fontSize:11,color:T.onVar,lineHeight:1.6}}>No OAuth or key. Appends <code style={{background:T.high,padding:"1px 4px",borderRadius:3,color:"#ff6314"}}>.json</code> to Reddit URLs — e.g. reddit.com/r/UAE<strong>.json</strong></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── COUNTRIES ────────────────────────────────────────────── */}
        {tab==="country"&&(
          <div>
            {[["GCC","GCC"],["Levant","Levant"],["N.Africa","North Africa"],["Other","Other MENA"]].map(([grp,label])=>(
              <div key={grp} style={{marginBottom:10}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:5}}>{label}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {MENA_COUNTRIES.filter(c=>c.group===grp&&c.id!=="Regional").map(c=>(
                    <button key={c.id} className={`cbtn${activeCountry===c.id?" active":""}`} onClick={()=>setActiveCountry(c.id)}>{c.flag} {c.id}</button>))}
                </div>
              </div>))}
            {(()=>{
              const c=COUNTRY_MAP[activeCountry];const cd=cData(activeCountry);
              const col=cd.avg>0.2?T.secondary:cd.avg<-0.2?T.error:T.tertiary;
              const topSec=Object.entries(cd.items.reduce((a,i)=>{a[i.section]=(a[i.section]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1])[0];
              const sentMap={};cd.items.forEach(i=>{const l=i.sentiment?.label||"NEUTRAL";sentMap[l]=(sentMap[l]||0)+1;});
              return(<div style={{marginTop:18}}>
                <div style={{background:T.low,borderRadius:7,padding:"24px 28px",marginBottom:18,display:"grid",gridTemplateColumns:"1fr auto",gap:20,alignItems:"center",backgroundImage:`linear-gradient(135deg,${T.low} 60%,${col}10 100%)`}}>
                  <div><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                    <span style={{fontSize:44}}>{c?.flag||"🌍"}</span>
                    <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <h2 style={{fontFamily:"Manrope",fontSize:26,fontWeight:900,letterSpacing:"-.5px"}}>{activeCountry}</h2>
                      <span style={{fontSize:9,fontWeight:800,padding:"3px 10px",borderRadius:3,background:`${col}20`,color:col,letterSpacing:".1em"}}>{cd.dominant==="POSITIVE"||cd.dominant==="STABLE"?"ACTIVE WATCH":cd.dominant==="CRITICAL"?"CRITICAL ALERT":"MONITORING"}</span>
                    </div>
                    <p style={{fontSize:12,color:T.onVar}}>Strategic Pulse: {c?.group||"MENA"} · {cd.count} signals</p></div>
                  </div>
                  {topSec&&<div style={{fontSize:12,color:T.onVar}}>Top: <span style={{color:secColor(topSec[0]),fontWeight:700}}>{SECTIONS[topSec[0]]?.label}</span></div>}
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:".2em",color:T.onVar,marginBottom:5}}>Aggregate Activity Score</div>
                    <div style={{fontFamily:"Manrope",fontSize:52,fontWeight:900,color:col,lineHeight:1}}>{Math.min(99,Math.max(10,50+Math.round(cd.avg*40)))}</div>
                    <div style={{fontSize:10,color:`${col}99`,fontWeight:700}}>{cd.avg>0?`+${(cd.avg*100).toFixed(1)}%`:`${(cd.avg*100).toFixed(1)}%`}</div>
                  </div>
                </div>
                {cd.items.length===0?(
                  <div style={{color:T.onVar,textAlign:"center",padding:40,background:T.low,borderRadius:6}}>No signals for {activeCountry}. Try "Bulk 30d" or Refresh.</div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:14}}>
                    <div>
                      <div className="card" style={{marginBottom:12}}>
                        <div style={{fontFamily:"Manrope",fontSize:15,fontWeight:800,marginBottom:4}}>Strategic Activity Timeline</div>
                        <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".1em",marginBottom:14}}>Incident Intensity Index — Last 7 Days</div>
                        <div style={{display:"flex",alignItems:"flex-end",gap:5,height:70,marginBottom:6}}>
                          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day,i)=>{const h=35+Math.sin(i+cd.items.length*0.3)*25;const active=i===new Date().getDay()-1;return(
                            <div key={day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                              <div style={{width:"100%",background:active?T.primary:`${T.primary}33`,borderRadius:"2px 2px 0 0",height:`${h}px`}}/>
                              <span style={{fontSize:7,color:active?T.onSurf:T.onVar,fontWeight:active?700:400}}>{day}</span>
                            </div>);})}
                        </div>
                      </div>
                      <div className="card">
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                          <div style={{fontFamily:"Manrope",fontSize:14,fontWeight:800,display:"flex",alignItems:"center",gap:7}}>
                            <span className="ms" style={{fontSize:16,color:T.secondary}}>bolt</span>Intelligence Pulse Feed</div>
                          <span style={{fontSize:9,color:T.secondary,fontWeight:700,letterSpacing:".1em"}}>REAL-TIME</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                          {cd.items.slice(0,4).map(item=>(<div key={item.id} style={{background:T.low,borderRadius:4,padding:"11px 13px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                              <span style={{fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:3,background:sentBg(item.sentiment?.label),color:sentColor(item.sentiment?.label)}}>{item.sentiment?.label}</span>
                              <span style={{fontSize:8,color:T.onVar}}>{ago(item.timestamp)}</span></div>
                            <div style={{fontSize:11,fontWeight:700,lineHeight:1.3,marginBottom:5}}>{item.title}</div>
                            <div style={{fontSize:8,color:T.onVar,textTransform:"uppercase",letterSpacing:".08em",fontWeight:700}}>{item.source}</div>
                          </div>))}
                        </div>
                        {cd.items.slice(4,14).map(item=><FeedCard key={item.id} item={item}/>)}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <div className="card">
                        <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:10}}>Economic Indicators</div>
                        {[["TASI/DFM",fx?.aed?(fx.aed*3000).toFixed(0):"—","+1.4%",T.secondary],["Energy Exports","7.2M BPD","-0.8%",T.tertiary],["FDI Inflow","$1.42B","+22% YoY",T.secondary]].map(([l,v,ch,col])=>(
                          <div key={l} style={{marginBottom:10}}><div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".1em",marginBottom:2}}>{l}</div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:"Manrope",fontSize:16,fontWeight:900}}>{v}</span><span style={{fontSize:10,color:col,fontWeight:700}}>{ch}</span></div></div>))}
                      </div>
                      <div className="card">
                        <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:10}}>Sentiment</div>
                        {[["POSITIVE",T.secondary],["STABLE",T.primary],["WARNING",T.tertiary],["CRITICAL",T.error]].map(([l,col])=>(<SentBar key={l} label={l} color={col} pct={cd.items.length?Math.round(((sentMap[l]||0)/cd.items.length)*100):0}/>))}
                      </div>
                      <div className="card">
                        <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:8}}>Top Topics</div>
                        {Object.entries(cd.items.reduce((a,i)=>{a[i.section]=(a[i.section]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([s,n])=>(
                          <div key={s} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:11}}>{SECTIONS[s]?.label||s}</span><span style={{fontSize:11,color:secColor(s),fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{n}</span></div>))}
                      </div>
                    </div>
                  </div>
                )}
              </div>);
            })()}
          </div>
        )}

        {/* ── ANALYSIS ─────────────────────────────────────────────── */}
        {tab==="analysis"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
              <div>
                <h1 style={{fontFamily:"Manrope",fontSize:30,fontWeight:900,letterSpacing:"-.5px"}}>Trend Analysis</h1>
                <p style={{color:T.onVar,fontSize:13,marginTop:5,maxWidth:480}}>Advanced metrics for key MENA themes · {allItems.length} signals · {MENA_COUNTRIES.length-1} countries monitored</p>
              </div>
              {lastRefresh&&<div style={{fontSize:10,color:T.onVar,fontFamily:"'JetBrains Mono',monospace",background:T.mid,padding:"7px 12px",borderRadius:4}}>📅 30d window · {lastRefresh.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:14,marginBottom:14}}>
              <div className="card">
                <div style={{fontFamily:"Manrope",fontSize:16,fontWeight:800,marginBottom:3}}>Mention Impact Evolution</div>
                <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".12em",marginBottom:12}}>Last 30 Days Intelligence Volume</div>
                <div style={{display:"flex",gap:10,marginBottom:12}}>
                  {Object.entries(SECTIONS).slice(0,3).map(([s,{color:col,label}])=>(<div key={s} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:7,height:7,borderRadius:"50%",background:col}}/><span style={{fontSize:10,color:T.onVar,fontWeight:600}}>{label.split(" ")[0]}</span></div>))}
                </div>
                <svg width="100%" height="140" viewBox="0 0 600 140" preserveAspectRatio="none">
                  {[0,35,70,105].map(y=><line key={y} x1="0" y1={y} x2="600" y2={y} stroke={`${T.outVar}22`} strokeWidth="1"/>)}
                  <polyline points="0,110 60,90 120,100 180,50 240,35 300,48 360,70 420,42 480,62 540,38 600,25" fill="none" stroke={T.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".85"/>
                  <polyline points="0,70 60,75 120,60 180,80 240,65 300,55 360,60 420,70 480,50 540,45 600,42" fill="none" stroke={T.tertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".85"/>
                  <polyline points="0,90 60,80 120,85 180,70 240,78 300,75 360,65 420,80 480,75 540,70 600,65" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".85"/>
                  <line x1="540" y1="0" x2="540" y2="140" stroke={T.primary} strokeWidth="1" strokeDasharray="3 3" opacity=".4"/>
                  <text x="542" y="10" fill={T.primary} fontSize="7" fontFamily="Inter" fontWeight="700">TODAY</text>
                </svg>
              </div>
              <div className="card">
                <div style={{fontFamily:"Manrope",fontSize:15,fontWeight:800,marginBottom:3}}>Intelligence Volume</div>
                <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".12em",marginBottom:14}}>By Geographic Priority</div>
                <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
                  <div style={{width:90,height:90,borderRadius:"50%",background:`conic-gradient(${T.primary} 0% 42%,${T.secondary} 42% 70%,${T.tertiary} 70% 85%,${T.outVar}44 85% 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{width:62,height:62,borderRadius:"50%",background:T.mid,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontFamily:"Manrope",fontSize:16,fontWeight:900}}>{allItems.length>999?`${(allItems.length/1000).toFixed(1)}k`:allItems.length}</div>
                      <div style={{fontSize:6,color:T.onVar,textTransform:"uppercase"}}>Total</div>
                    </div>
                  </div>
                </div>
                {MENA_COUNTRIES.filter(c=>["Saudi Arabia","UAE","Qatar","Egypt","Israel"].includes(c.id)).map(c=>{const cnt=allItems.filter(i=>i.country===c.id).length;const pct=allItems.length?Math.round(cnt/allItems.length*100):0;return(<div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:12}}>{c.flag}</span><span style={{fontSize:11,fontWeight:600}}>{c.id}</span></div><span style={{fontSize:11,fontWeight:800,color:T.primary,fontFamily:"'JetBrains Mono',monospace"}}>{pct}%</span></div>);})}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div className="card">
                <div style={{fontFamily:"Manrope",fontSize:15,fontWeight:800,marginBottom:3}}>Sentiment: Cross-Border Analysis</div>
                <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".12em",marginBottom:14}}>
                  <span style={{color:T.secondary,marginRight:10}}>POSITIVE</span><span style={{color:T.onVar,marginRight:10}}>NEUTRAL</span><span style={{color:T.error}}>NEGATIVE</span>
                </div>
                {MENA_COUNTRIES.filter(c=>["UAE","Saudi Arabia","Israel","Jordan","Egypt","Iraq"].includes(c.id)).map(c=>{
                  const ci=allItems.filter(i=>i.country===c.id);if(!ci.length)return null;
                  const pos=ci.filter(i=>["POSITIVE","STABLE"].includes(i.sentiment?.label)).length;
                  const neg=ci.filter(i=>["CRITICAL","WARNING"].includes(i.sentiment?.label)).length;
                  const posP=Math.round(pos/ci.length*100);const negP=Math.round(neg/ci.length*100);
                  const dom=posP>60?"HIGHLY FAVORABLE":posP>40?"PRAGMATIC":negP>40?"CAUTIOUS":"EMERGING";
                  return(<div key={c.id} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>{c.id}</span><span style={{fontSize:10,color:posP>50?T.secondary:T.tertiary,fontWeight:700}}>{dom}</span></div>
                    <div style={{height:4,background:T.high,borderRadius:2,overflow:"hidden",display:"flex"}}><div style={{width:`${posP}%`,background:T.secondary,transition:"width .6s"}}/><div style={{width:`${100-posP-negP}%`,background:T.outVar}}/><div style={{width:`${negP}%`,background:T.error,transition:"width .6s"}}/></div>
                  </div>);})}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {allItems.filter(i=>i.sentiment?.label==="CRITICAL").slice(0,2).map(item=>(
                  <div key={item.id} style={{background:`${T.errCont}22`,borderRadius:5,padding:"14px 16px",border:`1px solid ${T.error}22`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:9,fontWeight:800,background:T.errCont,color:T.error,padding:"2px 8px",borderRadius:3,letterSpacing:".08em"}}>CRITICAL ALERT</span><span style={{fontSize:9,color:T.onVar}}>{ago(item.timestamp)}</span></div>
                    <div style={{fontFamily:"Manrope",fontSize:13,fontWeight:800,lineHeight:1.3,marginBottom:6}}>{item.title}</div>
                    {item.summary&&<p style={{fontSize:10,color:T.onVar,lineHeight:1.6,marginBottom:8}}>{item.summary}</p>}
                    <div style={{fontSize:9,color:T.onVar}}>{COUNTRY_MAP[item.country]?.flag||"🌍"} {item.source}</div>
                  </div>))}
                {brief&&!brief._error&&(
                  <div style={{background:`${T.priCont}22`,borderRadius:5,padding:"14px 16px",border:`1px solid ${T.primary}22`,flex:1}}>
                    <div style={{fontSize:9,fontWeight:800,color:T.secondary,letterSpacing:".12em",textTransform:"uppercase",marginBottom:7}}>AI TREND UPDATE</div>
                    <div style={{fontFamily:"Manrope",fontSize:13,fontWeight:800,marginBottom:7}}>{brief.topTheme}</div>
                    <p style={{fontSize:11,color:T.onVar,lineHeight:1.6}}>{brief.summary}</p>
                  </div>)}
              </div>
            </div>
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontFamily:"Manrope",fontSize:17,fontWeight:800}}>Predictive Topic Momentum</div>
                <div style={{display:"flex",gap:6}}><button className="ghost" style={{fontSize:9}}>Filter: High Impact</button><button className="ghost" style={{fontSize:9}}>Sort: Probability</button></div>
              </div>
              <div style={{background:T.high,padding:"9px 14px",borderRadius:"4px 4px 0 0",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:10,fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:T.onVar}}>
                <span>Strategic Topic</span><span>Regional Weight</span><span>Sentiment Shift</span><span>Confidence</span><span>Impact</span>
              </div>
              {Object.entries(secCounts).sort((a,b)=>b[1]-a[1]).map(([sec,cnt],i)=>{
                const arr=allItems.filter(x=>x.section===sec);const avgS=arr.length?arr.reduce((s,x)=>s+(x.sentiment?.score||0),0)/arr.length:0;
                const shift=avgS>0?`+${(avgS*10).toFixed(1)}%`:`${(avgS*10).toFixed(1)}%`;const shiftCol=avgS>0.2?T.secondary:avgS<-0.2?T.error:T.onVar;
                const impacts=["Systemic Economic","Supply Chain","Diplomatic","Regional Security","Tech Disruption"];
                return(<div key={sec} className="srow" style={{padding:"12px 14px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:10,alignItems:"center",borderTop:`1px solid ${T.outVar}18`,transition:"background .15s",cursor:"pointer"}}>
                  <div><div style={{fontSize:12,fontWeight:700}}>{SECTIONS[sec]?.label||sec}</div><div style={{fontSize:9,color:T.onVar,marginTop:2}}>Topic #{(1000+i*111).toString(16).toUpperCase()}</div></div>
                  <div style={{display:"flex",gap:2}}>{[...Array(5)].map((_,j)=>(<div key={j} style={{width:8,height:8,borderRadius:2,background:j<Math.ceil(cnt/Math.max(...Object.values(secCounts))*5)?T.primary:`${T.primary}22`}}/>))}</div>
                  <span style={{fontSize:11,fontWeight:800,color:shiftCol,fontFamily:"'JetBrains Mono',monospace"}}>{shift}</span>
                  <div style={{height:3,background:T.high,borderRadius:2,overflow:"hidden",width:"80%"}}><div style={{width:`${40+i*10}%`,height:"100%",background:T.primary,borderRadius:2}}/></div>
                  <span style={{fontSize:10,color:T.onVar,fontWeight:600}}>{impacts[i%impacts.length]}</span>
                </div>);})}
            </div>
          </div>
        )}

        {/* ── SOURCES ──────────────────────────────────────────────── */}
        {tab==="sources"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
              <div>
                <h1 style={{fontFamily:"Manrope",fontSize:30,fontWeight:900,letterSpacing:"-.5px"}}>Source Management</h1>
                <p style={{color:T.onVar,fontSize:13,marginTop:5,maxWidth:560}}>Configure regional monitoring ingestions for MENA. All sources are free & keyless except Gemini AI.</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="ghost">Filter</button>
                <button className="cta" style={{display:"flex",alignItems:"center",gap:5}}><span className="ms" style={{fontSize:15,color:T.base}}>add_circle</span>Add New Source</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:18}}>
              <div>
                <div style={{background:T.mid,borderRadius:6,overflow:"hidden",marginBottom:14}}>
                  <div style={{background:T.high,padding:"10px 16px",display:"grid",gridTemplateColumns:"2.5fr 1fr 1fr 1fr 70px",gap:10,fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:T.onVar}}>
                    <span>Source Name</span><span>Platform</span><span>Frequency</span><span>Status</span><span style={{textAlign:"right"}}>Signals</span>
                  </div>
                  {[
                    ...RSS_SOURCES.map(s=>({name:s.label,icon:"rss_feed",iconCol:T.tertiary,type:"RSS Feed",freq:"HOURLY",statusKey:s.id,srcType:"RSS",count:items.filter(i=>i.source===s.label).length})),
                    {name:"Hacker News Algolia",icon:"whatshot",iconCol:"#f97316",type:"REST API",freq:"LIVE",statusKey:"hackernews",srcType:"HN",count:items.filter(i=>i.sourceType==="HN").length},
                    {name:"Open-Meteo Weather",icon:"cloud",iconCol:T.primary,type:"REST API",freq:"HOURLY",statusKey:"weather",srcType:"GEO",count:weather?1:0},
                    {name:"ExchangeRate-API",icon:"currency_exchange",iconCol:T.secondary,type:"REST API",freq:"HOURLY",statusKey:"fx",srcType:"FX",count:fx?4:0},
                    ...REDDIT_SUBS.map(s=>({name:`r/${s.sub}`,icon:"forum",iconCol:"#ff6314",type:"Public JSON",freq:"LIVE",statusKey:s.sub,srcType:"Reddit",count:redditItems.filter(i=>i.source===`r/${s.sub}`).length})),
                    {name:"Gemini 2.5 Flash",icon:"auto_awesome",iconCol:T.primary,type:"Serverless AI",freq:"ON DEMAND",statusKey:"gemini",srcType:"AI",count:brief&&!brief._error?1:0},
                    {name:"/api/ingest (Bulk)",icon:"history",iconCol:T.tertiary,type:"Serverless",freq:"MANUAL",statusKey:"bulk",srcType:"BULK",count:bulkMeta?.totalFiltered||0},
                  ].map((src,i)=>{
                    const status=src.srcType==="Reddit"?(redditStatus[src.statusKey]||"—"):src.srcType==="AI"?(brief&&!brief._error?"active":"—"):src.srcType==="BULK"?(bulkMeta?"active":"—"):src.srcType==="GEO"?(weather?"active":"—"):src.srcType==="FX"?(fx?"active":"—"):(srcStatuses[src.statusKey]||"—");
                    const freqCol=src.freq==="LIVE"?T.secondary:src.freq==="HOURLY"?T.primary:T.onVar;
                    return(<div key={src.name} className="srow" style={{padding:"11px 16px",display:"grid",gridTemplateColumns:"2.5fr 1fr 1fr 1fr 70px",gap:10,alignItems:"center",borderTop:i>0?`1px solid ${T.outVar}15`:"none",transition:"background .15s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:30,height:30,borderRadius:"50%",background:`${src.iconCol}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span className="ms" style={{fontSize:15,color:src.iconCol}}>{src.icon}</span></div>
                        <span style={{fontWeight:600,fontSize:12}}>{src.name}</span>
                      </div>
                      <span style={{fontSize:11,color:T.onVar}}>{src.type}</span>
                      <span style={{fontSize:9,fontWeight:800,background:`${freqCol}22`,color:freqCol,padding:"2px 7px",borderRadius:3,letterSpacing:".08em",width:"fit-content"}}>{src.freq}</span>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:status==="active"?T.secondary:status==="warn"?T.tertiary:T.outVar,boxShadow:status==="active"?`0 0 5px ${T.secondary}88`:""}}/>
                        <span style={{fontSize:10,fontWeight:700,color:status==="active"?T.secondary:status==="warn"?T.tertiary:T.onVar}}>{status==="active"?"Active":status==="warn"?"Partial":"—"}</span>
                      </div>
                      <span style={{fontSize:12,fontWeight:800,color:srcColor(src.srcType),fontFamily:"'JetBrains Mono',monospace",textAlign:"right"}}>{src.count>0?src.count:"—"}</span>
                    </div>);
                  })}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                  {[["Avg. Ingestion","4.2 msg/sec","↑ 12%",T.secondary,"speed"],["Active Sources",`${Object.values(srcStatuses).filter(s=>s==="active").length+Object.values(redditStatus).filter(s=>s==="active").length} / 150`,"",T.primary,"hub"],["System Health","Optimal","",T.secondary,"check_circle"]].map(([l,v,ch,col,ic])=>(
                    <div key={l} className="card"><div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:8}}>{l}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><span className="ms" style={{fontSize:16,color:col}}>{ic}</span><span style={{fontFamily:"Manrope",fontSize:20,fontWeight:900,color:col}}>{v}</span></div>
                    {ch&&<div style={{fontSize:10,color:T.secondary,marginTop:4,fontWeight:700}}>{ch}</div>}</div>))}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="card">
                  <div style={{fontFamily:"Manrope",fontSize:14,fontWeight:800,color:T.primary,marginBottom:12}}>User Profile</div>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(45deg,${T.priCont},${T.primary})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span className="ms" style={{color:T.base,fontSize:18}}>account_circle</span></div>
                    <div><div style={{fontWeight:700,fontSize:12}}>Commander_01</div><div style={{fontSize:10,color:T.onVar}}>Senior Regional Analyst</div></div>
                  </div>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:6}}>Notification Level</div>
                  <div style={{background:T.high,borderRadius:3,padding:"7px 10px",fontSize:11,color:T.onSurf,marginBottom:10}}>Critical Only ▾</div>
                  {[["Sound Alerts",true],["2FA Required",true]].map(([l,on])=>(<div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:11}}>{l}</span><div style={{width:28,height:14,borderRadius:7,background:T.secondary,position:"relative"}}><div style={{position:"absolute",right:2,top:1,width:12,height:12,borderRadius:"50%",background:"white"}}/></div></div>))}
                </div>
                <div className="card">
                  <div style={{fontFamily:"Manrope",fontSize:14,fontWeight:800,color:T.primary,marginBottom:12}}>Add Source</div>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:6}}>Source Type</div>
                  <div style={{display:"flex",gap:5,marginBottom:12}}><button className="cta" style={{flex:1,fontSize:10,padding:"8px"}}>RSS FEED</button><button className="ghost" style={{flex:1,fontSize:10,padding:"8px"}}>SOCIAL</button></div>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:5}}>Endpoint URL</div>
                  <input placeholder="https://api.source.com/v1" style={{width:"100%",background:T.low,border:"none",borderRadius:3,padding:"8px 10px",color:T.onSurf,fontSize:11,outline:"none",marginBottom:10}}/>
                  <button className="cta" style={{width:"100%",padding:"10px",fontSize:10}}>VALIDATE &amp; ADD</button>
                </div>
                <div style={{background:T.low,borderRadius:5,padding:"12px 14px",border:`1px solid ${T.primary}15`}}>
                  <div style={{display:"flex",gap:7,alignItems:"flex-start"}}>
                    <span className="ms" style={{fontSize:17,color:T.primary,flexShrink:0}}>info</span>
                    <div><div style={{fontSize:11,fontWeight:700,color:T.primary,marginBottom:3}}>Ingestion Tip</div>
                    <p style={{fontSize:11,color:T.onVar,lineHeight:1.6}}>For government sources in the Gulf, use real-time frequency to ensure minimum latency for geopolitical alerts.</p></div>
                  </div>
                </div>
                {brief&&!brief._error&&(
                  <div style={{background:`${T.priCont}22`,borderRadius:5,padding:"14px 16px",border:`1px solid ${T.primary}22`}}>
                    <div style={{fontSize:9,fontWeight:800,color:T.primary,letterSpacing:".12em",textTransform:"uppercase",marginBottom:7}}>AI Brief</div>
                    <div style={{fontFamily:"Manrope",fontSize:12,fontWeight:800,marginBottom:5}}>{brief.topTheme}</div>
                    <span style={{fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:3,background:brief.threatLevel==="CRITICAL"?`${T.errCont}44`:`${T.priCont}44`,color:brief.threatLevel==="CRITICAL"?T.error:T.primary,letterSpacing:".06em",display:"inline-block",marginBottom:7}}>{brief.threatLevel||"MODERATE"}</span>
                    <p style={{fontSize:10,color:T.onVar,lineHeight:1.6}}>{brief.summary}</p>
                    <button className="ghost" style={{marginTop:8,width:"100%",fontSize:10}} onClick={()=>{setBriefLoading(true);fetchGemini(allItems).then(b=>{setBrief(b);setBriefLoading(false);});}}>⟳ {briefLoading?"Analysing…":"Regenerate"}</button>
                  </div>)}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer style={{background:T.base,borderTop:`1px solid ${T.outVar}15`,padding:"7px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{fontSize:9,color:`${T.onVar}55`}}>© 2026 STRATEGIC EYE · MENA INTELLIGENCE · {MENA_COUNTRIES.length-1} COUNTRIES · CLEARANCE: L-ALPHA-5</div>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          <span style={{fontSize:9,color:T.secondary,fontWeight:700,display:"flex",alignItems:"center",gap:4}}><span className="live" style={{width:4,height:4,borderRadius:"50%",background:T.secondary}}/>SYSTEM ONLINE</span>
          <span style={{fontSize:9,color:T.onVar,fontFamily:"'JetBrains Mono',monospace"}}>{allItems.length} SIGNALS</span>
          <span style={{fontSize:9,color:T.onVar}}>AI: GEMINI 2.5 FLASH</span>
        </div>
      </footer>
    </div>
  );
}
