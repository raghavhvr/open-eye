import{useState,useEffect,useRef,useCallback}from"react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T={
  base:"#060e20",surface:"#0b1326",low:"#131b2e",mid:"#171f33",
  high:"#222a3d",highest:"#2d3449",
  primary:"#b4c5ff",priCont:"#003188",
  secondary:"#4edea3",secCont:"#00a572",
  tertiary:"#ffb95f",terCont:"#513100",
  error:"#ffb4ab",errCont:"#93000a",
  lottery:"#e879f9",lotCont:"#7e22ce",
  onSurf:"#dae2fd",onVar:"#c3c7ce",outline:"#8d9198",outVar:"#43474d",
};

// ─── MENA COUNTRIES ──────────────────────────────────────────────────────────
const MENA_COUNTRIES=[
  {id:"UAE",         label:"UAE",  flag:"🇦🇪",group:"GCC",    x:66,y:52,keywords:["uae","dubai","abu dhabi","emirati","sharjah","ajman"]},
  {id:"Saudi Arabia",label:"KSA",  flag:"🇸🇦",group:"GCC",    x:52,y:51,keywords:["saudi","riyadh","jeddah","aramco","ksa","mecca","neom"]},
  {id:"Qatar",       label:"QAT",  flag:"🇶🇦",group:"GCC",    x:62,y:52,keywords:["qatar","doha","qatari"]},
  {id:"Kuwait",      label:"KUW",  flag:"🇰🇼",group:"GCC",    x:60,y:43,keywords:["kuwait","kuwaiti"]},
  {id:"Oman",        label:"OMN",  flag:"🇴🇲",group:"GCC",    x:70,y:57,keywords:["oman","muscat","omani"]},
  {id:"Bahrain",     label:"BHR",  flag:"🇧🇭",group:"GCC",    x:63,y:47,keywords:["bahrain","manama"]},
  {id:"Jordan",      label:"JOR",  flag:"🇯🇴",group:"Levant", x:54,y:42,keywords:["jordan","amman","jordanian"]},
  {id:"Lebanon",     label:"LBN",  flag:"🇱🇧",group:"Levant", x:52,y:38,keywords:["lebanon","beirut","lebanese"]},
  {id:"Syria",       label:"SYR",  flag:"🇸🇾",group:"Levant", x:55,y:35,keywords:["syria","damascus","aleppo","syrian"]},
  {id:"Iraq",        label:"IRQ",  flag:"🇮🇶",group:"Levant", x:62,y:37,keywords:["iraq","baghdad","iraqi","basra","mosul"]},
  {id:"Palestine",   label:"PSE",  flag:"🇵🇸",group:"Levant", x:51,y:41,keywords:["palestine","gaza","west bank","hamas","palestinian"]},
  {id:"Israel",      label:"ISR",  flag:"🇮🇱",group:"Levant", x:51,y:41,keywords:["israel","tel aviv","jerusalem","idf"]},
  {id:"Egypt",       label:"EGY",  flag:"🇪🇬",group:"N.Africa",x:44,y:47,keywords:["egypt","cairo","egyptian","suez","alexandria"]},
  {id:"Libya",       label:"LBY",  flag:"🇱🇾",group:"N.Africa",x:35,y:43,keywords:["libya","tripoli","benghazi","libyan"]},
  {id:"Tunisia",     label:"TUN",  flag:"🇹🇳",group:"N.Africa",x:29,y:38,keywords:["tunisia","tunis","tunisian"]},
  {id:"Algeria",     label:"DZA",  flag:"🇩🇿",group:"N.Africa",x:24,y:38,keywords:["algeria","algiers","algerian"]},
  {id:"Morocco",     label:"MAR",  flag:"🇲🇦",group:"N.Africa",x:18,y:37,keywords:["morocco","rabat","casablanca","moroccan"]},
  {id:"Sudan",       label:"SDN",  flag:"🇸🇩",group:"N.Africa",x:46,y:60,keywords:["sudan","khartoum","sudanese"]},
  {id:"Yemen",       label:"YEM",  flag:"🇾🇪",group:"Other",  x:58,y:63,keywords:["yemen","sanaa","houthi","yemeni","aden"]},
  {id:"Iran",        label:"IRN",  flag:"🇮🇷",group:"Other",  x:72,y:36,keywords:["iran","tehran","iranian","irgc"]},
  {id:"Regional",    label:"MENA", flag:"🌍", group:"Regional",x:50,y:50,keywords:["mena","middle east","arab","gulf","gcc"]},
];
const COUNTRY_MAP=Object.fromEntries(MENA_COUNTRIES.map(c=>[c.id,c]));

// ─── SECTIONS ─────────────────────────────────────────────────────────────────
const SECTIONS={
  "🚨 Crisis":  {color:"#ef4444",label:"Crisis & Safety",     keywords:["war","conflict","ceasefire","attack","bomb","fire","flood","storm","houthi","missile","casualties","killed","explosion","earthquake","pandemic","virus","outbreak","airstrike","siege","displaced"]},
  "💼 Economy": {color:"#ffb95f",label:"Economy & Business",  keywords:["oil","opec","economy","gdp","inflation","market","investment","trade","startup","fund","aramco","adnoc","property","rent","salary","job","tourism","vision 2030","neom","stock","revenue","ipo"]},
  "🏛️ Politics":{color:"#b4c5ff",label:"Politics & Governance",keywords:["government","minister","policy","election","parliament","diplomacy","sanction","treaty","reform","law","decree","summit","president","prime minister","royal","cabinet","geopolitics","nuclear","coup"]},
  "🌐 Expat":   {color:"#4edea3",label:"Expat & Daily Life",  keywords:["visa","expat","cost of living","iqama","golden visa","traffic","metro","food","restaurant","transport","immigration","residency","permit","school","healthcare","grocery"]},
  "🕌 Culture": {color:"#06b6d4",label:"Culture & Society",   keywords:["ramadan","eid","mosque","religion","entertainment","festival","education","university","women","sports","arts","culture","social","marriage","family","heritage"]},
  "💻 Tech":    {color:"#8b5cf6",label:"Tech & Innovation",   keywords:["ai","artificial intelligence","startup","tech","innovation","crypto","blockchain","smart city","5g","solar","renewable","fintech","digital","cybersecurity","g42","data center"]},
};

// ─── REDDIT & RSS SOURCES ─────────────────────────────────────────────────────
const RSS_SOURCES=[
  {id:"bbc-me",   label:"BBC Middle East",  url:"https://feeds.bbci.co.uk/news/world/middle_east/rss.xml"},
  {id:"aljazeera",label:"Al Jazeera",        url:"https://www.aljazeera.com/xml/rss/all.xml"},
  {id:"arabnews", label:"Arab News",         url:"https://www.arabnews.com/rss.xml"},
  {id:"guardian", label:"The Guardian",      url:"https://www.theguardian.com/world/rss"},
  {id:"gulfnews", label:"Gulf News",         url:"https://gulfnews.com/rss/uae"},
  {id:"national", label:"The National UAE",  url:"https://www.thenationalnews.com/rss/world.xml"},
  {id:"reuters",  label:"Reuters World",     url:"https://feeds.reuters.com/reuters/topNews"},
];
const REDDIT_SUBS=[
  {sub:"UAE",        country:"UAE",          flag:"🇦🇪",tag:"UAE"},
  {sub:"saudiarabia",country:"Saudi Arabia", flag:"🇸🇦",tag:"KSA"},
  {sub:"qatar",      country:"Qatar",        flag:"🇶🇦",tag:"QAT"},
  {sub:"Kuwait",     country:"Kuwait",       flag:"🇰🇼",tag:"KUW"},
  {sub:"jordan",     country:"Jordan",       flag:"🇯🇴",tag:"JOR"},
  {sub:"oman",       country:"Oman",         flag:"🇴🇲",tag:"OMN"},
  {sub:"bahrain",    country:"Bahrain",      flag:"🇧🇭",tag:"BAH"},
  {sub:"lebanon",    country:"Lebanon",      flag:"🇱🇧",tag:"LEB"},
  {sub:"iraq",       country:"Iraq",         flag:"🇮🇶",tag:"IRQ"},
  {sub:"egypt",      country:"Egypt",        flag:"🇪🇬",tag:"EGY"},
  {sub:"MiddleEast", country:"Regional",     flag:"🌍", tag:"ME"},
  {sub:"Arabs",      country:"Regional",     flag:"🌍", tag:"ARAB"},
];

// ─── SENTIMENT ENGINE ─────────────────────────────────────────────────────────
const POS_W=["growth","surge","record","success","deal","agreement","expands","boost","profit","milestone","launch","stable","peace","recovery","invest","improve","achieve","develop","partnership","innovation","win","hope","progress","rise","benefit","support","signed","approved"];
const NEG_W=["crisis","attack","conflict","warning","risk","decline","concern","tension","threat","sanction","collapse","killed","explosion","flood","fire","war","bomb","strike","missile","casualties","arrest","ban","shortage","debt","failure","violence","terrorism","hostage","dead","wounded","detained","airstrike","siege"];
const NEGS=["not","no","never","don't","doesn't","didn't","won't","can't","isn't","aren't","wasn't","without"];
function senti(text){
  if(!text)return{label:"NEUTRAL",score:0};
  const w=text.toLowerCase().split(/\W+/);let p=0,n=0;
  w.forEach((x,i)=>{const neg=NEGS.includes(w[i-1]||"");if(POS_W.includes(x))neg?n++:p++;if(NEG_W.includes(x))neg?p++:n++;});
  if(n>p+1)return{label:"CRITICAL",score:-2};if(n>p)return{label:"WARNING",score:-1};
  if(p>n+1)return{label:"POSITIVE",score:2};if(p>n)return{label:"STABLE",score:1};
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
// Lottery-specific classifier
const LOT_HOPEFUL=["win","winner","jackpot","lucky","dream","hope","million","tonight","ticket","chance","raffle","prize","draw","big","blessed","fortune","rich","wealth"];
const LOT_CYNICAL=["scam","fraud","rigged","impossible","never","waste","sucker","odds","cheat","fake","illegal","banned","haram","forbidden","corrupt"];
const LOT_ANXIOUS=["debt","desperate","lost","spent","need","last","only","please","help","poor","broke","struggling","crisis","worry","afford","family"];
function lotteryMood(text){
  const t=(text||"").toLowerCase();
  const h=LOT_HOPEFUL.filter(w=>t.includes(w)).length;
  const c=LOT_CYNICAL.filter(w=>t.includes(w)).length;
  const a=LOT_ANXIOUS.filter(w=>t.includes(w)).length;
  if(a>1)return{label:"ANXIOUS",color:"#f87171",bg:"#7f1d1d22"};
  if(c>h+1)return{label:"CYNICAL",color:T.tertiary,bg:"#51310022"};
  if(h>c+1)return{label:"HOPEFUL",color:T.lottery,bg:"#7e22ce22"};
  if(h>0)return{label:"HOPEFUL",color:T.lottery,bg:"#7e22ce22"};
  return{label:"NEUTRAL",color:T.onVar,bg:"#43474d22"};
}

// ─── DATA FETCHERS ────────────────────────────────────────────────────────────
async function fetchRSS(src){
  try{const res=await fetch("/api/rss",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:src.url})});
  const d=await res.json();if(!d.items||!Array.isArray(d.items))return[];
  return d.items.slice(0,8).map(item=>{const txt=item.title+" "+(item.summary||"");return{
    id:item.guid||item.link,title:item.title,summary:(item.summary||"").slice(0,220),url:item.link,
    timestamp:new Date(item.pubDate||Date.now()),source:src.label,sourceType:"RSS",tag:"NEWS",
    country:detectCountry(txt),section:classify(txt),sentiment:senti(txt),score:0,comments:0};});}
  catch{return[];}
}
// fetchSocialSignals — calls /api/social (Mastodon + Lemmy, no Reddit auth needed)
async function fetchSocialSignals(){
  try{
    const res=await fetch("/api/social",{method:"GET",signal:AbortSignal.timeout(30000)});
    if(!res.ok)throw new Error(`/api/social returned ${res.status}`);
    const d=await res.json();
    return{articles:d.articles||[],meta:d.meta||{}};
  }catch(e){
    console.warn("Social fetch failed:",e.message);
    return{articles:[],meta:{status:{mastodon:0,lemmy:0,total:0}}};
  }
}
async function fetchHackerNews(){
  const since=Math.floor(Date.now()/1000)-7*24*3600;
  const queries=["middle east","OPEC oil","UAE technology","Saudi Arabia","Gulf geopolitics","Israel Gaza","Iran nuclear","Egypt economy","Iraq security","MENA finance"];
  const all=[];const seen=new Set();
  await Promise.allSettled(queries.map(async(q)=>{
    try{const d=await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=5&numericFilters=created_at_i>${since}`).then(r=>r.json());
    for(const h of(d.hits||[])){if(!h.title||seen.has(h.objectID))continue;seen.add(h.objectID);
    all.push({id:"hn-"+h.objectID,title:h.title,summary:`${h.points||0} pts · ${h.num_comments||0} comments`,
      url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,timestamp:new Date(h.created_at),
      source:"Hacker News",sourceType:"HN",tag:"TECH",country:detectCountry(h.title),
      section:classify(h.title),sentiment:senti(h.title),score:h.points||0,comments:h.num_comments||0});}}
    catch{}
  }));
  return all;
}
async function fetchOpenMeteo(){try{const d=await fetch("https://api.open-meteo.com/v1/forecast?latitude=24.7136&longitude=46.6753&current=temperature_2m,wind_speed_10m&forecast_days=1").then(r=>r.json());return{temp:d.current?.temperature_2m,wind:d.current?.wind_speed_10m};}catch{return null;}}
async function fetchExchangeRate(){try{const d=await fetch("https://api.exchangerate-api.com/v4/latest/USD").then(r=>r.json());return{sar:d.rates?.SAR,aed:d.rates?.AED,qar:d.rates?.QAR,kwd:d.rates?.KWD};}catch{return null;}}
async function fetchGemini(items,mode="intelligence"){
  const headlines=items.slice(0,14).map(i=>i.title||i);
  try{const res=await fetch("/api/brief",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({headlines,mode})});
  const data=await res.json();if(!res.ok)return{_error:data.error||"API error"};return data;}
  catch(e){return{_error:e.message};}
}
async function fetchBulkIngest(onProgress){
  onProgress({stage:"Connecting to ingest pipeline…",pct:5});
  try{const res=await fetch("/api/ingest",{method:"GET",signal:AbortSignal.timeout(55000)});
  onProgress({stage:"Fetching RSS · Reddit · HN in parallel…",pct:30});
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||`HTTP ${res.status}`);}
  onProgress({stage:"Classifying sections & sentiment…",pct:70});
  const data=await res.json();onProgress({stage:"Complete — loading…",pct:95});return data;}
  catch(e){throw new Error(e.message);}
}
async function fetchLotterySignals(){
  try{const res=await fetch("/api/lottery",{method:"GET"});return await res.json();}
  catch{return{items:[],meta:{totalSignals:0,uncertaintyScore:75,moodDist:{HOPEFUL:0,CYNICAL:0,ANXIOUS:0,NEUTRAL:0},dominantMood:"NEUTRAL"}};}
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const ago=ts=>{const m=Math.floor((Date.now()-new Date(ts))/60000);return m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`;};
const secColor=s=>SECTIONS[s]?.color||T.outVar;
const sentColor=l=>l==="CRITICAL"?T.error:l==="WARNING"?T.tertiary:l==="POSITIVE"||l==="STABLE"?T.secondary:T.onVar;
const sentBg=l=>l==="CRITICAL"?`${T.errCont}55`:l==="WARNING"?`${T.terCont}55`:l==="POSITIVE"||l==="STABLE"?`${T.secCont}33`:`${T.outVar}33`;
const srcColor=t=>t==="Reddit"?"#ff6314":t==="RSS"?T.tertiary:t==="HN"?"#f97316":T.primary;
function calcPulse(items){if(!items.length)return 50;const c=items.filter(i=>i.sentiment?.label==="CRITICAL").length,w=items.filter(i=>i.sentiment?.label==="WARNING").length,p=items.filter(i=>i.sentiment?.label==="POSITIVE").length,s=items.filter(i=>i.sentiment?.label==="STABLE").length;return Math.min(98,Math.max(10,Math.round(50+(p*4+s*2)-(c*9+w*4))));}

// ─── SVG COMPONENTS ───────────────────────────────────────────────────────────
function PulseRing({score,loading,col}){
  const c=col||(score>65?T.secondary:score>40?T.primary:T.error);
  const r=46,cx=56,cy=56,circ=2*Math.PI*r;
  return(<svg width="112" height="112" viewBox="0 0 112 112">
    <circle cx={cx} cy={cy} r={r+6} fill="none" stroke={`${c}12`} strokeWidth="1"/>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.mid} strokeWidth="8"/>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth="8"
      strokeDasharray={`${(score/100)*circ} ${circ*(1-score/100)}`} strokeDashoffset={circ/4} strokeLinecap="round"
      style={{transition:"stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)",filter:`drop-shadow(0 0 8px ${c}88)`}}/>
    {loading?<text x={cx} y={cy+5} textAnchor="middle" fill={T.onVar} fontSize="11">…</text>
      :<><text x={cx} y={cy-3} textAnchor="middle" fill={c} fontSize="24" fontWeight="900" fontFamily="Manrope">{score}</text>
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
function FeedCard({item,lotteryMode}){
  const[exp,setExp]=useState(false);
  const sent=lotteryMode?lotteryMood(item.title):(item.sentiment||{label:"NEUTRAL",score:0});
  const sentLbl=lotteryMode?sent.label:(item.sentiment?.label||"NEUTRAL");
  const sc=secColor(item.section);const cI=COUNTRY_MAP[item.country]||{flag:"🌍"};
  return(<div onClick={()=>setExp(!exp)} style={{background:exp?T.high:T.mid,borderRadius:5,padding:"13px 15px",cursor:"pointer",transition:"background .15s",borderLeft:`3px solid ${lotteryMode?sent.color:sentColor(sentLbl)}`,marginBottom:7}}>
    <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"flex-start"}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:3,letterSpacing:".08em",background:lotteryMode?sent.bg:sentBg(sentLbl),color:lotteryMode?sent.color:sentColor(sentLbl)}}>{sentLbl}</span>
          {!lotteryMode&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${sc}20`,color:sc}}>{SECTIONS[item.section]?.label||item.section}</span>}
          {item.tag&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${T.priCont}44`,color:T.primary}}>{item.tag}</span>}
          <span style={{fontSize:10}}>{cI.flag}</span>
          {item.score>50&&<span style={{fontSize:9,color:T.secondary,fontWeight:700}}>↑{item.score}</span>}
        </div>
        <p style={{fontSize:13,fontWeight:700,color:T.onSurf,lineHeight:1.4,margin:0}}>{item.title}</p>
        {exp&&item.summary&&<p style={{fontSize:11,color:T.onVar,marginTop:8,lineHeight:1.6}}>{item.summary}</p>}
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <span style={{fontSize:9,color:T.onVar,display:"block"}}>{ago(item.timestamp)}</span>
        <span style={{fontSize:9,color:`${srcColor(item.sourceType)}88`,display:"block",marginTop:2}}>{item.source}</span>
      </div>
    </div>
    {exp&&item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:lotteryMode?T.lottery:T.primary,marginTop:8,display:"inline-block",textDecoration:"none"}}>Open source ↗</a>}
  </div>);
}

// ─── MENA SVG MAP ─────────────────────────────────────────────────────────────
// Proper SVG map using actual geographic positions — no background image needed
// ── MENA MAP ─────────────────────────────────────────────────────────────────
// Uses Carto Dark Matter tiles (free, no auth) composited into a 6×4 tile grid
// Country dot positions computed via Mercator projection (zoom=4, x=7..12, y=5..8)
const MAP_COUNTRIES=[
  {id:"Morocco",      code:"MAR", x:11.4,  y:37.7},
  {id:"Algeria",      code:"DZA", x:18.6,  y:42.6},
  {id:"Tunisia",      code:"TUN", x:23.8,  y:35.0},
  {id:"Libya",        code:"LBY", x:30.0,  y:43.9},
  {id:"Egypt",        code:"EGY", x:38.9,  y:45.0},
  {id:"Sudan",        code:"SDN", x:40.8,  y:57.4},
  {id:"Lebanon",      code:"LBN", x:43.0,  y:35.0},
  {id:"Palestine",    code:"PSE", x:42.7,  y:37.6},
  {id:"Israel",       code:"ISR", x:42.6,  y:38.1},
  {id:"Jordan",       code:"JOR", x:43.4,  y:38.8},
  {id:"Syria",        code:"SYR", x:45.3,  y:33.7},
  {id:"Iraq",         code:"IRQ", x:49.0,  y:35.8},
  {id:"Kuwait",       code:"KUW", x:52.0,  y:40.8},
  {id:"Saudi Arabia", code:"KSA", x:50.1,  y:47.7},
  {id:"Bahrain",      code:"BHR", x:54.1,  y:44.9},
  {id:"Qatar",        code:"QAT", x:54.6,  y:45.9},
  {id:"UAE",          code:"UAE", x:57.0,  y:47.6},
  {id:"Oman",         code:"OMN", x:59.2,  y:49.9},
  {id:"Yemen",        code:"YEM", x:52.3,  y:57.4},
  {id:"Iran",         code:"IRN", x:56.5,  y:36.9},
];

// Carto Dark Matter tile grid: zoom=4, x=7..12, y=5..8 (6 cols × 4 rows)
const CARTO = "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all";
const MAP_TILES = [];
for(let y=5;y<=8;y++) for(let x=7;x<=12;x++) MAP_TILES.push(`${CARTO}/4/${x}/${y}.png`);

function MENAMap({items,onCountryClick}){
  // Zoom state: 1.0 = full MENA view, 1.5 = default (slightly zoomed in), 3.0 = max
  const [zoom,setZoom]    = useState(1.5);
  // Pan origin as % of the tile canvas — default centres on Arabian Peninsula
  const [pan,setPan]      = useState({x:45,y:44});
  const [dragging,setDragging] = useState(false);
  const [dragStart,setDragStart] = useState(null);
  const containerRef = useRef(null);

  const MIN_ZOOM=1.0, MAX_ZOOM=4.0;
  const clampZoom=z=>Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,z));

  // Zoom in/out around the current pan centre
  const changeZoom=(delta)=>setZoom(z=>clampZoom(z+delta));

  // Mouse wheel zoom
  const onWheel=(e)=>{
    e.preventDefault();
    const delta=e.deltaY>0?-0.2:0.2;
    setZoom(z=>clampZoom(z+delta));
  };

  // Drag to pan
  const onMouseDown=(e)=>{
    if(e.button!==0)return;
    setDragging(true);
    setDragStart({mx:e.clientX,my:e.clientY,px:pan.x,py:pan.y});
    e.preventDefault();
  };
  const onMouseMove=(e)=>{
    if(!dragging||!dragStart||!containerRef.current)return;
    const rect=containerRef.current.getBoundingClientRect();
    const dx=((dragStart.mx-e.clientX)/rect.width)*100/zoom;
    const dy=((dragStart.my-e.clientY)/rect.height)*100/zoom;
    setPan({x:dragStart.px+dx,y:dragStart.py+dy});
  };
  const onMouseUp=()=>{setDragging(false);setDragStart(null);};

  // Touch pan support
  const touchRef = useRef(null);
  const onTouchStart=(e)=>{
    if(e.touches.length===1){
      touchRef.current={tx:e.touches[0].clientX,ty:e.touches[0].clientY,px:pan.x,py:pan.y};
    }
  };
  const onTouchMove=(e)=>{
    if(!touchRef.current||!containerRef.current||e.touches.length!==1)return;
    const rect=containerRef.current.getBoundingClientRect();
    const dx=((touchRef.current.tx-e.touches[0].clientX)/rect.width)*100/zoom;
    const dy=((touchRef.current.ty-e.touches[0].clientY)/rect.height)*100/zoom;
    setPan({x:touchRef.current.px+dx,y:touchRef.current.py+dy});
    e.preventDefault();
  };

  const cData=(cid)=>{
    const ci=items.filter(i=>i.country===cid);
    if(!ci.length)return{count:0,col:T.outVar,dominant:"NEUTRAL"};
    const cnts={};ci.forEach(i=>{const l=i.sentiment?.label||"NEUTRAL";cnts[l]=(cnts[l]||0)+1;});
    const dom=Object.entries(cnts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"NEUTRAL";
    const col=dom==="CRITICAL"?T.error:dom==="WARNING"?T.tertiary:dom==="POSITIVE"||dom==="STABLE"?T.secondary:T.primary;
    return{count:ci.length,col,dominant:dom};
  };

  // Dot size inversely scales with zoom so dots stay visually consistent
  const dotScale=1/Math.sqrt(zoom);

  return(
    <div ref={containerRef}
      style={{width:"100%",borderRadius:6,overflow:"hidden",border:`1px solid ${T.outVar}22`,
        position:"relative",background:T.base,userSelect:"none",
        cursor:dragging?"grabbing":"grab"}}
      onWheel={onWheel}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={()=>{touchRef.current=null;}}>

      {/* Aspect ratio box: 6×4 tiles → 3:2 but we show at 50% height = 33.3% padding */}
      <div style={{width:"100%",height:0,paddingBottom:"33.3%",position:"relative",overflow:"hidden"}}>

        {/* Zoomable + pannable inner canvas */}
        <div style={{
          position:"absolute",inset:0,overflow:"hidden",
        }}>
          {/* The actual tile + dot canvas, transformed */}
          <div style={{
            position:"absolute",
            // We expand the inner div to fill based on zoom, anchored to pan centre
            width:`${100*zoom}%`,
            height:`${100*zoom}%`,
            left:`${50-pan.x*zoom}%`,
            top:`${50-pan.y*zoom}%`,
            transition:dragging?"none":"left 0.1s,top 0.1s,width 0.2s,height 0.2s",
          }}>
            {/* Tile grid */}
            <div style={{position:"absolute",inset:0,display:"grid",
              gridTemplateColumns:"repeat(6,1fr)",gridTemplateRows:"repeat(4,1fr)"}}>
              {MAP_TILES.map((url,i)=>(
                <img key={i} src={url} alt="" draggable={false}
                  style={{width:"100%",height:"100%",display:"block",objectFit:"cover",pointerEvents:"none"}}
                  loading="eager" decoding="async"/>
              ))}
            </div>

            {/* Signal dots */}
            {MAP_COUNTRIES.map(({id,code,x,y})=>{
              const cd=cData(id);
              const baseSz=cd.count>15?16:cd.count>8?13:cd.count>3?10:cd.count>0?8:5;
              const sz=Math.round(baseSz*dotScale);
              const op=cd.count>0?1:0.22;
              const showLabel=cd.count>2&&zoom>=1.2;
              return(
                <div key={id}
                  onClick={(e)=>{e.stopPropagation();onCountryClick&&onCountryClick(id);}}
                  title={`${id}: ${cd.count} signals (${cd.dominant})`}
                  style={{
                    position:"absolute",left:`${x}%`,top:`${y}%`,
                    transform:"translate(-50%,-50%)",
                    cursor:"pointer",opacity:op,zIndex:2,
                  }}
                  onMouseDown={e=>e.stopPropagation()}
                  onMouseEnter={e=>{
                    const dot=e.currentTarget.querySelector(".dot");
                    if(dot)dot.style.transform="scale(1.5)";
                  }}
                  onMouseLeave={e=>{
                    const dot=e.currentTarget.querySelector(".dot");
                    if(dot)dot.style.transform="scale(1)";
                  }}>
                  {/* Pulse ring */}
                  {cd.count>0&&<div style={{
                    position:"absolute",
                    width:sz*3,height:sz*3,
                    borderRadius:"50%",
                    border:`1px solid ${cd.col}44`,
                    top:"50%",left:"50%",
                    transform:"translate(-50%,-50%)",
                    animation:"pulse-ring 2.5s ease infinite",
                    pointerEvents:"none",
                  }}/>}
                  {/* Dot */}
                  <div className="dot" style={{
                    width:sz,height:sz,borderRadius:"50%",
                    background:cd.col,
                    boxShadow:`0 0 ${sz*1.2}px ${cd.col}bb`,
                    border:`1.5px solid ${cd.col}88`,
                    transition:"transform 0.15s",
                    position:"relative",zIndex:1,
                  }}/>
                  {/* Label — only shows at zoom ≥ 1.2 */}
                  {showLabel&&<div style={{
                    position:"absolute",top:sz+2,left:"50%",
                    transform:"translateX(-50%)",
                    fontSize:Math.max(7,Math.round(7*dotScale)),
                    color:T.onSurf,fontWeight:800,
                    whiteSpace:"nowrap",
                    fontFamily:"'JetBrains Mono',monospace",
                    background:`${T.base}dd`,
                    padding:"1px 3px",borderRadius:2,
                    pointerEvents:"none",letterSpacing:"0.05em",
                  }}>{code}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Vignette overlay */}
        <div style={{position:"absolute",inset:0,zIndex:3,pointerEvents:"none",
          background:"radial-gradient(ellipse at 50% 50%, transparent 55%, #060e20aa 100%)"}}/>

        {/* Zoom controls */}
        <div style={{position:"absolute",top:10,right:10,zIndex:10,
          display:"flex",flexDirection:"column",gap:4}}>
          {[["＋",0.4],["−",-0.4]].map(([lbl,d])=>(
            <button key={lbl} onClick={(e)=>{e.stopPropagation();changeZoom(d);}}
              style={{
                width:28,height:28,borderRadius:4,
                background:`${T.base}ee`,border:`1px solid ${T.outVar}55`,
                color:T.primary,fontSize:16,lineHeight:1,
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:700,transition:"background 0.15s",
                backdropFilter:"blur(4px)",
              }}
              onMouseEnter={e=>e.currentTarget.style.background=T.high}
              onMouseLeave={e=>e.currentTarget.style.background=`${T.base}ee`}>
              {lbl}
            </button>
          ))}
          {/* Reset */}
          <button onClick={(e)=>{e.stopPropagation();setZoom(1.5);setPan({x:45,y:44});}}
            style={{
              width:28,height:28,borderRadius:4,
              background:`${T.base}ee`,border:`1px solid ${T.outVar}55`,
              color:T.onVar,fontSize:10,lineHeight:1,
              cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              fontWeight:700,transition:"background 0.15s",
              backdropFilter:"blur(4px)",
            }}
            onMouseEnter={e=>e.currentTarget.style.background=T.high}
            onMouseLeave={e=>e.currentTarget.style.background=`${T.base}ee`}
            title="Reset view">⌂</button>
        </div>

        {/* Zoom indicator */}
        <div style={{position:"absolute",top:10,left:10,zIndex:10,
          fontSize:8,color:`${T.onVar}99`,background:`${T.base}cc`,
          padding:"2px 6px",borderRadius:3,fontFamily:"'JetBrains Mono',monospace"}}>
          {zoom.toFixed(1)}×
        </div>

        {/* Legend */}
        <div style={{position:"absolute",bottom:8,left:10,zIndex:10,
          display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontFamily:"Manrope",fontSize:9,fontWeight:800,color:T.onSurf,
            background:`${T.base}dd`,padding:"2px 6px",borderRadius:3}}>MENA Signal Map</span>
          {[[T.error,"Critical"],[T.tertiary,"Warning"],[T.secondary,"Stable"],[T.primary,"Active"]].map(([col,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:3,
              background:`${T.base}cc`,padding:"2px 5px",borderRadius:3}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:col,boxShadow:`0 0 4px ${col}`}}/>
              <span style={{fontSize:8,color:T.onVar,fontWeight:700}}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{position:"absolute",bottom:8,right:10,zIndex:10,
          fontSize:8,color:`${T.onVar}55`,background:`${T.base}aa`,
          padding:"2px 6px",borderRadius:3}}>Scroll to zoom · Drag to pan</div>
      </div>
    </div>
  );
}


// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const[items,setItems]=useState([]);
  const[redditItems,setRedditItems]=useState([]);
  const[loading,setLoading]=useState(true);
  const[redditLoading,setRedditLoading]=useState(true);
  const[lotteryData,setLotteryData]=useState(null);
  const[lotteryLoading,setLotteryLoading]=useState(true);
  const[lotteryBrief,setLotteryBrief]=useState(null);
  const[lotteryFilter,setLotteryFilter]=useState("ALL");
  const[srcStatuses,setSrcStatuses]=useState({});
  const[redditStatus,setRedditStatus]=useState({});
  const[socialMeta,setSocialMeta]=useState({});
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
    if(unique.length>5){setBriefLoading(true);fetchGemini(unique,"intelligence").then(b=>{setBrief(b);setBriefLoading(false);});}
  },[]);

  const loadSocial=useCallback(async()=>{
    setRedditLoading(true);
    const{articles,meta}=await fetchSocialSignals();
    articles.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    setRedditItems(articles);
    // Build status map from meta
    const statuses={};
    if(meta?.status){
      const s=meta.status;
      // Mark all sources as active/error based on total
      ['UAE','saudiarabia','qatar','Kuwait','jordan','oman','bahrain','lebanon','iraq','egypt','MiddleEast','Arabs'].forEach(sub=>{
        statuses[sub]=s.total>0?"active":"error";
      });
    }
    setRedditStatus(statuses);
    setSocialMeta(meta||{});
    setRedditLoading(false);
  },[]);

  const loadLottery=useCallback(async()=>{
    setLotteryLoading(true);
    const data=await fetchLotterySignals();
    setLotteryData(data);setLotteryLoading(false);
    if(data?.items?.length>3){
      fetchGemini(data.items,"lottery").then(b=>setLotteryBrief(b));
    }
  },[]);

  const loadBulk=useCallback(async()=>{
    setBulkLoading(true);setBulkError(null);setBulkProgress({stage:"Starting…",pct:2});
    try{
      const data=await fetchBulkIngest(p=>setBulkProgress(p));
      if(!data.ok)throw new Error(data.error||"Ingest failed");
      const existIds=new Set([...items,...redditItems].map(i=>i.id));
      const fresh=(data.articles||[]).filter(a=>!existIds.has(a.id));
      // Bulk ingest feeds RSS+HN into main feed; social goes via /api/social separately
      setItems(prev=>{const m=[...prev,...fresh].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));const s=new Set();return m.filter(i=>{if(s.has(i.id))return false;s.add(i.id);return true;});});
      if(data.sourceHealth){const ns={};(data.sourceHealth.rss||[]).forEach(s=>{ns[s.id]=s.status;});if(data.sourceHealth.hn)ns.hackernews=data.sourceHealth.hn.status;setSrcStatuses(p=>({...p,...ns}));}
      setBulkMeta(data.meta);setBulkProgress({stage:"Done!",pct:100});
    }catch(e){setBulkError(e.message);}
    finally{setTimeout(()=>{setBulkLoading(false);setBulkProgress({stage:"",pct:0});},1800);}
  },[items,redditItems]);

  useEffect(()=>{
    loadMain();loadSocial();loadLottery();
    timerRef.current=setInterval(()=>{loadMain();loadSocial();loadLottery();},5*60*1000);
    return()=>clearInterval(timerRef.current);
  },[loadMain,loadSocial,loadLottery]);

  const allItems=[...items,...redditItems].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const pScore=calcPulse(allItems);
  const sentCounts={CRITICAL:0,WARNING:0,POSITIVE:0,STABLE:0,NEUTRAL:0};
  allItems.forEach(i=>{if(sentCounts[i.sentiment?.label]!==undefined)sentCounts[i.sentiment.label]++;});
  const secCounts=Object.keys(SECTIONS).reduce((a,s)=>{a[s]=allItems.filter(i=>i.section===s).length;return a;},{});
  const cData=(cid)=>{const ci=allItems.filter(i=>i.country===cid);if(!ci.length)return{items:[],avg:0,dominant:"NEUTRAL",count:0};
    const avg=ci.reduce((s,i)=>s+(i.sentiment?.score||0),0)/ci.length;
    const cnts={};ci.forEach(i=>{const l=i.sentiment?.label||"NEUTRAL";cnts[l]=(cnts[l]||0)+1;});
    return{items:ci,avg,dominant:Object.entries(cnts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"NEUTRAL",count:ci.length};};
  const filteredFeed=allItems.filter(i=>{
    if(feedFilter!=="ALL"&&i.sentiment?.label!==feedFilter)return false;
    if(secFilter!=="ALL"&&i.section!==secFilter)return false;
    if(searchQ&&!i.title.toLowerCase().includes(searchQ.toLowerCase())&&!i.country.toLowerCase().includes(searchQ.toLowerCase()))return false;
    return true;});
  const filteredReddit=redditItems.filter(i=>redditFilter==="ALL"||i.sentiment?.label===redditFilter);

  const lotteryItems=lotteryData?.items||[];
  const lotteryFiltered=lotteryFilter==="ALL"?lotteryItems:lotteryItems.filter(i=>lotteryMood(i.title+" "+(i.summary||"")).label===lotteryFilter);
  const lotMeta=lotteryData?.meta||{uncertaintyScore:75,moodDist:{HOPEFUL:0,CYNICAL:0,ANXIOUS:0,NEUTRAL:0},dominantMood:"NEUTRAL",meSignals:0};
  const userSentCol=brief?.userSentiment?({OPTIMISTIC:T.secondary,CAUTIOUS:T.primary,ANXIOUS:T.tertiary,FEARFUL:T.error,INDIFFERENT:T.onVar}[brief.userSentiment]||T.primary):T.primary;

  const NAV=[
    {id:"overview",  label:"Overview",      icon:"dashboard"},
    {id:"feed",      label:"Regional News",  icon:"rss_feed"},
    {id:"reddit",    label:"Social Intel",   icon:"forum"},
    {id:"lottery",   label:"Lottery Pulse",  icon:"casino",   badge:lotteryItems.length||null},
    {id:"country",   label:"Countries",      icon:"public"},
    {id:"analysis",  label:"Analysis",       icon:"monitoring"},
    {id:"sources",   label:"Sources",        icon:"layers"},
  ];

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}html,body{height:100%;background:${T.surface};color:${T.onSurf};}
    ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${T.high};border-radius:10px}
    .ms{font-family:'Material Symbols Outlined';font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24;vertical-align:middle;font-style:normal;line-height:1}
    .card{background:${T.low};border-radius:6px;padding:18px 20px;}
    .nav-link{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:4px;border:none;background:none;color:${T.onVar};font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:Inter,sans-serif;position:relative;}
    .nav-link:hover{background:${T.mid};color:${T.onSurf};}
    .nav-link.active{background:${T.mid};color:${T.primary};border-left:3px solid ${T.primary};}
    .nav-link.lottery-active{background:${T.mid};color:${T.lottery};border-left:3px solid ${T.lottery};}
    .chip{padding:4px 10px;border-radius:20px;border:1px solid ${T.outVar}44;background:transparent;color:${T.onVar};font-size:10px;font-weight:700;cursor:pointer;transition:all .15s;font-family:Inter,sans-serif;}
    .chip.on{border-color:${T.primary};background:${T.priCont}33;color:${T.primary};}
    .chip.lot-on{border-color:${T.lottery};background:${T.lotCont}33;color:${T.lottery};}
    .ghost{padding:4px 10px;background:${T.high};border:none;border-radius:3px;color:${T.onVar};cursor:pointer;font-family:Inter,sans-serif;}
    .cbtn{padding:5px 10px;border-radius:4px;border:1px solid ${T.outVar}44;background:${T.mid};color:${T.onVar};font-size:11px;cursor:pointer;font-family:Inter,sans-serif;transition:all .15s;}
    .cbtn.active{border-color:${T.primary};color:${T.primary};background:${T.priCont}22;}
    .srow:hover{background:${T.high};}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
    @keyframes ticker{0%{transform:translateX(100%)}100%{transform:translateX(-100vw)}}
    @keyframes lottery-glow{0%,100%{box-shadow:0 0 10px ${T.lottery}33}50%{box-shadow:0 0 20px ${T.lottery}66}}
    @keyframes pulse-ring{0%{transform:translate(-50%,-50%) scale(0.8);opacity:0.8}100%{transform:translate(-50%,-50%) scale(2);opacity:0}}
    .live{animation:pulse 1.8s ease infinite}
    .ticker-txt{animation:ticker 90s linear infinite;white-space:nowrap;will-change:transform}
    .lot-card{animation:lottery-glow 3s ease infinite}
  `;

  return(
    <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:T.surface,color:T.onSurf}}>
      <style>{css}</style>

      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <aside style={{width:210,position:"fixed",left:0,top:0,bottom:0,background:T.base,borderRight:`1px solid ${T.outVar}18`,display:"flex",flexDirection:"column",zIndex:50}}>
        <div style={{padding:"18px 16px",borderBottom:`1px solid ${T.outVar}18`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:30,height:30,background:T.priCont,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🛰️</div>
            <div>
              <div style={{fontFamily:"Manrope",fontWeight:900,fontSize:13,color:T.primary,letterSpacing:".05em"}}>OPEN EYE</div>
              <div style={{fontSize:7,color:`${T.primary}60`,letterSpacing:".15em",textTransform:"uppercase",fontWeight:700}}>OSINT v2.1</div>
            </div>
          </div>
        </div>

        {/* Pulse rings */}
        <div style={{padding:"14px 12px",borderBottom:`1px solid ${T.outVar}18`,display:"flex",gap:8,justifyContent:"center",alignItems:"center"}}>
          <div style={{textAlign:"center"}}>
            <PulseRing score={pScore} loading={loading&&!allItems.length}/>
            <div style={{fontSize:7,color:T.onVar,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",marginTop:2}}>Regional</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginTop:3}}>
              <span className="live" style={{width:5,height:5,borderRadius:"50%",background:T.secondary,display:"inline-block"}}/>
              <span style={{fontSize:7,color:T.secondary,fontWeight:700}}>LIVE</span>
            </div>
          </div>
          <div style={{width:1,height:70,background:`${T.outVar}33`}}/>
          <div style={{textAlign:"center"}}>
            <PulseRing score={lotteryData?.meta?.uncertaintyScore??75} loading={lotteryLoading} col={T.lottery}/>
            <div style={{fontSize:7,color:T.onVar,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",marginTop:2}}>Uncertainty</div>
            {lotMeta.dominantMood&&<div style={{fontSize:7,color:T.lottery,fontWeight:700,marginTop:3}}>{lotMeta.dominantMood}</div>}
          </div>
        </div>

        {/* User sentiment */}
        {brief?.userSentiment&&(
          <div style={{padding:"8px 14px",borderBottom:`1px solid ${T.outVar}18`}}>
            <div style={{fontSize:7,color:T.onVar,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",marginBottom:4}}>User Sentiment</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:userSentCol,boxShadow:`0 0 7px ${userSentCol}88`}}/>
              <span style={{fontSize:11,fontWeight:800,color:userSentCol,fontFamily:"Manrope"}}>{brief.userSentiment}</span>
            </div>
          </div>
        )}

        <nav style={{padding:"8px 8px",flex:1,overflowY:"auto"}}>
          {NAV.map(n=>(
            <button key={n.id} className={`nav-link${tab===n.id?(n.id==="lottery"?" lottery-active":" active"):""}`}
              onClick={()=>setTab(n.id)} style={{width:"100%",justifyContent:"flex-start",marginBottom:2}}>
              <span className="ms" style={{fontSize:14}}>{n.icon}</span>
              {n.label}
              {n.badge&&<span style={{marginLeft:"auto",fontSize:8,background:`${T.lottery}22`,color:T.lottery,padding:"1px 5px",borderRadius:8,fontWeight:800}}>{n.badge}</span>}
            </button>
          ))}
        </nav>

        {/* FX */}
        <div style={{padding:"10px 14px",borderTop:`1px solid ${T.outVar}18`,fontSize:10}}>
          <div style={{color:`${T.onVar}88`,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",marginBottom:5}}>FX (USD)</div>
          {fx?[["SAR",fx.sar],["AED",fx.aed],["QAR",fx.qar],["KWD",fx.kwd]].map(([k,v])=>v&&(
            <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{color:T.onVar}}>{k}</span><span style={{color:T.onSurf,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{v.toFixed(3)}</span>
            </div>)):<div style={{color:`${T.onVar}55`}}>Loading…</div>}
        </div>

        {/* Refresh */}
        <div style={{padding:"10px 14px",borderTop:`1px solid ${T.outVar}18`}}>
          <button onClick={()=>{loadMain();loadSocial();loadLottery();}} disabled={loading}
            style={{width:"100%",background:`linear-gradient(135deg,${T.priCont},${T.primary}33)`,border:`1px solid ${T.primary}33`,color:T.primary,borderRadius:5,padding:"7px",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            <span style={{fontSize:12,...(loading?{animation:"spin 1s linear infinite",display:"inline-block"}:{})}}>⟳</span>
            {loading?"Ingesting…":"Refresh All"}
          </button>
          {lastRefresh&&<div style={{fontSize:8,color:`${T.onVar}55`,textAlign:"center",marginTop:3}}>{lastRefresh.toLocaleTimeString()}</div>}
        </div>
      </aside>

      {/* ── MAIN ──────────────────────────────────────────────────── */}
      <div style={{marginLeft:210,display:"flex",flexDirection:"column",minHeight:"100vh"}}>

        {/* Top nav */}
        {/* Top nav bar */}
        <header style={{background:`${T.base}ee`,backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.outVar}18`,position:"sticky",top:0,zIndex:40}}>
          {/* Row 1: Brand + Nav + Status */}
          <div style={{padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:48}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontFamily:"Manrope",fontWeight:900,fontSize:15,color:T.primary,letterSpacing:"-.5px",flexShrink:0}}>STRATEGIC EYE</span>
              <nav style={{display:"flex",gap:2,flexWrap:"nowrap",overflow:"hidden"}}>
                {NAV.map(n=>(<button key={n.id} className={`nav-link${tab===n.id?(n.id==="lottery"?" lottery-active":" active"):""}`} onClick={()=>setTab(n.id)}><span className="ms" style={{fontSize:14}}>{n.icon}</span>{n.label}</button>))}
              </nav>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <span style={{fontSize:10,color:T.onVar}}>{allItems.length} signals</span>
              <span style={{fontSize:9,color:T.lottery,fontWeight:700,background:`${T.lottery}22`,padding:"2px 7px",borderRadius:8}}>🎰 {lotteryItems.length}</span>
              <span style={{fontSize:9,color:T.secondary,fontWeight:700,background:`${T.secCont}25`,padding:"2px 7px",borderRadius:8}}>● ONLINE</span>
            </div>
          </div>
          {/* Row 2: Full-width ticker */}
          <div style={{borderTop:`1px solid ${T.outVar}11`,background:T.base,padding:"0 0",height:26,display:"flex",alignItems:"center",overflow:"hidden"}}>
            <span style={{fontSize:9,background:T.errCont,color:T.error,padding:"2px 8px",height:"100%",display:"flex",alignItems:"center",fontWeight:800,flexShrink:0,letterSpacing:".06em"}}>● LIVE</span>
            <div style={{flex:1,overflow:"hidden",position:"relative",height:"100%"}}>
              <span className="ticker-txt" style={{fontSize:10,color:T.onVar,position:"absolute",top:"50%",transform:"translateY(-50%)",whiteSpace:"nowrap"}}>
                {allItems.length>0?allItems.slice(0,10).map(i=>i.title).join("     ·     "):"Ingesting intelligence signals…"}
              </span>
            </div>
          </div>
        </header>

        <main style={{flex:1,padding:"24px 28px",overflow:"auto"}}>

          {/* ── OVERVIEW ─────────────────────────────────────────── */}
          {tab==="overview"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
                <div>
                  <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".2em",fontWeight:700,marginBottom:6}}>Intelligence Feed · MENA Region</div>
                  <h1 style={{fontFamily:"Manrope",fontSize:32,fontWeight:900,letterSpacing:"-.5px",lineHeight:1}}>Middle East Activity Heatmap</h1>
                  <p style={{color:T.onVar,fontSize:12,marginTop:6,display:"flex",alignItems:"center",gap:8}}>
                    <span className="live" style={{width:6,height:6,borderRadius:"50%",background:T.secondary,flexShrink:0}}/>
                    Real-time alert density · {MENA_COUNTRIES.length-1} MENA hubs · {allItems.length} signals
                  </p>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={loadBulk} disabled={bulkLoading}
                    style={{padding:"7px 14px",background:bulkLoading?T.high:`linear-gradient(135deg,${T.priCont},${T.primary}55)`,border:`1px solid ${T.primary}33`,color:T.primary,borderRadius:4,fontSize:11,fontWeight:700,cursor:bulkLoading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:12,...(bulkLoading?{animation:"spin 1s linear infinite",display:"inline-block"}:{})}}>⟳</span>
                    {bulkLoading?`${bulkProgress.stage} (${bulkProgress.pct}%)`:"Load 30-Day Bulk Ingest"}
                  </button>
                </div>
              </div>
              {bulkError&&<div style={{background:`${T.errCont}22`,border:`1px solid ${T.error}33`,borderRadius:5,padding:"10px 14px",marginBottom:14,fontSize:11,color:T.error}}>⚠ Bulk ingest error: {bulkError}</div>}
              {bulkMeta&&<div style={{background:`${T.secCont}15`,border:`1px solid ${T.secondary}22`,borderRadius:5,padding:"8px 14px",marginBottom:14,fontSize:10,color:T.secondary}}>✓ Bulk ingested {bulkMeta.totalFiltered} articles · {bulkMeta.elapsedMs}ms · {new Date(bulkMeta.ingestedAt).toLocaleTimeString()}</div>}

              <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20,marginBottom:20}}>
                <div>
                  {/* SVG MAP */}
                  <MENAMap items={allItems} onCountryClick={(cid)=>{setActiveCountry(cid);setTab("country");}}/>
                  {/* Trending topics bento */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:14}}>
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

                  {/* Lottery uncertainty mini card */}
                  <div className="card lot-card" style={{border:`1px solid ${T.lottery}33`,padding:"14px 16px"}}>
                    <div style={{fontSize:9,color:T.lottery,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",marginBottom:8}}>🎰 Lottery Pulse</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div><div style={{fontFamily:"Manrope",fontSize:20,fontWeight:900,color:T.lottery}}>{lotMeta.dominantMood}</div><div style={{fontSize:9,color:T.onVar}}>dominant mood</div></div>
                      <div style={{textAlign:"right"}}><div style={{fontFamily:"Manrope",fontSize:20,fontWeight:900,color:lotMeta.uncertaintyScore>60?T.error:lotMeta.uncertaintyScore>30?T.tertiary:T.secondary}}>{lotMeta.uncertaintyScore}%</div><div style={{fontSize:9,color:T.onVar}}>uncertainty</div></div>
                    </div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {Object.entries(lotMeta.moodDist||{}).map(([mood,cnt])=>cnt>0&&(
                        <span key={mood} style={{fontSize:8,padding:"2px 6px",borderRadius:8,background:`${T.lottery}22`,color:T.lottery,fontWeight:700}}>{mood}: {cnt}</span>
                      ))}
                    </div>
                    <button onClick={()=>setTab("lottery")} style={{marginTop:8,fontSize:10,color:T.lottery,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>View Lottery Pulse →</button>
                  </div>

                  <div className="card">
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:8}}>Market Indicators</div>
                    {[["Brent Crude","$82.44","+1.24%",T.secondary],["DFM Index",fx?`${fx.aed?.toFixed(2)||"3.67"}`:"—","+0.42%",T.secondary],["TASI",fx?`${fx.sar?.toFixed(2)||"3.75"}`:"—","-0.15%",T.error]].map(([l,v,ch,col])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                        <div><div style={{fontSize:9,color:T.onVar,fontWeight:600,marginBottom:2}}>{l}</div><div style={{fontFamily:"Manrope",fontSize:16,fontWeight:900}}>{v}</div></div>
                        <span style={{fontSize:10,fontWeight:800,color:col,alignSelf:"flex-end"}}>{ch}</span>
                      </div>))}
                  </div>

                  <div className="card">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar}}>Pulse Updates</div>
                      <button onClick={()=>setTab("feed")} style={{fontSize:10,color:T.primary,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>View All</button>
                    </div>
                    {allItems.slice(0,4).map(item=>{const sc=secColor(item.section);return(
                      <div key={item.id} style={{borderLeft:`2px solid ${sc}`,paddingLeft:10,marginBottom:10}}>
                        <div style={{fontSize:9,fontWeight:700,color:sc,marginBottom:2,textTransform:"uppercase",letterSpacing:".08em"}}>{SECTIONS[item.section]?.label||item.section} · {ago(item.timestamp)}</div>
                        <div style={{fontSize:12,fontWeight:700,lineHeight:1.3,marginBottom:2}}>{item.title.slice(0,70)}{item.title.length>70?"…":""}</div>
                        <div style={{fontSize:9,color:T.onVar}}>{item.source}</div>
                      </div>);})}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── FEED ─────────────────────────────────────────────── */}
          {tab==="feed"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
                <div>
                  <h1 style={{fontFamily:"Manrope",fontSize:30,fontWeight:900,letterSpacing:"-.5px"}}>Regional News Feed</h1>
                  <p style={{color:T.onVar,fontSize:12,marginTop:5}}>{allItems.length} signals · {RSS_SOURCES.length} RSS feeds · {REDDIT_SUBS.length} ME subreddits</p>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{background:T.low,borderRadius:4,padding:"0 10px",display:"flex",alignItems:"center",gap:6,height:32}}>
                    <span className="ms" style={{fontSize:14,color:T.onVar}}>search</span>
                    <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search…" style={{background:"none",border:"none",outline:"none",fontSize:12,color:T.onSurf,width:150,fontFamily:"Inter,sans-serif"}}/>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
                {["ALL","CRITICAL","WARNING","POSITIVE","STABLE","NEUTRAL"].map(f=>(<button key={f} className={`chip${feedFilter===f?" on":""}`} onClick={()=>setFeedFilter(f)}>{f}</button>))}
              </div>
              <div style={{display:"flex",gap:5,marginBottom:16,flexWrap:"wrap"}}>
                {["ALL",...Object.keys(SECTIONS)].map(s=>(<button key={s} className={`chip${secFilter===s?" on":""}`} onClick={()=>setSecFilter(s)}>{s}</button>))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:14}}>
                <div>
                  {(loading&&!filteredFeed.length)?[...Array(5)].map((_,i)=><div key={i} style={{background:T.mid,height:65,borderRadius:5,marginBottom:7,opacity:.4}}/>)
                    :filteredFeed.slice(0,60).map(item=><FeedCard key={item.id} item={item}/>)}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div className="card">
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:10}}>Sentiment</div>
                    {[["POSITIVE",T.secondary],["NEUTRAL",T.onVar],["WARNING",T.tertiary],["CRITICAL",T.error]].map(([l,col])=><SentBar key={l} label={l} color={col} pct={allItems.length?Math.round((sentCounts[l]||0)/allItems.length*100):0}/>)}
                  </div>
                  {weather&&<div className="card"><div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:5}}>Riyadh</div><div style={{fontFamily:"Manrope",fontSize:24,fontWeight:900,color:T.primary}}>{weather.temp}°C</div><div style={{fontSize:10,color:T.onVar}}>Wind {weather.wind} km/h</div></div>}
                  <div className="card">
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:10}}>Top Sources</div>
                    {[...new Set(allItems.map(i=>i.source))].slice(0,7).map(src=>{const cnt=allItems.filter(i=>i.source===src).length;return(
                      <div key={src} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:11}}>{src}</span><span style={{fontSize:10,color:T.primary,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{cnt}</span></div>);})}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SOCIAL INTEL ─────────────────────────────────────── */}
          {tab==="reddit"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
                <div>
                  <div style={{fontSize:9,color:"#6364ff",textTransform:"uppercase",letterSpacing:".2em",fontWeight:700,marginBottom:5}}>Mastodon + Lemmy · No Auth Required</div>
                  <h1 style={{fontFamily:"Manrope",fontSize:30,fontWeight:900,letterSpacing:"-.5px"}}>Social Intelligence Pulse</h1>
                  <p style={{color:T.onVar,fontSize:12,marginTop:5}}>{redditItems.length} signals · Mastodon hashtags + Lemmy federated search · all open APIs</p>
                </div>
                <div style={{background:T.low,borderRadius:5,padding:"10px 14px",display:"flex",flexWrap:"wrap",gap:5,maxWidth:500}}>
                  {[["Mastodon #UAE","UAE"],["Mastodon #Dubai","UAE"],["Mastodon #SaudiArabia","KSA"],["Mastodon #MENA","ME"],["Mastodon #MiddleEast","ME"],["Mastodon #Qatar","QAT"],["Mastodon #Kuwait","KUW"],["Mastodon #Jordan","JOR"],["Mastodon #Gaza","PSE"],["Mastodon #Iran","IRN"],["Mastodon #OPEC","GCC"],["Lemmy: UAE","UAE"],["Lemmy: Saudi","KSA"],["Lemmy: MENA","ME"],["Lemmy: OPEC","GCC"]].map(([label,tag])=>{
                    const active=redditItems.length>0;
                    return(<span key={label} style={{fontSize:9,padding:"2px 6px",borderRadius:3,fontWeight:700,background:active?`${T.secCont}25`:`${T.outVar}25`,color:active?T.secondary:T.onVar}}>{label}</span>);
                  })}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:18}}>
                {[
                  ["Signals",redditItems.length,"#a855f7"],
                  ["Positive",redditItems.filter(i=>["POSITIVE","STABLE"].includes(i.sentiment?.label)).length,T.secondary],
                  ["Critical",redditItems.filter(i=>i.sentiment?.label==="CRITICAL").length,T.error],
                  ["Mastodon",redditItems.filter(i=>i.sourceType==="Mastodon").length,"#6364ff"],
                  ["Lemmy",redditItems.filter(i=>i.sourceType==="Lemmy").length,"#00bc8c"],
                ].map(([l,v,col])=>(
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
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:10}}>Signals by Country</div>
                    {MENA_COUNTRIES.filter(c=>c.id!=="Regional").map(c=>{
                      const cnt=redditItems.filter(i=>i.country===c.id).length;
                      if(!cnt)return null;
                      return(<div key={c.id} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{fontSize:11}}>{c.flag} {c.id}</span>
                        <span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:"#6364ff",fontWeight:700}}>{cnt}</span>
                      </div>);
                    })}
                  </div>
                  <div style={{background:T.low,borderRadius:5,padding:"12px 14px",borderLeft:"3px solid #6364ff"}}>
                    <div style={{fontSize:9,fontWeight:800,color:"#6364ff",letterSpacing:".12em",textTransform:"uppercase",marginBottom:5}}>Open Social APIs</div>
                    <p style={{fontSize:11,color:T.onVar,lineHeight:1.6,marginBottom:6}}><strong style={{color:"#6364ff"}}>Mastodon</strong> — public hashtag timelines, no auth needed.</p>
                    <p style={{fontSize:11,color:T.onVar,lineHeight:1.6}}><strong style={{color:"#00bc8c"}}>Lemmy</strong> — federated open-source Reddit alternative, free search API.</p>
                  </div>
                  {socialMeta?.status&&<div style={{background:T.low,borderRadius:5,padding:"10px 14px",borderLeft:"3px solid #00bc8c"}}>
                    <div style={{fontSize:9,fontWeight:800,color:"#00bc8c",marginBottom:4}}>SOURCE HEALTH</div>
                    <div style={{fontSize:10,color:T.onVar}}>Mastodon active tags: {socialMeta.status.mastodon||0}</div>
                    <div style={{fontSize:10,color:T.onVar}}>Lemmy active queries: {socialMeta.status.lemmy||0}</div>
                    <div style={{fontSize:10,color:T.secondary,fontWeight:700,marginTop:4}}>Total: {socialMeta.status.total||redditItems.length} signals</div>
                  </div>}
                </div>
              </div>
            </div>
          )}

          {/* ── LOTTERY PULSE ──────────────────────────────────────── */}
          {tab==="lottery"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
                <div>
                  <div style={{fontSize:9,color:T.lottery,textTransform:"uppercase",letterSpacing:".2em",fontWeight:800,marginBottom:5}}>🎰 ME Public Sentiment Analysis</div>
                  <h1 style={{fontFamily:"Manrope",fontSize:30,fontWeight:900,letterSpacing:"-.5px"}}>Lottery Pulse</h1>
                  <p style={{color:T.onVar,fontSize:12,marginTop:5}}>{lotteryItems.length} signals · {lotMeta.meSignals||0} ME-specific · Reddit + HN + Wikipedia</p>
                </div>
                <button onClick={loadLottery} disabled={lotteryLoading}
                  style={{padding:"7px 14px",background:T.low,border:`1px solid ${T.lottery}33`,color:T.lottery,borderRadius:4,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,...(lotteryLoading?{animation:"spin 1s linear infinite",display:"inline-block"}:{})}}>⟳</span>
                  {lotteryLoading?"Fetching…":"Refresh Lottery"}
                </button>
              </div>

              {/* Stats strip */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:18}}>
                {[
                  ["Total Signals",   lotteryItems.length,                     T.lottery],
                  ["ME Signals",      lotMeta.meSignals||0,                    T.primary],
                  ["Dominant Mood",   lotMeta.dominantMood||"—",               T.lottery],
                  ["Avg Upvote",      `${lotMeta.avgUpvoteRatio||0}%`,         T.secondary],
                  ["Uncertainty",     `${lotMeta.uncertaintyScore||0}%`,       lotMeta.uncertaintyScore>60?T.error:lotMeta.uncertaintyScore>30?T.tertiary:T.secondary],
                ].map(([l,v,col])=>(
                  <div key={l} style={{background:T.low,borderRadius:5,padding:"12px 14px",borderTop:`2px solid ${col}`}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.onVar,marginBottom:4}}>{l}</div>
                    <div style={{fontFamily:"Manrope",fontSize:18,fontWeight:900,color:col}}>{v}</div>
                  </div>))}
              </div>

              {/* AI + Uncertainty + Mood split */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:18}}>

                {/* AI psych insight */}
                <div className="card lot-card" style={{border:`1px solid ${T.lottery}33`}}>
                  <div style={{fontSize:9,fontWeight:800,color:T.lottery,letterSpacing:".12em",textTransform:"uppercase",marginBottom:10}}>🧠 AI Psych Insight</div>
                  {lotteryBrief?._error?(
                    <p style={{fontSize:11,color:T.error}}>{lotteryBrief._error}</p>
                  ):lotteryBrief?(
                    <>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <div style={{width:44,height:44,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%,${T.lottery}cc,${T.lottery}44)`,boxShadow:`0 0 18px ${T.lottery}88`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:`2px solid ${T.lottery}55`,flexShrink:0}}>
                          {lotteryBrief.overallMood==="EUPHORIC"?"🎰":lotteryBrief.overallMood==="HOPEFUL"?"🍀":lotteryBrief.overallMood==="ANXIOUS"?"😰":lotteryBrief.overallMood==="CYNICAL"?"🙄":"😑"}
                        </div>
                        <div>
                          <div style={{fontFamily:"Manrope",fontSize:14,fontWeight:900,color:T.lottery}}>{lotteryBrief.overallMood||"—"}</div>
                          {lotteryBrief.dominantNarrative&&<div style={{fontSize:10,color:T.onVar,fontStyle:"italic"}}>"{lotteryBrief.dominantNarrative}"</div>}
                        </div>
                      </div>
                      <p style={{fontSize:11,color:T.onSurf,lineHeight:1.7,marginBottom:10}}>{lotteryBrief.psychInsight}</p>
                      {lotteryBrief.keyEmotions?.length>0&&(
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          {lotteryBrief.keyEmotions.map(e=>(<span key={e} style={{fontSize:9,background:`${T.lottery}22`,color:T.lottery,padding:"2px 7px",borderRadius:8,fontWeight:700}}>{e}</span>))}
                        </div>
                      )}
                    </>
                  ):(
                    <div style={{textAlign:"center",paddingTop:16}}>
                      {lotteryLoading?<div style={{fontSize:24,animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</div>
                        :<p style={{fontSize:11,color:T.onVar}}>Add GEMINI_API_KEY in Vercel to enable AI insights.</p>}
                    </div>
                  )}
                </div>

                {/* Uncertainty gauge */}
                <div className="card" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,alignSelf:"flex-start"}}>Signal Uncertainty</div>
                  <div style={{position:"relative",width:90,height:90}}>
                    {(()=>{const s=lotMeta.uncertaintyScore??75;const col=s>60?T.error:s>30?T.tertiary:T.secondary;const r=38,cx=45,cy=45,circ=2*Math.PI*r;return(
                      <svg width="90" height="90" viewBox="0 0 90 90">
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${col}22`} strokeWidth="8"/>
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="8"
                          strokeDasharray={`${(s/100)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round"
                          style={{transition:"stroke-dasharray 1s ease"}}/>
                        <text x={cx} y={cx-2} textAnchor="middle" fill={col} fontSize="16" fontWeight="900" fontFamily="Manrope">{s}</text>
                        <text x={cx} y={cx+12} textAnchor="middle" fill={col} fontSize="7" fontWeight="700" fontFamily="Manrope">%</text>
                      </svg>);})()}
                  </div>
                  <div style={{fontSize:11,fontWeight:800,color:lotMeta.uncertaintyScore>60?T.error:lotMeta.uncertaintyScore>30?T.tertiary:T.secondary}}>
                    {(lotMeta.uncertaintyScore??75)<30?"CLEAR SIGNAL":(lotMeta.uncertaintyScore??75)<60?"MIXED SIGNALS":"HIGH NOISE"}
                  </div>
                  <p style={{fontSize:10,color:T.onVar,textAlign:"center",lineHeight:1.5}}>
                    {(lotMeta.uncertaintyScore??75)<30?"Strong consistent mood across ME communities"
                      :(lotMeta.uncertaintyScore??75)<60?"Some variance between countries and communities"
                      :"Contradictory signals — interpret with caution"}
                  </p>
                </div>

                {/* Mood distribution */}
                <div className="card">
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:14}}>Mood Distribution</div>
                  {lotteryBrief?.sentimentSplit
                    ?[["Positive",T.secondary,lotteryBrief.sentimentSplit.positive||0],["Neutral",T.onVar,lotteryBrief.sentimentSplit.neutral||0],["Negative",T.error,lotteryBrief.sentimentSplit.negative||0]].map(([l,c,v])=><SentBar key={l} label={l} color={c} pct={v}/>)
                    :[["HOPEFUL",T.lottery,lotMeta.moodDist?.HOPEFUL||0],["NEUTRAL",T.onVar,lotMeta.moodDist?.NEUTRAL||0],["CYNICAL",T.tertiary,lotMeta.moodDist?.CYNICAL||0],["ANXIOUS","#f87171",lotMeta.moodDist?.ANXIOUS||0]].map(([l,c,v])=><SentBar key={l} label={l} color={c} pct={lotteryItems.length?Math.round((v/lotteryItems.length)*100):0}/>)
                  }
                  {lotteryBrief&&!lotteryBrief._error&&(
                    <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div>
                        <div style={{fontSize:9,color:T.secondary,fontWeight:800,marginBottom:5}}>✓ Opportunity</div>
                        {(lotteryBrief.opportunitySignals||[]).map((s,i)=><div key={i} style={{fontSize:10,color:T.onVar,marginBottom:3}}>→ {s}</div>)}
                      </div>
                      <div>
                        <div style={{fontSize:9,color:T.error,fontWeight:800,marginBottom:5}}>⚠ Risk</div>
                        {(lotteryBrief.riskSignals||[]).map((s,i)=><div key={i} style={{fontSize:10,color:T.onVar,marginBottom:3}}>→ {s}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter + feed */}
              <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
                {["ALL","HOPEFUL","CYNICAL","ANXIOUS","NEUTRAL"].map(f=>(
                  <button key={f} className={`chip${lotteryFilter===f?" lot-on":""}`} onClick={()=>setLotteryFilter(f)}>{f}</button>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:14}}>
                <div>
                  {lotteryLoading&&!lotteryItems.length?[...Array(5)].map((_,i)=><div key={i} style={{background:T.mid,height:65,borderRadius:5,marginBottom:7,opacity:.4}}/>)
                    :lotteryFiltered.length===0
                      ?<div style={{color:T.onVar,textAlign:"center",padding:40}}>No lottery signals. Try refreshing.</div>
                      :lotteryFiltered.map(item=><FeedCard key={item.id} item={item} lotteryMode/>)}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div className="card">
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:10}}>Sources</div>
                    {[...new Set(lotteryItems.map(i=>i.source))].slice(0,8).map(src=>{const cnt=lotteryItems.filter(i=>i.source===src).length;return(
                      <div key={src} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10}}>{src}</span><span style={{fontSize:10,color:T.lottery,fontWeight:800}}>{cnt}</span></div>);})}
                  </div>
                  <div className="card" style={{border:`1px solid ${T.lottery}22`}}>
                    <div style={{fontSize:9,fontWeight:800,color:T.lottery,marginBottom:5}}>ME Context</div>
                    <p style={{fontSize:10,color:T.onVar,lineHeight:1.6}}>Signals from ME Reddit communities (r/UAE, r/saudiarabia, r/qatar etc.) searching for lottery, lucky draw, raffle & winning sentiment. Uncertainty score measures how divided/noisy the community signal is.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── COUNTRIES ─────────────────────────────────────────── */}
          {tab==="country"&&(
            <div>
              {[["GCC","GCC"],[["Levant","Levant"]],["N.Africa","North Africa"],["Other","Other MENA"]].flat(Infinity).filter((_,i)=>i%2===0).map((grp,gi)=>(
                <div key={grp} style={{marginBottom:10}}>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:5}}>{{GCC:"GCC","Levant":"Levant","N.Africa":"North Africa","Other":"Other MENA"}[grp]||grp}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {MENA_COUNTRIES.filter(c=>c.group===grp&&c.id!=="Regional").map(c=>(
                      <button key={c.id} className={`cbtn${activeCountry===c.id?" active":""}`} onClick={()=>setActiveCountry(c.id)}>{c.flag} {c.id}</button>))}
                  </div>
                </div>
              ))}
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
                    </div></div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"Manrope",fontSize:48,fontWeight:900,color:col,lineHeight:1}}>{cd.count}</div>
                      <div style={{fontSize:10,color:T.onVar}}>total signals</div>
                      {topSec&&<div style={{marginTop:4,fontSize:10,color:secColor(topSec[0])}}>{SECTIONS[topSec[0]]?.label||topSec[0]} focus</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
                    {["ALL","CRITICAL","WARNING","POSITIVE","STABLE","NEUTRAL"].map(f=>(
                      <button key={f} className={`chip${feedFilter===f?" on":""}`} onClick={()=>setFeedFilter(f)}>{f} ({sentMap[f]||0})</button>))}
                  </div>
                  {cd.items.filter(i=>feedFilter==="ALL"||i.sentiment?.label===feedFilter).slice(0,30).map(item=><FeedCard key={item.id} item={item}/>)}
                  {cd.items.length===0&&<div style={{color:T.onVar,textAlign:"center",padding:40}}>No signals for {activeCountry} yet. Try bulk ingest.</div>}
                </div>);
              })()}
            </div>
          )}

          {/* ── ANALYSIS ─────────────────────────────────────────── */}
          {tab==="analysis"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
                <div>
                  <h1 style={{fontFamily:"Manrope",fontSize:30,fontWeight:900,letterSpacing:"-.5px"}}>Trend Analysis</h1>
                  <p style={{color:T.onVar,fontSize:13,marginTop:5,maxWidth:480}}>Advanced metrics for key MENA themes · {allItems.length} signals · {MENA_COUNTRIES.length-1} countries monitored</p>
                </div>
                {lastRefresh&&<div style={{fontSize:10,color:T.onVar,fontFamily:"'JetBrains Mono',monospace",background:T.mid,padding:"7px 12px",borderRadius:4}}>📅 {lastRefresh.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:14,marginBottom:14}}>
                <div className="card">
                  <div style={{fontFamily:"Manrope",fontSize:16,fontWeight:800,marginBottom:3}}>Mention Impact Evolution</div>
                  <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".12em",marginBottom:12}}>Signal Volume by Section</div>
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
                  <div style={{fontFamily:"Manrope",fontSize:15,fontWeight:800,marginBottom:3}}>Volume by Country</div>
                  <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".12em",marginBottom:14}}>Top 5 Geographic Priority</div>
                  {MENA_COUNTRIES.filter(c=>["Saudi Arabia","UAE","Qatar","Egypt","Israel"].includes(c.id)).map(c=>{const cnt=allItems.filter(i=>i.country===c.id).length;const pct=allItems.length?Math.round(cnt/allItems.length*100):0;return(
                    <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:14}}>{c.flag}</span><span style={{fontSize:11,fontWeight:600}}>{c.id}</span></div>
                      <span style={{fontSize:11,fontWeight:800,color:T.primary,fontFamily:"'JetBrains Mono',monospace"}}>{pct}%</span>
                    </div>);})}
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
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>{c.flag} {c.id}</span><span style={{fontSize:10,color:posP>50?T.secondary:T.tertiary,fontWeight:700}}>{dom}</span></div>
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
                      {brief.userSentiment&&<div style={{marginTop:8,fontSize:10,color:userSentCol,fontWeight:700}}>User Sentiment: {brief.userSentiment}</div>}
                    </div>)}
                </div>
              </div>
            </div>
          )}

          {/* ── SOURCES ───────────────────────────────────────────── */}
          {tab==="sources"&&(
            <div>
              <div style={{marginBottom:22}}>
                <h1 style={{fontFamily:"Manrope",fontSize:30,fontWeight:900,letterSpacing:"-.5px"}}>Source Management</h1>
                <p style={{color:T.onVar,fontSize:13,marginTop:5,maxWidth:560}}>All open-source ingestion channels for MENA and Lottery intelligence.</p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
                {[["News Sources",Object.values(srcStatuses).filter(s=>s==="active").length,T.secondary],["Social Active",redditItems.length>0?2:0,"#6364ff"],["Total Signals",allItems.length,T.primary],["Lottery Signals",lotteryItems.length,T.lottery]].map(([l,v,col])=>(
                  <div key={l} style={{background:T.low,borderRadius:5,padding:"12px 14px",borderTop:`2px solid ${col}`}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.onVar,marginBottom:4}}>{l}</div>
                    <div style={{fontFamily:"Manrope",fontSize:20,fontWeight:900,color:col}}>{v}</div>
                  </div>))}
              </div>
              {/* Bulk ingest section */}
              <div className="card" style={{marginBottom:16,border:`1px solid ${T.primary}22`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div><div style={{fontFamily:"Manrope",fontSize:15,fontWeight:800}}>30-Day Bulk Ingest</div><p style={{fontSize:11,color:T.onVar,marginTop:3}}>7 RSS feeds + 10 HN queries + Wikipedia — server-side via /api/ingest. Social: Mastodon + Lemmy via /api/social (live).</p></div>
                  <button onClick={loadBulk} disabled={bulkLoading}
                    style={{padding:"8px 16px",background:bulkLoading?T.high:`linear-gradient(135deg,${T.priCont},${T.primary}55)`,border:`1px solid ${T.primary}33`,color:T.primary,borderRadius:4,fontSize:11,fontWeight:700,cursor:bulkLoading?"not-allowed":"pointer",whiteSpace:"nowrap"}}>
                    {bulkLoading?`${bulkProgress.stage} (${bulkProgress.pct}%)`:"Run Bulk Ingest"}
                  </button>
                </div>
                {bulkError&&<div style={{fontSize:11,color:T.error,marginTop:6}}>⚠ {bulkError}</div>}
                {bulkMeta&&<div style={{fontSize:10,color:T.secondary,marginTop:6}}>✓ {bulkMeta.totalFiltered} articles ingested in {bulkMeta.elapsedMs}ms</div>}
              </div>
              {/* Source table */}
              <div style={{background:T.low,borderRadius:6,overflow:"hidden"}}>
                <div style={{background:T.high,padding:"10px 16px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 80px",gap:12,fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:T.onVar}}>
                  <span>Source</span><span>Type</span><span>Frequency</span><span>Status</span><span>Signals</span>
                </div>
                {[
                  ...RSS_SOURCES.map(s=>({id:s.id,name:s.label,type:"RSS",freq:"Live",status:srcStatuses[s.id]||"unknown",cnt:items.filter(i=>i.source===s.label).length,color:T.tertiary})),
                  {id:"mastodon",name:"Mastodon Hashtags (12 ME tags)",type:"Mastodon",freq:"Live",status:redditItems.filter(i=>i.sourceType==="Mastodon").length>0?"active":"unknown",cnt:redditItems.filter(i=>i.sourceType==="Mastodon").length,color:"#6364ff"},
                  {id:"lemmy",name:"Lemmy Federated Search (9 queries)",type:"Lemmy",freq:"Live",status:redditItems.filter(i=>i.sourceType==="Lemmy").length>0?"active":"unknown",cnt:redditItems.filter(i=>i.sourceType==="Lemmy").length,color:"#00bc8c"},
                  {id:"hn",name:"Hacker News Algolia",type:"HN",freq:"Live",status:srcStatuses.hackernews||"unknown",cnt:items.filter(i=>i.source==="Hacker News").length,color:"#f97316"},
                  {id:"lot",name:"Lottery (Reddit ME + HN)",type:"Lottery",freq:"Live",status:lotteryItems.length>0?"active":"unknown",cnt:lotteryItems.length,color:T.lottery},
                  {id:"gemini",name:"Gemini 2.5 Flash AI",type:"Serverless",freq:"On Demand",status:brief&&!brief._error?"active":"unknown",cnt:0,color:T.primary},
                ].map((src,i)=>(
                  <div key={src.id} style={{padding:"11px 16px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 80px",gap:12,alignItems:"center",borderTop:i>0?`1px solid ${T.outVar}11`:"none"}}>
                    <span style={{fontSize:12,fontWeight:700,color:src.type==="Lottery"?T.lottery:T.onSurf}}>{src.name}</span>
                    <span style={{fontSize:10,background:`${src.color}22`,color:src.color,padding:"2px 7px",borderRadius:8,fontWeight:700,width:"fit-content"}}>{src.type}</span>
                    <span style={{fontSize:10,color:T.onVar}}>{src.freq}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{width:7,height:7,borderRadius:"50%",background:src.status==="active"?T.secondary:src.status==="warn"?T.tertiary:T.outVar,boxShadow:src.status==="active"?`0 0 7px ${T.secondary}88`:"none"}}/>
                      <span style={{fontSize:11,fontWeight:700,color:src.status==="active"?T.secondary:src.status==="warn"?T.tertiary:T.onVar}}>{src.status==="active"?"Active":src.status==="warn"?"Partial":src.status==="error"?"Error":"—"}</span>
                    </div>
                    <span style={{fontSize:12,fontWeight:800,color:src.type==="Lottery"?T.lottery:T.primary}}>{src.cnt>0?src.cnt:"—"}</span>
                  </div>))}
              </div>
              <div style={{background:`${T.priCont}22`,borderRadius:6,padding:"14px 16px",border:`1px solid ${T.primary}22`,marginTop:14,display:"flex",gap:12}}>
                <span style={{fontSize:18,flexShrink:0}}>ℹ️</span>
                <div>
                  <div style={{fontWeight:700,fontSize:12,color:T.primary,marginBottom:4}}>100% Free & Open-Source Stack</div>
                  <p style={{fontSize:11,color:T.onVar,lineHeight:1.6}}>RSS via /api/rss serverless proxy · Reddit public JSON (no auth) · HN Algolia API · Open-Meteo weather · ExchangeRate-API · Gemini 2.5 Flash AI (GEMINI_API_KEY in Vercel env vars). Lottery: ME Reddit search + HN + Wikipedia — no keys required.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
