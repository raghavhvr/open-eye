import{useState,useEffect,useRef,useCallback}from"react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T={
  base:"#060e20",surface:"#0b1326",low:"#101828",mid:"#141e2f",
  high:"#1e2a3d",highest:"#263349",
  primary:"#6ea8ff",priCont:"#1a3a7a",
  secondary:"#34d399",secCont:"#064e3b",
  tertiary:"#fbbf24",terCont:"#451a03",
  error:"#f87171",errCont:"#7f1d1d",
  lottery:"#c084fc",lotCont:"#581c87",
  onSurf:"#e2e8f6",onVar:"#94a3b8",outline:"#334155",outVar:"#1e293b",
};

// ─── MENA COUNTRIES ────────────────────────────────────────────────────────────
const MENA_COUNTRIES=[
  {id:"UAE",         label:"UAE",   flag:"🇦🇪",group:"GCC",     keywords:["uae","dubai","abu dhabi","emirati","sharjah","ajman"]},
  {id:"Saudi Arabia",label:"KSA",   flag:"🇸🇦",group:"GCC",     keywords:["saudi","riyadh","jeddah","aramco","ksa","mecca","neom"]},
  {id:"Qatar",       label:"QAT",   flag:"🇶🇦",group:"GCC",     keywords:["qatar","doha","qatari"]},
  {id:"Kuwait",      label:"KUW",   flag:"🇰🇼",group:"GCC",     keywords:["kuwait","kuwaiti"]},
  {id:"Oman",        label:"OMN",   flag:"🇴🇲",group:"GCC",     keywords:["oman","muscat","omani"]},
  {id:"Bahrain",     label:"BHR",   flag:"🇧🇭",group:"GCC",     keywords:["bahrain","manama"]},
  {id:"Jordan",      label:"JOR",   flag:"🇯🇴",group:"Levant",  keywords:["jordan","amman","jordanian"]},
  {id:"Lebanon",     label:"LBN",   flag:"🇱🇧",group:"Levant",  keywords:["lebanon","beirut","lebanese"]},
  {id:"Syria",       label:"SYR",   flag:"🇸🇾",group:"Levant",  keywords:["syria","damascus","aleppo","syrian"]},
  {id:"Iraq",        label:"IRQ",   flag:"🇮🇶",group:"Levant",  keywords:["iraq","baghdad","iraqi","basra","mosul"]},
  {id:"Palestine",   label:"PSE",   flag:"🇵🇸",group:"Levant",  keywords:["palestine","gaza","west bank","hamas","palestinian"]},
  {id:"Israel",      label:"ISR",   flag:"🇮🇱",group:"Levant",  keywords:["israel","tel aviv","jerusalem","idf"]},
  {id:"Egypt",       label:"EGY",   flag:"🇪🇬",group:"N.Africa",keywords:["egypt","cairo","egyptian","suez","alexandria"]},
  {id:"Libya",       label:"LBY",   flag:"🇱🇾",group:"N.Africa",keywords:["libya","tripoli","benghazi","libyan"]},
  {id:"Tunisia",     label:"TUN",   flag:"🇹🇳",group:"N.Africa",keywords:["tunisia","tunis","tunisian"]},
  {id:"Algeria",     label:"DZA",   flag:"🇩🇿",group:"N.Africa",keywords:["algeria","algiers","algerian"]},
  {id:"Morocco",     label:"MAR",   flag:"🇲🇦",group:"N.Africa",keywords:["morocco","rabat","casablanca","moroccan"]},
  {id:"Sudan",       label:"SDN",   flag:"🇸🇩",group:"N.Africa",keywords:["sudan","khartoum","sudanese"]},
  {id:"Yemen",       label:"YEM",   flag:"🇾🇪",group:"Other",   keywords:["yemen","sanaa","houthi","yemeni","aden"]},
  {id:"Iran",        label:"IRN",   flag:"🇮🇷",group:"Other",   keywords:["iran","tehran","iranian","irgc"]},
  {id:"Regional",    label:"MENA",  flag:"🌍", group:"Regional",keywords:["mena","middle east","arab","gulf","gcc"]},
];
const COUNTRY_MAP=Object.fromEntries(MENA_COUNTRIES.map(c=>[c.id,c]));

// ─── SECTIONS ──────────────────────────────────────────────────────────────────
const SECTIONS={
  "🚨 Crisis":  {color:"#ef4444",label:"Crisis & Safety",     keywords:["war","conflict","ceasefire","attack","bomb","fire","flood","storm","houthi","missile","casualties","killed","explosion","earthquake","pandemic","airstrike","siege","displaced"]},
  "💼 Economy": {color:"#fbbf24",label:"Economy & Business",  keywords:["oil","opec","economy","gdp","inflation","market","investment","trade","startup","fund","aramco","adnoc","property","rent","salary","job","tourism","vision 2030","neom","stock","revenue","ipo"]},
  "🏛️ Politics":{color:"#6ea8ff",label:"Politics & Governance",keywords:["government","minister","policy","election","parliament","diplomacy","sanction","treaty","reform","law","decree","summit","president","prime minister","royal","cabinet","geopolitics","nuclear","coup"]},
  "🌐 Expat":   {color:"#34d399",label:"Expat & Daily Life",  keywords:["visa","expat","cost of living","iqama","golden visa","traffic","metro","food","restaurant","transport","immigration","residency","permit","school","healthcare","grocery","rent prices"]},
  "🕌 Culture": {color:"#22d3ee",label:"Culture & Society",   keywords:["ramadan","eid","mosque","religion","entertainment","festival","education","university","women","sports","arts","culture","social","marriage","family","heritage","cinema","music"]},
  "💻 Tech":    {color:"#a78bfa",label:"Tech & Innovation",   keywords:["ai","artificial intelligence","startup","tech","innovation","crypto","blockchain","smart city","5g","solar","renewable","fintech","digital","cybersecurity","g42","data center"]},
};

const RSS_SOURCES=[
  {id:"bbc-me",   label:"BBC Middle East",  url:"https://feeds.bbci.co.uk/news/world/middle_east/rss.xml"},
  {id:"aljazeera",label:"Al Jazeera",        url:"https://www.aljazeera.com/xml/rss/all.xml"},
  {id:"arabnews", label:"Arab News",         url:"https://www.arabnews.com/rss.xml"},
  {id:"guardian", label:"The Guardian",      url:"https://www.theguardian.com/world/rss"},
  {id:"national", label:"The National UAE",  url:"https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml"},
  {id:"mee",      label:"Middle East Eye",   url:"https://www.middleeasteye.net/rss"},
  {id:"aa",       label:"Anadolu Agency",    url:"https://www.aa.com.tr/en/rss/default?cat=world"},
];

// ─── SENTIMENT + CLASSIFY ──────────────────────────────────────────────────────
const POS_W=["growth","surge","record","success","deal","agreement","expands","boost","profit","milestone","launch","stable","peace","recovery","invest","improve","achieve","develop","partnership","innovation","win","hope","progress","rise","benefit","support","signed","approved","relief"];
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
  return "Regional";
}
// Lottery mood
const LOT_HOPEFUL=["win","winner","jackpot","lucky","dream","hope","million","tonight","ticket","chance","raffle","prize","draw","blessed","fortune","rich","wealth","congratulations","won","awarded"];
const LOT_CYNICAL=["scam","fraud","rigged","impossible","never","waste","sucker","odds","cheat","fake","illegal","banned","haram","forbidden","corrupt","addiction","trap"];
const LOT_ANXIOUS=["debt","desperate","lost","spent","need","last","only","please","help","poor","broke","struggling","crisis","worry","afford","family","savings"];
function lotteryMood(text){
  const t=(text||"").toLowerCase();
  const h=LOT_HOPEFUL.filter(w=>t.includes(w)).length;
  const c=LOT_CYNICAL.filter(w=>t.includes(w)).length;
  const a=LOT_ANXIOUS.filter(w=>t.includes(w)).length;
  if(a>1)return{label:"ANXIOUS",color:"#f87171",bg:"#7f1d1d22"};
  if(c>h+1)return{label:"CYNICAL",color:T.tertiary,bg:"#45160022"};
  if(h>c+1)return{label:"HOPEFUL",color:T.lottery,bg:"#58187722"};
  if(h>0)return{label:"HOPEFUL",color:T.lottery,bg:"#58187722"};
  return{label:"NEUTRAL",color:T.onVar,bg:"#1e293b22"};
}

// ─── DATA FETCHERS ─────────────────────────────────────────────────────────────
async function fetchRSS(src){
  try{
    const res=await fetch("/api/rss",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:src.url})});
    const d=await res.json();if(!d.items||!Array.isArray(d.items))return[];
    return d.items.slice(0,8).map(item=>{
      const txt=item.title+" "+(item.summary||"");
      return{id:item.guid||item.link,title:item.title,summary:(item.summary||"").slice(0,220),url:item.link,
        timestamp:new Date(item.pubDate||Date.now()),source:src.label,sourceType:"RSS",tag:"NEWS",
        country:detectCountry(txt),section:classify(txt),sentiment:senti(txt),score:0,comments:0};
    });
  }catch{return[];}
}
async function fetchHackerNews(){
  const since=Math.floor(Date.now()/1000)-7*24*3600;
  const queries=["middle east","OPEC oil","UAE technology","Saudi Arabia","Gulf geopolitics","Israel Gaza","Iran nuclear","Egypt economy","Iraq security","MENA finance"];
  const all=[];const seen=new Set();
  await Promise.allSettled(queries.map(async(q)=>{
    try{
      const d=await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=5&numericFilters=created_at_i>${since}`).then(r=>r.json());
      for(const h of(d.hits||[])){if(!h.title||seen.has(h.objectID))continue;seen.add(h.objectID);
        all.push({id:"hn-"+h.objectID,title:h.title,summary:`${h.points||0} pts · ${h.num_comments||0} comments`,
          url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,timestamp:new Date(h.created_at),
          source:"Hacker News",sourceType:"HN",tag:"TECH",country:detectCountry(h.title),
          section:classify(h.title),sentiment:senti(h.title),score:h.points||0,comments:h.num_comments||0});}
    }catch{}
  }));
  return all;
}
async function fetchSocial(){
  try{
    const[socialRes,redditRes]=await Promise.all([
      fetch("/api/social",{signal:AbortSignal.timeout(30000)}).then(r=>r.ok?r.json():{articles:[],meta:{}}),
      fetch("/api/reddit",{signal:AbortSignal.timeout(25000)}).then(r=>r.ok?r.json():{articles:[],meta:{}}),
    ]);
    const all=[...(socialRes.articles||[]),...(redditRes.articles||[])];
    const seen=new Set();
    const unique=all.filter(i=>{if(!i.id||seen.has(i.id))return false;seen.add(i.id);return true;})
      .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    return{
      articles:unique,
      meta:{
        ...(socialRes.meta||{}),
        redditCount:redditRes.articles?.length||0,
        mastodonCount:(socialRes.articles||[]).filter(i=>i.sourceType==="Mastodon").length,
        lemmyCount:(socialRes.articles||[]).filter(i=>i.sourceType==="Lemmy").length,
      }
    };
  }catch{return{articles:[],meta:{}};}
}
async function fetchStore(){
  try{
    const res=await fetch("/api/store-read",{signal:AbortSignal.timeout(10000)});
    if(!res.ok)return null;
    const d=await res.json();
    return d.ok&&d.articles?.length>0?d:null;
  }catch{return null;}
}
async function fetchBulkIngest(onProgress){
  onProgress({stage:"Checking Redis store…",pct:10});
  const stored=await fetchStore();
  if(stored){
    onProgress({stage:`Loaded ${stored.articles.length} signals from store`,pct:95});
    return stored;
  }
  onProgress({stage:"Fetching live sources…",pct:20});
  const res=await fetch("/api/ingest",{signal:AbortSignal.timeout(55000)});
  onProgress({stage:"Processing signals…",pct:60});
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||`HTTP ${res.status}`);}
  const data=await res.json();
  onProgress({stage:"Done",pct:100});
  return data;
}
async function fetchLottery(){
  try{const res=await fetch("/api/lottery");return await res.json();}
  catch{return{items:[],meta:{totalSignals:0,uncertaintyScore:75,moodDist:{HOPEFUL:0,CYNICAL:0,ANXIOUS:0,NEUTRAL:0},dominantMood:"NEUTRAL"}};}
}
async function fetchOpenMeteo(){try{const d=await fetch("https://api.open-meteo.com/v1/forecast?latitude=24.7136&longitude=46.6753&current=temperature_2m,wind_speed_10m&forecast_days=1").then(r=>r.json());return{temp:d.current?.temperature_2m,wind:d.current?.wind_speed_10m};}catch{return null;}}
async function fetchFX(){try{const d=await fetch("https://api.exchangerate-api.com/v4/latest/USD").then(r=>r.json());return{sar:d.rates?.SAR,aed:d.rates?.AED,qar:d.rates?.QAR,kwd:d.rates?.KWD};}catch{return null;}}
async function fetchGemini(items,mode="intelligence"){
  try{const res=await fetch("/api/brief",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({headlines:items.slice(0,14).map(i=>i.title||i),mode})});
  const d=await res.json();return res.ok?d:{_error:d.error||"API error"};}
  catch(e){return{_error:e.message};}
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
const ago=ts=>{const m=Math.floor((Date.now()-new Date(ts))/60000);if(m<1)return"just now";if(m<60)return`${m}m ago`;if(m<1440)return`${Math.floor(m/60)}h ago`;return`${Math.floor(m/1440)}d ago`;};
const secColor=s=>SECTIONS[s]?.color||T.outVar;
const sentColor=l=>l==="CRITICAL"?T.error:l==="WARNING"?T.tertiary:l==="POSITIVE"||l==="STABLE"?T.secondary:T.onVar;
const sentBg=l=>l==="CRITICAL"?`${T.errCont}55`:l==="WARNING"?`${T.terCont}55`:l==="POSITIVE"||l==="STABLE"?`${T.secCont}33`:`${T.outVar}22`;
const srcColor=t=>t==="Reddit"?"#ff6314":t==="RSS"?T.tertiary:t==="HN"?"#f97316":t==="Mastodon"?"#6364ff":t==="Lemmy"?"#00bc8c":T.primary;
function calcPulse(items){if(!items.length)return 50;const c=items.filter(i=>i.sentiment?.label==="CRITICAL").length,w=items.filter(i=>i.sentiment?.label==="WARNING").length,p=items.filter(i=>i.sentiment?.label==="POSITIVE").length,s=items.filter(i=>i.sentiment?.label==="STABLE").length;return Math.min(98,Math.max(10,Math.round(50+(p*4+s*2)-(c*9+w*4))));}
function dedup(arr){const s=new Set();return arr.filter(i=>{if(!i.id||s.has(i.id))return false;s.add(i.id);return true;});}

// ─── MAP COMPONENT ─────────────────────────────────────────────────────────────
const CARTO="https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all";
const MAP_TILES=[];
for(let y=5;y<=8;y++)for(let x=7;x<=12;x++)MAP_TILES.push(`${CARTO}/4/${x}/${y}.png`);
const MAP_COUNTRIES=[
  {id:"Morocco",x:11.4,y:37.7},{id:"Algeria",x:18.6,y:42.6},{id:"Tunisia",x:23.8,y:35.0},
  {id:"Libya",x:30.0,y:43.9},{id:"Egypt",x:38.9,y:45.0},{id:"Sudan",x:40.8,y:57.4},
  {id:"Lebanon",x:43.0,y:35.0},{id:"Palestine",x:42.7,y:37.6},{id:"Israel",x:42.6,y:38.1},
  {id:"Jordan",x:43.4,y:38.8},{id:"Syria",x:45.3,y:33.7},{id:"Iraq",x:49.0,y:35.8},
  {id:"Kuwait",x:52.0,y:40.8},{id:"Saudi Arabia",x:50.1,y:47.7},{id:"Bahrain",x:54.1,y:44.9},
  {id:"Qatar",x:54.6,y:45.9},{id:"UAE",x:57.0,y:47.6},{id:"Oman",x:59.2,y:49.9},
  {id:"Yemen",x:52.3,y:57.4},{id:"Iran",x:56.5,y:36.9},
];
function MENAMap({items,onCountryClick}){
  const[zoom,setZoom]=useState(1.5);
  const[pan,setPan]=useState({x:0.50,y:0.46});
  const[dragging,setDragging]=useState(false);
  const[dragStart,setDragStart]=useState(null);
  const containerRef=useRef(null);
  const touchRef=useRef(null);
  const clamp=z=>Math.min(4,Math.max(1,z));
  const onWheel=e=>{e.preventDefault();setZoom(z=>clamp(z+(e.deltaY>0?-0.2:0.2)));};
  const onMD=e=>{if(e.button!==0)return;setDragging(true);setDragStart({mx:e.clientX,my:e.clientY,px:pan.x,py:pan.y});e.preventDefault();};
  const onMM=e=>{if(!dragging||!dragStart||!containerRef.current)return;const rect=containerRef.current.getBoundingClientRect();const dx=((dragStart.mx-e.clientX)/rect.width)/zoom;const dy=((dragStart.my-e.clientY)/rect.height)*(0.44/(2/3))/zoom;setPan({x:dragStart.px+dx,y:dragStart.py+dy});};
  const onMU=()=>{setDragging(false);setDragStart(null);};
  const onTS=e=>{if(e.touches.length===1)touchRef.current={tx:e.touches[0].clientX,ty:e.touches[0].clientY,px:pan.x,py:pan.y};};
  const onTM=e=>{if(!touchRef.current||!containerRef.current||e.touches.length!==1)return;const rect=containerRef.current.getBoundingClientRect();const dx=((touchRef.current.tx-e.touches[0].clientX)/rect.width)/zoom;const dy=((touchRef.current.ty-e.touches[0].clientY)/rect.height)*(0.44/(2/3))/zoom;setPan({x:touchRef.current.px+dx,y:touchRef.current.py+dy});e.preventDefault();};
  const cData=id=>{const ci=items.filter(i=>i.country===id);if(!ci.length)return{count:0,col:T.outVar,dominant:"NEUTRAL"};const cnts={};ci.forEach(i=>{const l=i.sentiment?.label||"NEUTRAL";cnts[l]=(cnts[l]||0)+1;});const dom=Object.entries(cnts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"NEUTRAL";const col=dom==="CRITICAL"?T.error:dom==="WARNING"?T.tertiary:dom==="POSITIVE"||dom==="STABLE"?T.secondary:T.primary;return{count:ci.length,col,dominant:dom};};
  const ds=1/Math.sqrt(zoom);
  return(
    <div ref={containerRef} style={{width:"100%",borderRadius:8,overflow:"hidden",border:`1px solid ${T.outVar}33`,position:"relative",background:T.base,userSelect:"none",cursor:dragging?"grabbing":"grab"}} onWheel={onWheel} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={()=>{touchRef.current=null;}}>
      <div style={{width:"100%",height:0,paddingBottom:"44%",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,overflow:"hidden"}}>
          <div style={{position:"absolute",width:`${100*zoom}%`,height:`${(2/3)*zoom/0.44*100}%`,left:`${50-pan.x*zoom*100}%`,top:`${50-pan.y*(2/3)*zoom/0.44*100}%`,transition:dragging?"none":"left 0.1s,top 0.1s,width 0.2s,height 0.2s"}}>
            <div style={{position:"absolute",inset:0,display:"grid",gridTemplateColumns:"repeat(6,1fr)",gridTemplateRows:"repeat(4,1fr)"}}>
              {MAP_TILES.map((url,i)=><img key={i} src={url} alt="" draggable={false} style={{width:"100%",height:"100%",display:"block",objectFit:"cover",pointerEvents:"none"}} loading="eager" decoding="async"/>)}
            </div>
            {MAP_COUNTRIES.map(({id,x,y})=>{
              const cd=cData(id);const bsz=cd.count>15?16:cd.count>8?13:cd.count>3?10:cd.count>0?8:5;const sz=Math.round(bsz*ds);const op=cd.count>0?1:0.18;const showLbl=cd.count>2&&zoom>=1.2;
              return(
                <div key={id} onClick={e=>{e.stopPropagation();onCountryClick&&onCountryClick(id);}} title={`${id}: ${cd.count} signals`} style={{position:"absolute",left:`${x}%`,top:`${y}%`,transform:"translate(-50%,-50%)",cursor:"pointer",opacity:op,zIndex:2}} onMouseDown={e=>e.stopPropagation()} onMouseEnter={e=>{const d=e.currentTarget.querySelector(".dot");if(d)d.style.transform="scale(1.6)";}} onMouseLeave={e=>{const d=e.currentTarget.querySelector(".dot");if(d)d.style.transform="scale(1)";}}>
                  {cd.count>0&&<div style={{position:"absolute",width:sz*3,height:sz*3,borderRadius:"50%",border:`1px solid ${cd.col}44`,top:"50%",left:"50%",transform:"translate(-50%,-50%)",animation:"pulse-ring 2.5s ease infinite",pointerEvents:"none"}}/>}
                  <div className="dot" style={{width:sz,height:sz,borderRadius:"50%",background:cd.col,boxShadow:`0 0 ${sz*1.5}px ${cd.col}99`,border:`1.5px solid ${cd.col}88`,transition:"transform 0.15s",position:"relative",zIndex:1}}/>
                  {showLbl&&<div style={{position:"absolute",top:sz+2,left:"50%",transform:"translateX(-50%)",fontSize:Math.max(6,Math.round(7*ds)),color:T.onSurf,fontWeight:800,whiteSpace:"nowrap",fontFamily:"'JetBrains Mono',monospace",background:`${T.base}ee`,padding:"1px 3px",borderRadius:2,pointerEvents:"none",letterSpacing:"0.05em"}}>{id}</div>}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{position:"absolute",inset:0,zIndex:3,pointerEvents:"none",background:"radial-gradient(ellipse at 50% 50%, transparent 55%, #060e20cc 100%)"}}/>
        <div style={{position:"absolute",top:10,right:10,zIndex:10,display:"flex",flexDirection:"column",gap:4}}>
          {[["＋",0.4],["−",-0.4]].map(([l,d])=>(<button key={l} onClick={e=>{e.stopPropagation();setZoom(z=>clamp(z+d));}} style={{width:28,height:28,borderRadius:5,background:`${T.base}ee`,border:`1px solid ${T.outline}55`,color:T.primary,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,backdropFilter:"blur(4px)"}} onMouseEnter={e=>e.currentTarget.style.background=T.high} onMouseLeave={e=>e.currentTarget.style.background=`${T.base}ee`}>{l}</button>))}
          <button onClick={e=>{e.stopPropagation();setZoom(1.5);setPan({x:0.50,y:0.46});}} style={{width:28,height:28,borderRadius:5,background:`${T.base}ee`,border:`1px solid ${T.outline}55`,color:T.onVar,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onMouseEnter={e=>e.currentTarget.style.background=T.high} onMouseLeave={e=>e.currentTarget.style.background=`${T.base}ee`} title="Reset view">⌂</button>
        </div>
        <div style={{position:"absolute",top:10,left:10,zIndex:10,fontSize:8,color:`${T.onVar}99`,background:`${T.base}cc`,padding:"2px 6px",borderRadius:3,fontFamily:"'JetBrains Mono',monospace"}}>{zoom.toFixed(1)}×</div>
        <div style={{position:"absolute",bottom:8,left:10,zIndex:10,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontFamily:"Manrope",fontSize:9,fontWeight:800,color:T.onSurf,background:`${T.base}ee`,padding:"2px 6px",borderRadius:3}}>MENA Signal Map</span>
          {[[T.error,"Critical"],[T.tertiary,"Warning"],[T.secondary,"Stable"],[T.primary,"Active"]].map(([col,l])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:3,background:`${T.base}cc`,padding:"2px 5px",borderRadius:3}}><div style={{width:6,height:6,borderRadius:"50%",background:col,boxShadow:`0 0 4px ${col}`}}/><span style={{fontSize:8,color:T.onVar,fontWeight:700}}>{l}</span></div>))}
        </div>
        <div style={{position:"absolute",bottom:8,right:10,zIndex:10,fontSize:8,color:`${T.onVar}44`,background:`${T.base}99`,padding:"2px 6px",borderRadius:3}}>Scroll · Drag to pan</div>
      </div>
    </div>
  );
}

// ─── UI COMPONENTS ─────────────────────────────────────────────────────────────
function PulseRing({score,loading,col}){
  const c=col||(score>65?T.secondary:score>40?T.primary:T.error);
  const r=46,cx=56,cy=56,circ=2*Math.PI*r;
  return(<svg width="112" height="112" viewBox="0 0 112 112">
    <circle cx={cx} cy={cy} r={r+6} fill="none" stroke={`${c}10`} strokeWidth="1"/>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.mid} strokeWidth="8"/>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth="8"
      strokeDasharray={`${(score/100)*circ} ${circ*(1-score/100)}`} strokeDashoffset={circ/4} strokeLinecap="round"
      style={{transition:"stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)",filter:`drop-shadow(0 0 8px ${c}77)`}}/>
    {loading?<text x={cx} y={cy+5} textAnchor="middle" fill={T.onVar} fontSize="11">…</text>
      :<><text x={cx} y={cy-3} textAnchor="middle" fill={c} fontSize="24" fontWeight="900" fontFamily="Manrope">{score}</text>
        <text x={cx} y={cy+13} textAnchor="middle" fill={T.onVar} fontSize="7" fontWeight="700" letterSpacing="0.15em">PULSE</text></>}
  </svg>);
}
function Spark({data,color,w=80,h=28}){
  if(!data||data.length<2)return null;
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-4)+2}`).join(" ");
  return(<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}
function SentBar({label,color,pct}){return(<div style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:T.onVar}}>{label}</span><span style={{color,fontWeight:700}}>{pct}%</span></div><div style={{height:3,background:T.high,borderRadius:2,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:2,transition:"width .8s ease"}}/></div></div>);}

function FeedCard({item,lotteryMode}){
  const[exp,setExp]=useState(false);
  const sent=lotteryMode?lotteryMood(item.title):(item.sentiment||{label:"NEUTRAL",score:0});
  const sentLbl=lotteryMode?sent.label:(item.sentiment?.label||"NEUTRAL");
  const sc=secColor(item.section);const cI=COUNTRY_MAP[item.country]||{flag:"🌍"};
  const srcCol=srcColor(item.sourceType);
  return(
    <div onClick={()=>setExp(!exp)} style={{background:exp?T.high:T.mid,borderRadius:6,padding:"12px 14px",cursor:"pointer",transition:"all .15s",borderLeft:`3px solid ${lotteryMode?sent.color:sentColor(sentLbl)}`,marginBottom:6,border:`1px solid ${exp?T.highest:T.outVar}`,borderLeftWidth:3,borderLeftColor:lotteryMode?sent.color:sentColor(sentLbl)}}>
      <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",gap:4,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:3,letterSpacing:".08em",background:lotteryMode?sent.bg:sentBg(sentLbl),color:lotteryMode?sent.color:sentColor(sentLbl)}}>{sentLbl}</span>
            {!lotteryMode&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${sc}18`,color:sc}}>{SECTIONS[item.section]?.label||item.section}</span>}
            <span style={{fontSize:11}}>{cI.flag}</span>
            {item.score>20&&<span style={{fontSize:9,color:T.secondary,fontWeight:700}}>↑{item.score}</span>}
          </div>
          <p style={{fontSize:13,fontWeight:600,color:T.onSurf,lineHeight:1.45,margin:0,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:exp?99:2,WebkitBoxOrient:"vertical"}}>{item.title}</p>
          {exp&&item.summary&&item.summary!==item.title&&<p style={{fontSize:11,color:T.onVar,marginTop:7,lineHeight:1.6}}>{item.summary}</p>}
        </div>
        <div style={{textAlign:"right",flexShrink:0,paddingLeft:8}}>
          <span style={{fontSize:9,color:T.onVar,display:"block",whiteSpace:"nowrap"}}>{ago(item.timestamp)}</span>
          <span style={{fontSize:9,display:"block",marginTop:2,fontWeight:600,color:`${srcCol}99`}}>{item.source}</span>
        </div>
      </div>
      {exp&&item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:lotteryMode?T.lottery:T.primary,marginTop:8,display:"inline-flex",alignItems:"center",gap:3,textDecoration:"none",fontWeight:600}}>Open source <span style={{fontSize:11}}>↗</span></a>}
    </div>
  );
}

function StatCard({label,value,color,sub}){
  return(<div style={{background:T.low,borderRadius:6,padding:"12px 14px",borderTop:`2px solid ${color}`}}>
    <div style={{fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.onVar,marginBottom:4}}>{label}</div>
    <div style={{fontFamily:"Manrope",fontSize:20,fontWeight:900,color}}>{value}</div>
    {sub&&<div style={{fontSize:9,color:T.onVar,marginTop:2}}>{sub}</div>}
  </div>);
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App(){
  const[items,setItems]=useState([]);
  const[socialItems,setSocialItems]=useState([]);
  const[loading,setLoading]=useState(true);
  const[socialLoading,setSocialLoading]=useState(true);
  const[lotteryData,setLotteryData]=useState(null);
  const[lotteryLoading,setLotteryLoading]=useState(true);
  const[lotteryBrief,setLotteryBrief]=useState(null);
  const[lotteryFilter,setLotteryFilter]=useState("ALL");
  const[srcStatuses,setSrcStatuses]=useState({});
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
  const[socialFilter,setSocialFilter]=useState("ALL");
  const timerRef=useRef(null);

  const loadMain=useCallback(async()=>{
    setLoading(true);const statuses={},all=[];
    await Promise.allSettled(RSS_SOURCES.map(async src=>{const itms=await fetchRSS(src);statuses[src.id]=itms.length>0?"active":"error";all.push(...itms);}));
    const hn=await fetchHackerNews();statuses.hackernews=hn.length>0?"active":"warn";all.push(...hn);
    const sorted=dedup(all.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)));
    setItems(sorted);setSrcStatuses(statuses);
    const score=calcPulse(sorted);setPulseHist(p=>[...p.slice(-6),score]);
    setLastRefresh(new Date());setLoading(false);
    fetchOpenMeteo().then(setWeather);fetchFX().then(setFx);
    if(sorted.length>5){setBriefLoading(true);fetchGemini(sorted,"intelligence").then(b=>{setBrief(b);setBriefLoading(false);});}
  },[]);

  const loadSocial=useCallback(async()=>{
    setSocialLoading(true);
    const data=await fetchSocial();
    setSocialItems(data.articles||[]);
    setSocialMeta(data.meta||{});
    setSocialLoading(false);
  },[]);

  const loadLottery=useCallback(async()=>{
    setLotteryLoading(true);
    const data=await fetchLottery();
    setLotteryData(data);setLotteryLoading(false);
    if(data?.items?.length>3)fetchGemini(data.items,"lottery").then(setLotteryBrief);
  },[]);

  const loadBulk=useCallback(async()=>{
    setBulkLoading(true);setBulkError(null);setBulkProgress({stage:"Starting…",pct:2});
    try{
      const data=await fetchBulkIngest(p=>setBulkProgress(p));
      if(!data.ok)throw new Error(data.error||"Ingest failed");
      const existIds=new Set(items.map(i=>i.id));
      const fresh=(data.articles||[]).filter(a=>!existIds.has(a.id));
      setItems(prev=>dedup([...prev,...fresh].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))));
      if(data.sourceHealth){const ns={};(data.sourceHealth.rss||[]).forEach(s=>{ns[s.id]=s.status;});if(data.sourceHealth.hn)ns.hackernews=data.sourceHealth.hn.status;setSrcStatuses(p=>({...p,...ns}));}
      setBulkMeta(data.meta);setBulkProgress({stage:"Done!",pct:100});
    }catch(e){setBulkError(e.message);}
    finally{setTimeout(()=>{setBulkLoading(false);setBulkProgress({stage:"",pct:0});},2000);}
  },[items]);

  // Auto-load from Redis on startup
  useEffect(()=>{
    fetchStore().then(d=>{
      if(!d)return;
      setItems(prev=>dedup([...prev,...(d.articles||[])].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))));
      if(d.meta)setBulkMeta(d.meta);
    });
  },[]);

  useEffect(()=>{
    loadMain();loadSocial();loadLottery();
    timerRef.current=setInterval(()=>{loadMain();loadSocial();loadLottery();},5*60*1000);
    return()=>clearInterval(timerRef.current);
  },[loadMain,loadSocial,loadLottery]);

  // Derived state
  const allItems=dedup([...items,...socialItems].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)));
  const pScore=calcPulse(allItems);
  const sentCounts={CRITICAL:0,WARNING:0,POSITIVE:0,STABLE:0,NEUTRAL:0};
  allItems.forEach(i=>{if(sentCounts[i.sentiment?.label]!==undefined)sentCounts[i.sentiment.label]++;});
  const secCounts=Object.keys(SECTIONS).reduce((a,s)=>{a[s]=allItems.filter(i=>i.section===s).length;return a;},{});

  const filteredFeed=allItems.filter(i=>{
    if(feedFilter!=="ALL"&&i.sentiment?.label!==feedFilter)return false;
    if(secFilter!=="ALL"&&i.section!==secFilter)return false;
    if(searchQ){const q=searchQ.toLowerCase();if(!i.title.toLowerCase().includes(q)&&!i.country.toLowerCase().includes(q)&&!(i.source||"").toLowerCase().includes(q))return false;}
    return true;
  });
  const filteredSocial=socialItems.filter(i=>socialFilter==="ALL"||i.sentiment?.label===socialFilter);

  const lotteryItems=lotteryData?.items||[];
  const lotteryFiltered=lotteryFilter==="ALL"?lotteryItems:lotteryItems.filter(i=>lotteryMood(i.title+" "+(i.summary||"")).label===lotteryFilter);
  const lotMeta=lotteryData?.meta||{uncertaintyScore:75,moodDist:{HOPEFUL:0,CYNICAL:0,ANXIOUS:0,NEUTRAL:0},dominantMood:"NEUTRAL",meSignals:0};
  const userSentCol=brief?.userSentiment?({OPTIMISTIC:T.secondary,CAUTIOUS:T.primary,ANXIOUS:T.tertiary,FEARFUL:T.error,INDIFFERENT:T.onVar}[brief.userSentiment]||T.primary):T.primary;

  const NAV=[
    {id:"overview",label:"Overview",     icon:"dashboard"},
    {id:"feed",    label:"News Feed",    icon:"rss_feed"},
    {id:"social",  label:"Social Intel", icon:"forum"},
    {id:"lottery", label:"Lottery Pulse",icon:"casino",badge:lotteryItems.length||null},
    {id:"country", label:"Countries",    icon:"public"},
    {id:"analysis",label:"Analysis",     icon:"monitoring"},
    {id:"sources", label:"Sources",      icon:"layers"},
  ];

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}html,body{height:100%;background:${T.surface};color:${T.onSurf};}
    ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.high};border-radius:10px}
    .ms{font-family:'Material Symbols Outlined';font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24;vertical-align:middle;font-style:normal;line-height:1;font-size:inherit}
    .card{background:${T.low};border-radius:6px;padding:16px 18px;}
    .nav-btn{display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:5px;border:none;background:none;color:${T.onVar};font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:Inter,sans-serif;width:100%;margin-bottom:2px;}
    .nav-btn:hover{background:${T.mid};color:${T.onSurf};}
    .nav-btn.active{background:${T.mid};color:${T.primary};border-left:3px solid ${T.primary};padding-left:9px;}
    .nav-btn.lot-active{background:${T.mid};color:${T.lottery};border-left:3px solid ${T.lottery};padding-left:9px;}
    .chip{padding:4px 10px;border-radius:20px;border:1px solid ${T.outline}44;background:transparent;color:${T.onVar};font-size:10px;font-weight:600;cursor:pointer;transition:all .15s;font-family:Inter,sans-serif;}
    .chip:hover{border-color:${T.primary}55;color:${T.onSurf};}
    .chip.on{border-color:${T.primary};background:${T.priCont}33;color:${T.primary};}
    .chip.lot-on{border-color:${T.lottery};background:${T.lotCont}33;color:${T.lottery};}
    .cbtn{padding:5px 10px;border-radius:4px;border:1px solid ${T.outline}33;background:${T.mid};color:${T.onVar};font-size:11px;cursor:pointer;font-family:Inter,sans-serif;transition:all .15s;}
    .cbtn.active{border-color:${T.primary};color:${T.primary};background:${T.priCont}22;}
    .htop{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:4px;border:none;background:none;color:${T.onVar};font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;}
    .htop:hover{background:${T.mid};color:${T.onSurf};}
    .htop.active{color:${T.primary};}
    .htop.lot-active{color:${T.lottery};}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
    @keyframes ticker{0%{transform:translateX(100vw)}100%{transform:translateX(-100%)}}
    @keyframes lot-glow{0%,100%{box-shadow:0 0 10px ${T.lottery}22}50%{box-shadow:0 0 22px ${T.lottery}55}}
    @keyframes pulse-ring{0%{transform:translate(-50%,-50%) scale(0.8);opacity:0.8}100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    .live{animation:pulse 2s ease infinite}
    .ticker-txt{animation:ticker 120s linear infinite;white-space:nowrap;will-change:transform}
    .lot-card{animation:lot-glow 3s ease infinite}
    .fade-in{animation:fadeIn .2s ease}
    a{color:inherit;text-decoration:none;}
    button{font-family:inherit;}
  `;

  return(
    <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:T.surface,color:T.onSurf,display:"flex"}}>
      <style>{css}</style>

      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <aside style={{width:200,position:"fixed",left:0,top:0,bottom:0,background:T.base,borderRight:`1px solid ${T.outVar}33`,display:"flex",flexDirection:"column",zIndex:50,flexShrink:0}}>
        {/* Logo */}
        <div style={{padding:"16px 14px",borderBottom:`1px solid ${T.outVar}22`}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:28,height:28,background:`linear-gradient(135deg,${T.priCont},${T.primary}44)`,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,border:`1px solid ${T.primary}33`}}>🛰️</div>
            <div>
              <div style={{fontFamily:"Manrope",fontWeight:900,fontSize:13,color:T.primary,letterSpacing:".04em"}}>OPEN EYE</div>
              <div style={{fontSize:7,color:`${T.primary}55`,letterSpacing:".18em",textTransform:"uppercase",fontWeight:700}}>OSINT · v3</div>
            </div>
          </div>
        </div>

        {/* Pulse rings */}
        <div style={{padding:"12px 10px",borderBottom:`1px solid ${T.outVar}22`,display:"flex",gap:6,justifyContent:"center",alignItems:"center"}}>
          <div style={{textAlign:"center"}}>
            <PulseRing score={pScore} loading={loading&&!allItems.length}/>
            <div style={{fontSize:7,color:T.onVar,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",marginTop:2}}>Regional</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3,marginTop:3}}>
              <span className="live" style={{width:5,height:5,borderRadius:"50%",background:T.secondary,display:"inline-block"}}/>
              <span style={{fontSize:7,color:T.secondary,fontWeight:700}}>LIVE</span>
            </div>
          </div>
          <div style={{width:1,height:70,background:`${T.outVar}33`}}/>
          <div style={{textAlign:"center"}}>
            <PulseRing score={lotteryData?.meta?.uncertaintyScore??75} loading={lotteryLoading} col={T.lottery}/>
            <div style={{fontSize:7,color:T.onVar,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",marginTop:2}}>Uncertainty</div>
            {lotMeta.dominantMood&&<div style={{fontSize:7,color:T.lottery,fontWeight:700,marginTop:3}}>{lotMeta.dominantMood}</div>}
          </div>
        </div>

        {/* User sentiment chip */}
        {brief?.userSentiment&&(
          <div style={{padding:"7px 14px",borderBottom:`1px solid ${T.outVar}22`}}>
            <div style={{fontSize:7,color:T.onVar,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",marginBottom:3}}>User Sentiment</div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:userSentCol,boxShadow:`0 0 6px ${userSentCol}88`}}/>
              <span style={{fontSize:11,fontWeight:800,color:userSentCol,fontFamily:"Manrope"}}>{brief.userSentiment}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{padding:"8px 6px",flex:1,overflowY:"auto"}}>
          {NAV.map(n=>(
            <button key={n.id} className={`nav-btn${tab===n.id?(n.id==="lottery"?" lot-active":" active"):""}`} onClick={()=>setTab(n.id)}>
              <span className="ms" style={{fontSize:14}}>{n.icon}</span>
              <span style={{flex:1,textAlign:"left"}}>{n.label}</span>
              {n.badge&&<span style={{fontSize:8,background:`${T.lottery}22`,color:T.lottery,padding:"1px 5px",borderRadius:8,fontWeight:800}}>{n.badge}</span>}
            </button>
          ))}
        </nav>

        {/* FX rates */}
        <div style={{padding:"10px 14px",borderTop:`1px solid ${T.outVar}22`,fontSize:10}}>
          <div style={{color:`${T.onVar}77`,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:5,fontSize:9}}>FX · USD</div>
          {fx?[["SAR",fx.sar],["AED",fx.aed],["QAR",fx.qar],["KWD",fx.kwd]].map(([k,v])=>v&&(
            <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{color:T.onVar}}>{k}</span>
              <span style={{color:T.onSurf,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>{v.toFixed(3)}</span>
            </div>)):<div style={{color:`${T.onVar}44`,fontSize:10}}>Loading…</div>}
        </div>

        {/* Refresh */}
        <div style={{padding:"10px 12px",borderTop:`1px solid ${T.outVar}22`}}>
          <button onClick={()=>{loadMain();loadSocial();loadLottery();}} disabled={loading} style={{width:"100%",background:loading?T.high:`linear-gradient(135deg,${T.priCont},${T.primary}44)`,border:`1px solid ${T.primary}33`,color:T.primary,borderRadius:5,padding:"7px",fontSize:11,fontWeight:700,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .2s"}}>
            <span className="ms" style={{fontSize:14,...(loading?{animation:"spin 1s linear infinite",display:"inline-block"}:{})}}>refresh</span>
            {loading?"Refreshing…":"Refresh All"}
          </button>
          {lastRefresh&&<div style={{fontSize:8,color:`${T.onVar}44`,textAlign:"center",marginTop:4}}>{lastRefresh.toLocaleTimeString()}</div>}
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div style={{marginLeft:200,flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",minWidth:0}}>

        {/* Header */}
        <header style={{background:`${T.base}f0`,backdropFilter:"blur(16px)",borderBottom:`1px solid ${T.outVar}22`,position:"sticky",top:0,zIndex:40}}>
          <div style={{padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:46}}>
            <div style={{display:"flex",alignItems:"center",gap:2,overflow:"hidden"}}>
              {NAV.map(n=>(<button key={n.id} className={`htop${tab===n.id?(n.id==="lottery"?" lot-active":" active"):""}`} onClick={()=>setTab(n.id)}><span className="ms" style={{fontSize:13}}>{n.icon}</span>{n.label}</button>))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              {bulkMeta&&<span style={{fontSize:9,color:T.secondary,background:`${T.secCont}33`,padding:"2px 7px",borderRadius:8,fontWeight:700}}>📦 {bulkMeta.totalPushed||bulkMeta.totalFiltered} stored</span>}
              <span style={{fontSize:9,color:T.onVar}}>{allItems.length} signals</span>
              <span style={{fontSize:9,color:T.lottery,background:`${T.lotCont}33`,padding:"2px 7px",borderRadius:8,fontWeight:700}}>🎰 {lotteryItems.length}</span>
              <span style={{fontSize:9,color:T.secondary,background:`${T.secCont}22`,padding:"2px 7px",borderRadius:8,fontWeight:700}}>● ONLINE</span>
            </div>
          </div>
          {/* Ticker */}
          <div style={{borderTop:`1px solid ${T.outVar}11`,background:T.base,height:24,display:"flex",alignItems:"center",overflow:"hidden"}}>
            <span style={{fontSize:9,background:T.errCont,color:T.error,padding:"0 8px",height:"100%",display:"flex",alignItems:"center",fontWeight:800,flexShrink:0,letterSpacing:".05em"}}>● LIVE</span>
            <div style={{flex:1,overflow:"hidden",position:"relative",height:"100%"}}>
              <span className="ticker-txt" style={{fontSize:10,color:T.onVar,position:"absolute",top:"50%",transform:"translateY(-50%)",paddingLeft:16}}>
                {allItems.length>0?allItems.slice(0,12).map(i=>i.title).join("   ·   "):"Ingesting intelligence signals…"}
              </span>
            </div>
          </div>
        </header>

        <main style={{flex:1,padding:"22px 26px",overflow:"auto"}}>

          {/* ── OVERVIEW ─────────────────────────────────────────────── */}
          {tab==="overview"&&(
            <div className="fade-in">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".2em",fontWeight:700,marginBottom:5}}>Intelligence Dashboard · MENA Region</div>
                  <h1 style={{fontFamily:"Manrope",fontSize:28,fontWeight:900,letterSpacing:"-.5px",lineHeight:1}}>Middle East Activity Heatmap</h1>
                  <p style={{color:T.onVar,fontSize:12,marginTop:5,display:"flex",alignItems:"center",gap:8}}>
                    <span className="live" style={{width:6,height:6,borderRadius:"50%",background:T.secondary,flexShrink:0,display:"inline-block"}}/>
                    Real-time · {MENA_COUNTRIES.length-1} countries · {allItems.length} signals
                  </p>
                </div>
                <button onClick={loadBulk} disabled={bulkLoading} style={{padding:"8px 16px",background:bulkLoading?T.high:`linear-gradient(135deg,${T.priCont},${T.primary}44)`,border:`1px solid ${T.primary}33`,color:T.primary,borderRadius:5,fontSize:11,fontWeight:700,cursor:bulkLoading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
                  <span className="ms" style={{fontSize:14,...(bulkLoading?{animation:"spin 1s linear infinite",display:"inline-block"}:{})}}>refresh</span>
                  {bulkLoading?`${bulkProgress.stage} (${bulkProgress.pct}%)`:bulkMeta?"Refresh Bulk":"Load 30-Day Bulk"}
                </button>
              </div>

              {bulkError&&<div style={{background:`${T.errCont}22`,border:`1px solid ${T.error}33`,borderRadius:5,padding:"10px 14px",marginBottom:14,fontSize:11,color:T.error,display:"flex",alignItems:"center",gap:8}}><span className="ms" style={{fontSize:16}}>error</span>Bulk ingest error: {bulkError}</div>}
              {bulkMeta&&<div style={{background:`${T.secCont}15`,border:`1px solid ${T.secondary}22`,borderRadius:5,padding:"8px 14px",marginBottom:14,fontSize:10,color:T.secondary,display:"flex",alignItems:"center",gap:8}}><span className="ms" style={{fontSize:14}}>check_circle</span>{bulkMeta.totalPushed||bulkMeta.totalFiltered} signals in store · Last: {bulkMeta.lastIngest?new Date(bulkMeta.lastIngest).toLocaleString():"-"}</div>}

              <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:20,marginBottom:20}}>
                <div>
                  <MENAMap items={allItems} onCountryClick={id=>{setActiveCountry(id);setTab("country");}}/>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:14}}>
                    {Object.entries(secCounts).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([sec,cnt],i)=>(
                      <div key={sec} className="card" style={{cursor:"pointer",padding:"12px 14px",transition:"all .15s"}} onClick={()=>{setSecFilter(sec);setTab("feed");}} onMouseEnter={e=>e.currentTarget.style.background=T.mid} onMouseLeave={e=>e.currentTarget.style.background=T.low}>
                        <div style={{fontSize:18,marginBottom:6}}>{sec.slice(0,2)}</div>
                        <div style={{fontSize:8,color:T.onVar,textTransform:"uppercase",letterSpacing:".1em",fontWeight:700,marginBottom:2}}>TOPIC 0{i+1}</div>
                        <div style={{fontFamily:"Manrope",fontSize:11,fontWeight:800,lineHeight:1.3,color:T.onSurf}}>{SECTIONS[sec]?.label||sec}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:secColor(sec),marginTop:4,fontWeight:700}}>{cnt}</div>
                      </div>))}
                  </div>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div className="card" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                    <PulseRing score={pScore} loading={loading&&!allItems.length}/>
                    <div style={{display:"flex",gap:14}}>
                      {[["CRITICAL",T.error],["WARNING",T.tertiary],["POSITIVE",T.secondary]].map(([l,col])=>(
                        <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"Manrope",fontWeight:800,fontSize:15,color:col}}>{sentCounts[l]||0}</div><div style={{fontSize:8,color:T.onVar,letterSpacing:".06em"}}>{l}</div></div>))}
                    </div>
                    <Spark data={pulseHist} color={T.primary} w={120} h={24}/>
                  </div>

                  {/* Lottery card */}
                  <div className="card lot-card" style={{border:`1px solid ${T.lottery}33`,cursor:"pointer"}} onClick={()=>setTab("lottery")}>
                    <div style={{fontSize:9,color:T.lottery,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>🎰 Lottery Pulse</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div><div style={{fontFamily:"Manrope",fontSize:18,fontWeight:900,color:T.lottery}}>{lotMeta.dominantMood}</div><div style={{fontSize:9,color:T.onVar}}>dominant mood</div></div>
                      <div style={{textAlign:"right"}}><div style={{fontFamily:"Manrope",fontSize:18,fontWeight:900,color:lotMeta.uncertaintyScore>60?T.error:lotMeta.uncertaintyScore>30?T.tertiary:T.secondary}}>{lotMeta.uncertaintyScore}%</div><div style={{fontSize:9,color:T.onVar}}>uncertainty</div></div>
                    </div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {Object.entries(lotMeta.moodDist||{}).map(([mood,cnt])=>cnt>0&&(<span key={mood} style={{fontSize:8,padding:"2px 6px",borderRadius:8,background:`${T.lottery}18`,color:T.lottery,fontWeight:700}}>{mood} {cnt}</span>))}
                    </div>
                    <div style={{fontSize:10,color:T.lottery,marginTop:8,fontWeight:600}}>View Lottery Pulse →</div>
                  </div>

                  <div className="card">
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:T.onVar,marginBottom:10}}>Market Indicators</div>
                    {[["Brent Crude","$82.44","+1.24%",T.secondary],["DFM Index",fx?`${fx.aed?.toFixed(2)||"3.67"}`:"-","+0.42%",T.secondary],["TASI",fx?`${fx.sar?.toFixed(2)||"3.75"}`:"-","-0.15%",T.error]].map(([l,v,ch,col])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:9}}>
                        <div><div style={{fontSize:9,color:T.onVar,fontWeight:600,marginBottom:1}}>{l}</div><div style={{fontFamily:"Manrope",fontSize:16,fontWeight:900}}>{v}</div></div>
                        <span style={{fontSize:10,fontWeight:800,color:col,alignSelf:"flex-end"}}>{ch}</span>
                      </div>))}
                  </div>

                  <div className="card">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:T.onVar}}>Latest Signals</div>
                      <button onClick={()=>setTab("feed")} style={{fontSize:10,color:T.primary,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>All →</button>
                    </div>
                    {allItems.slice(0,4).map(item=>{const sc=secColor(item.section);return(
                      <div key={item.id} style={{borderLeft:`2px solid ${sc}`,paddingLeft:9,marginBottom:9}}>
                        <div style={{fontSize:9,fontWeight:700,color:sc,marginBottom:2,textTransform:"uppercase",letterSpacing:".06em"}}>{SECTIONS[item.section]?.label||item.section} · {ago(item.timestamp)}</div>
                        <div style={{fontSize:12,fontWeight:600,lineHeight:1.35,marginBottom:2,color:T.onSurf}}>{item.title.slice(0,70)}{item.title.length>70?"…":""}</div>
                        <div style={{fontSize:9,color:T.onVar}}>{item.source}</div>
                      </div>);})}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── NEWS FEED ─────────────────────────────────────────────── */}
          {tab==="feed"&&(
            <div className="fade-in">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <h1 style={{fontFamily:"Manrope",fontSize:28,fontWeight:900,letterSpacing:"-.5px"}}>Regional News Feed</h1>
                  <p style={{color:T.onVar,fontSize:12,marginTop:4}}>{allItems.length} signals · {RSS_SOURCES.length} RSS feeds + HN</p>
                </div>
                <div style={{background:T.low,borderRadius:5,padding:"0 10px",display:"flex",alignItems:"center",gap:6,height:34,border:`1px solid ${T.outline}33`}}>
                  <span className="ms" style={{fontSize:14,color:T.onVar}}>search</span>
                  <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search signals…" style={{background:"none",border:"none",outline:"none",fontSize:12,color:T.onSurf,width:170,fontFamily:"Inter,sans-serif"}}/>
                  {searchQ&&<button onClick={()=>setSearchQ("")} style={{background:"none",border:"none",color:T.onVar,cursor:"pointer",fontSize:14}}>×</button>}
                </div>
              </div>
              <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
                {["ALL","CRITICAL","WARNING","POSITIVE","STABLE","NEUTRAL"].map(f=>(<button key={f} className={`chip${feedFilter===f?" on":""}`} onClick={()=>setFeedFilter(f)}>{f}</button>))}
              </div>
              <div style={{display:"flex",gap:5,marginBottom:16,flexWrap:"wrap"}}>
                {["ALL",...Object.keys(SECTIONS)].map(s=>(<button key={s} className={`chip${secFilter===s?" on":""}`} onClick={()=>setSecFilter(s)}>{s}</button>))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 210px",gap:14}}>
                <div>
                  {loading&&!filteredFeed.length?[...Array(5)].map((_,i)=><div key={i} style={{background:T.mid,height:64,borderRadius:6,marginBottom:6,opacity:.3}}/>)
                    :filteredFeed.length===0?<div style={{textAlign:"center",padding:40,color:T.onVar,fontSize:13}}>No signals match your filters.</div>
                    :filteredFeed.slice(0,60).map(item=><FeedCard key={item.id} item={item}/>)}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div className="card">
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:10}}>Sentiment</div>
                    {[["POSITIVE",T.secondary],["NEUTRAL",T.onVar],["WARNING",T.tertiary],["CRITICAL",T.error]].map(([l,col])=><SentBar key={l} label={l} color={col} pct={allItems.length?Math.round((sentCounts[l]||0)/allItems.length*100):0}/>)}
                  </div>
                  {weather&&<div className="card"><div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:5}}>Riyadh Weather</div><div style={{fontFamily:"Manrope",fontSize:28,fontWeight:900,color:T.primary}}>{weather.temp}°C</div><div style={{fontSize:10,color:T.onVar,marginTop:3}}>Wind {weather.wind} km/h</div></div>}
                  <div className="card">
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:10}}>Top Sources</div>
                    {[...new Set(allItems.map(i=>i.source))].slice(0,7).map(src=>{const cnt=allItems.filter(i=>i.source===src).length;return(<div key={src} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,color:T.onVar}}>{src}</span><span style={{fontSize:10,color:T.primary,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{cnt}</span></div>);})}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SOCIAL INTEL ─────────────────────────────────────────── */}
          {tab==="social"&&(
            <div className="fade-in">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <div style={{fontSize:9,color:"#6364ff",textTransform:"uppercase",letterSpacing:".2em",fontWeight:700,marginBottom:5}}>Reddit · Mastodon · Lemmy</div>
                  <h1 style={{fontFamily:"Manrope",fontSize:28,fontWeight:900,letterSpacing:"-.5px"}}>Social Intelligence Pulse</h1>
                  <p style={{color:T.onVar,fontSize:12,marginTop:4}}>{socialItems.length} signals · {socialMeta.redditCount||0} Reddit · {socialMeta.mastodonCount||0} Mastodon · {socialMeta.lemmyCount||0} Lemmy</p>
                </div>
                <button onClick={loadSocial} disabled={socialLoading} style={{padding:"7px 14px",background:T.low,border:`1px solid ${T.outline}33`,color:T.onVar,borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  <span className="ms" style={{fontSize:14,...(socialLoading?{animation:"spin 1s linear infinite",display:"inline-block"}:{})}}>refresh</span>
                  {socialLoading?"Refreshing…":"Refresh Social"}
                </button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:18}}>
                {[
                  ["Total",socialItems.length,"#a855f7"],
                  ["Reddit",(socialMeta.redditCount||0),"#ff6314"],
                  ["Mastodon",(socialMeta.mastodonCount||0),"#6364ff"],
                  ["Lemmy",(socialMeta.lemmyCount||0),"#00bc8c"],
                  ["Critical",socialItems.filter(i=>i.sentiment?.label==="CRITICAL").length,T.error],
                ].map(([l,v,col])=><StatCard key={l} label={l} value={v} color={col}/>)}
              </div>

              <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
                {["ALL","CRITICAL","WARNING","POSITIVE","STABLE","NEUTRAL"].map(f=>(<button key={f} className={`chip${socialFilter===f?" on":""}`} onClick={()=>setSocialFilter(f)}>{f}</button>))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 210px",gap:14}}>
                <div>
                  {socialLoading&&!socialItems.length?[...Array(6)].map((_,i)=><div key={i} style={{background:T.mid,height:64,borderRadius:6,marginBottom:6,opacity:.3}}/>)
                    :filteredSocial.slice(0,50).map(item=><FeedCard key={item.id} item={item}/>)}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div className="card">
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:10}}>By Country</div>
                    {MENA_COUNTRIES.filter(c=>c.id!=="Regional").map(c=>{const cnt=socialItems.filter(i=>i.country===c.id).length;if(!cnt)return null;return(<div key={c.id} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:11}}>{c.flag} {c.id}</span><span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:"#a855f7",fontWeight:700}}>{cnt}</span></div>);})}
                  </div>
                  <div className="card" style={{borderLeft:`3px solid #ff6314`}}>
                    <div style={{fontSize:9,fontWeight:800,color:"#ff6314",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>Reddit via Pullpush</div>
                    <p style={{fontSize:11,color:T.onVar,lineHeight:1.6}}>r/dubai, r/UAE, r/saudiarabia, r/qatar, r/kuwait, r/oman, r/bahrain, r/expats, r/middleeast, r/arabs — no API key needed via Pullpush.io archive.</p>
                  </div>
                  <div className="card" style={{borderLeft:`3px solid #6364ff`}}>
                    <div style={{fontSize:9,fontWeight:800,color:"#6364ff",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>Mastodon + Lemmy</div>
                    <p style={{fontSize:11,color:T.onVar,lineHeight:1.6}}>Open social APIs — Mastodon hashtag timelines and Lemmy federated search. No auth required.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LOTTERY PULSE ────────────────────────────────────────── */}
          {tab==="lottery"&&(
            <div className="fade-in">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <div style={{fontSize:9,color:T.lottery,textTransform:"uppercase",letterSpacing:".2em",fontWeight:800,marginBottom:5}}>🎰 ME Public Sentiment</div>
                  <h1 style={{fontFamily:"Manrope",fontSize:28,fontWeight:900,letterSpacing:"-.5px"}}>Lottery Pulse</h1>
                  <p style={{color:T.onVar,fontSize:12,marginTop:4}}>{lotteryItems.length} signals · {lotMeta.meSignals||0} ME-specific · HN + Lemmy</p>
                </div>
                <button onClick={loadLottery} disabled={lotteryLoading} style={{padding:"7px 14px",background:T.low,border:`1px solid ${T.lottery}33`,color:T.lottery,borderRadius:5,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  <span className="ms" style={{fontSize:14,...(lotteryLoading?{animation:"spin 1s linear infinite",display:"inline-block"}:{})}}>refresh</span>
                  {lotteryLoading?"Fetching…":"Refresh"}
                </button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:18}}>
                {[["Total Signals",lotteryItems.length,T.lottery],["ME Signals",lotMeta.meSignals||0,T.primary],["Dominant Mood",lotMeta.dominantMood||"—",T.lottery],["Avg Upvote",`${lotMeta.avgUpvoteRatio||0}%`,T.secondary],["Uncertainty",`${lotMeta.uncertaintyScore||0}%`,lotMeta.uncertaintyScore>60?T.error:lotMeta.uncertaintyScore>30?T.tertiary:T.secondary]].map(([l,v,col])=><StatCard key={l} label={l} value={v} color={col}/>)}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:18}}>
                {/* AI insight */}
                <div className="card lot-card" style={{border:`1px solid ${T.lottery}33`}}>
                  <div style={{fontSize:9,fontWeight:800,color:T.lottery,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>🧠 AI Psych Insight</div>
                  {lotteryBrief?._error?<p style={{fontSize:11,color:T.error}}>{lotteryBrief._error}</p>
                    :lotteryBrief?(<>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <div style={{width:42,height:42,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%,${T.lottery}cc,${T.lottery}33)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:`2px solid ${T.lottery}44`,flexShrink:0}}>
                          {lotteryBrief.overallMood==="EUPHORIC"?"🎰":lotteryBrief.overallMood==="HOPEFUL"?"🍀":lotteryBrief.overallMood==="ANXIOUS"?"😰":lotteryBrief.overallMood==="CYNICAL"?"🙄":"😑"}
                        </div>
                        <div>
                          <div style={{fontFamily:"Manrope",fontSize:13,fontWeight:900,color:T.lottery}}>{lotteryBrief.overallMood||"—"}</div>
                          {lotteryBrief.dominantNarrative&&<div style={{fontSize:10,color:T.onVar,fontStyle:"italic"}}>"{lotteryBrief.dominantNarrative}"</div>}
                        </div>
                      </div>
                      <p style={{fontSize:11,color:T.onSurf,lineHeight:1.7,marginBottom:10}}>{lotteryBrief.psychInsight}</p>
                      {lotteryBrief.keyEmotions?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{lotteryBrief.keyEmotions.map(e=>(<span key={e} style={{fontSize:9,background:`${T.lottery}18`,color:T.lottery,padding:"2px 7px",borderRadius:8,fontWeight:700}}>{e}</span>))}</div>}
                    </>)
                    :<div style={{textAlign:"center",paddingTop:16}}>
                      {lotteryLoading?<div style={{fontSize:22,animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</div>:<p style={{fontSize:11,color:T.onVar}}>Add GEMINI_API_KEY in Vercel to enable AI insights.</p>}
                    </div>}
                </div>

                {/* Uncertainty */}
                <div className="card" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,alignSelf:"flex-start"}}>Signal Uncertainty</div>
                  {(()=>{const s=lotMeta.uncertaintyScore??75;const col=s>60?T.error:s>30?T.tertiary:T.secondary;const r=38,cx=45,cy=45,circ=2*Math.PI*r;return(
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${col}22`} strokeWidth="8"/>
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="8" strokeDasharray={`${(s/100)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round" style={{transition:"stroke-dasharray 1s ease"}}/>
                      <text x={cx} y={cx-1} textAnchor="middle" fill={col} fontSize="16" fontWeight="900" fontFamily="Manrope">{s}</text>
                      <text x={cx} y={cx+13} textAnchor="middle" fill={col} fontSize="7" fontWeight="700" fontFamily="Manrope">%</text>
                    </svg>);})()} 
                  <div style={{fontSize:11,fontWeight:800,color:lotMeta.uncertaintyScore>60?T.error:lotMeta.uncertaintyScore>30?T.tertiary:T.secondary}}>{(lotMeta.uncertaintyScore??75)<30?"CLEAR SIGNAL":(lotMeta.uncertaintyScore??75)<60?"MIXED SIGNALS":"HIGH NOISE"}</div>
                  <p style={{fontSize:10,color:T.onVar,textAlign:"center",lineHeight:1.5}}>{(lotMeta.uncertaintyScore??75)<30?"Strong consistent mood":"Some variance — interpret with care"}</p>
                </div>

                {/* Mood dist */}
                <div className="card">
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:14}}>Mood Distribution</div>
                  {lotteryBrief?.sentimentSplit
                    ?[["Positive",T.secondary,lotteryBrief.sentimentSplit.positive||0],["Neutral",T.onVar,lotteryBrief.sentimentSplit.neutral||0],["Negative",T.error,lotteryBrief.sentimentSplit.negative||0]].map(([l,c,v])=><SentBar key={l} label={l} color={c} pct={v}/>)
                    :[["HOPEFUL",T.lottery,lotMeta.moodDist?.HOPEFUL||0],["NEUTRAL",T.onVar,lotMeta.moodDist?.NEUTRAL||0],["CYNICAL",T.tertiary,lotMeta.moodDist?.CYNICAL||0],["ANXIOUS","#f87171",lotMeta.moodDist?.ANXIOUS||0]].map(([l,c,v])=><SentBar key={l} label={l} color={c} pct={lotteryItems.length?Math.round((v/lotteryItems.length)*100):0}/>)}
                  {lotteryBrief&&!lotteryBrief._error&&(
                    <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div><div style={{fontSize:9,color:T.secondary,fontWeight:800,marginBottom:4}}>✓ Opportunity</div>{(lotteryBrief.opportunitySignals||[]).map((s,i)=><div key={i} style={{fontSize:10,color:T.onVar,marginBottom:3}}>→ {s}</div>)}</div>
                      <div><div style={{fontSize:9,color:T.error,fontWeight:800,marginBottom:4}}>⚠ Risk</div>{(lotteryBrief.riskSignals||[]).map((s,i)=><div key={i} style={{fontSize:10,color:T.onVar,marginBottom:3}}>→ {s}</div>)}</div>
                    </div>)}
                </div>
              </div>

              <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
                {["ALL","HOPEFUL","CYNICAL","ANXIOUS","NEUTRAL"].map(f=>(<button key={f} className={`chip${lotteryFilter===f?" lot-on":""}`} onClick={()=>setLotteryFilter(f)}>{f}</button>))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 210px",gap:14}}>
                <div>
                  {lotteryLoading&&!lotteryItems.length?[...Array(5)].map((_,i)=><div key={i} style={{background:T.mid,height:64,borderRadius:6,marginBottom:6,opacity:.3}}/>)
                    :lotteryFiltered.length===0?<div style={{color:T.onVar,textAlign:"center",padding:40,fontSize:13}}>No lottery signals. Try refreshing.</div>
                    :lotteryFiltered.map(item=><FeedCard key={item.id} item={item} lotteryMode/>)}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div className="card">
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:10}}>Sources</div>
                    {[...new Set(lotteryItems.map(i=>i.source))].slice(0,8).map(src=>{const cnt=lotteryItems.filter(i=>i.source===src).length;return(<div key={src} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10,color:T.onVar}}>{src}</span><span style={{fontSize:10,color:T.lottery,fontWeight:700}}>{cnt}</span></div>);})}
                  </div>
                  <div className="card" style={{border:`1px solid ${T.lottery}22`}}>
                    <div style={{fontSize:9,fontWeight:800,color:T.lottery,marginBottom:5}}>ME Context</div>
                    <p style={{fontSize:10,color:T.onVar,lineHeight:1.6}}>Dubai Duty Free, Big Ticket Abu Dhabi, Mahzooz, and expat lucky draw sentiment from HN + Lemmy. Uncertainty = how divided community signals are.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── COUNTRIES ────────────────────────────────────────────── */}
          {tab==="country"&&(
            <div className="fade-in">
              {["GCC","Levant","N.Africa","Other"].map(grp=>(
                <div key={grp} style={{marginBottom:10}}>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".15em",color:T.onVar,marginBottom:5}}>{{"GCC":"Gulf Cooperation Council","Levant":"Levant","N.Africa":"North Africa","Other":"Other MENA"}[grp]}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {MENA_COUNTRIES.filter(c=>c.group===grp&&c.id!=="Regional").map(c=>{const cnt=allItems.filter(i=>i.country===c.id).length;return(<button key={c.id} className={`cbtn${activeCountry===c.id?" active":""}`} onClick={()=>setActiveCountry(c.id)}>{c.flag} {c.id} {cnt>0&&<span style={{fontSize:9,opacity:.7}}>({cnt})</span>}</button>);})}
                  </div>
                </div>
              ))}
              {(()=>{
                const c=COUNTRY_MAP[activeCountry];
                const ci=allItems.filter(i=>i.country===activeCountry);
                if(!ci.length)return<div style={{marginTop:24,textAlign:"center",padding:40,color:T.onVar,fontSize:13}}>No signals for {activeCountry} yet.</div>;
                const avg=ci.reduce((s,i)=>s+(i.sentiment?.score||0),0)/ci.length;
                const col=avg>0.2?T.secondary:avg<-0.2?T.error:T.tertiary;
                const sentMap={};ci.forEach(i=>{const l=i.sentiment?.label||"NEUTRAL";sentMap[l]=(sentMap[l]||0)+1;});
                const topSec=Object.entries(ci.reduce((a,i)=>{a[i.section]=(a[i.section]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1])[0];
                return(<div style={{marginTop:18}}>
                  <div style={{background:T.low,borderRadius:8,padding:"22px 26px",marginBottom:18,display:"grid",gridTemplateColumns:"1fr auto",gap:20,alignItems:"center",backgroundImage:`linear-gradient(135deg,${T.low} 70%,${col}0a 100%)`}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:40}}>{c?.flag||"🌍"}</span>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <h2 style={{fontFamily:"Manrope",fontSize:24,fontWeight:900,letterSpacing:"-.5px"}}>{activeCountry}</h2>
                          <span style={{fontSize:9,fontWeight:800,padding:"3px 10px",borderRadius:3,background:`${col}18`,color:col,letterSpacing:".08em"}}>{Object.entries(sentMap).sort((a,b)=>b[1]-a[1])[0]?.[0]||"NEUTRAL"}</span>
                        </div>
                        <p style={{fontSize:12,color:T.onVar}}>{c?.group||"MENA"} · {ci.length} signals{topSec?` · ${SECTIONS[topSec[0]]?.label||topSec[0]} focus`:""}</p>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"Manrope",fontSize:44,fontWeight:900,color:col,lineHeight:1}}>{ci.length}</div>
                      <div style={{fontSize:10,color:T.onVar}}>total signals</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
                    {["ALL","CRITICAL","WARNING","POSITIVE","STABLE","NEUTRAL"].map(f=>(<button key={f} className={`chip${feedFilter===f?" on":""}`} onClick={()=>setFeedFilter(f)}>{f} ({sentMap[f]||0})</button>))}
                  </div>
                  {ci.filter(i=>feedFilter==="ALL"||i.sentiment?.label===feedFilter).slice(0,30).map(item=><FeedCard key={item.id} item={item}/>)}
                </div>);
              })()}
            </div>
          )}

          {/* ── ANALYSIS ────────────────────────────────────────────── */}
          {tab==="analysis"&&(
            <div className="fade-in">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <h1 style={{fontFamily:"Manrope",fontSize:28,fontWeight:900,letterSpacing:"-.5px"}}>Trend Analysis</h1>
                  <p style={{color:T.onVar,fontSize:12,marginTop:4}}>{allItems.length} signals · {MENA_COUNTRIES.length-1} countries monitored</p>
                </div>
                {lastRefresh&&<div style={{fontSize:10,color:T.onVar,fontFamily:"'JetBrains Mono',monospace",background:T.mid,padding:"6px 12px",borderRadius:4}}>{lastRefresh.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 250px",gap:14,marginBottom:14}}>
                <div className="card">
                  <div style={{fontFamily:"Manrope",fontSize:15,fontWeight:800,marginBottom:3}}>Signal Volume by Topic</div>
                  <div style={{fontSize:9,color:T.onVar,textTransform:"uppercase",letterSpacing:".1em",marginBottom:12}}>Relative Activity</div>
                  {Object.entries(secCounts).sort((a,b)=>b[1]-a[1]).map(([sec,cnt])=>{const pct=allItems.length?Math.round(cnt/allItems.length*100):0;const col=secColor(sec);return(<div key={sec} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,fontWeight:600}}>{SECTIONS[sec]?.label||sec}</span><span style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:col,fontWeight:700}}>{cnt} ({pct}%)</span></div><div style={{height:4,background:T.high,borderRadius:2,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:col,transition:"width .8s ease",borderRadius:2}}/></div></div>);})}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div className="card">
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.onVar,marginBottom:12}}>Top Countries</div>
                    {[...new Set(allItems.map(i=>i.country))].filter(c=>c!=="Regional").map(c=>{const cnt=allItems.filter(i=>i.country===c).length;const pct=allItems.length?Math.round(cnt/allItems.length*100):0;if(!cnt)return null;const cm=COUNTRY_MAP[c];return(<div key={c} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:13}}>{cm?.flag||"🌍"}</span><span style={{fontSize:11,fontWeight:600}}>{c}</span></div><span style={{fontSize:11,fontWeight:800,color:T.primary,fontFamily:"'JetBrains Mono',monospace"}}>{pct}%</span></div>);}).slice(0,8)}
                  </div>
                  {brief&&!brief._error&&(
                    <div style={{background:`${T.priCont}22`,borderRadius:6,padding:"14px 16px",border:`1px solid ${T.primary}22`}}>
                      <div style={{fontSize:9,fontWeight:800,color:T.secondary,letterSpacing:".1em",textTransform:"uppercase",marginBottom:7}}>AI TREND UPDATE</div>
                      <div style={{fontFamily:"Manrope",fontSize:13,fontWeight:800,marginBottom:7}}>{brief.topTheme}</div>
                      <p style={{fontSize:11,color:T.onVar,lineHeight:1.6}}>{brief.summary}</p>
                      {brief.userSentiment&&<div style={{marginTop:8,fontSize:10,color:userSentCol,fontWeight:700}}>User Sentiment: {brief.userSentiment}</div>}
                    </div>)}
                </div>
              </div>
              {/* Cross-border sentiment */}
              <div className="card">
                <div style={{fontFamily:"Manrope",fontSize:15,fontWeight:800,marginBottom:12}}>Cross-Border Sentiment Analysis</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  {MENA_COUNTRIES.filter(c=>["UAE","Saudi Arabia","Qatar","Egypt","Israel","Jordan","Iraq","Lebanon"].includes(c.id)).map(c=>{
                    const ci=allItems.filter(i=>i.country===c.id);if(!ci.length)return null;
                    const pos=ci.filter(i=>["POSITIVE","STABLE"].includes(i.sentiment?.label)).length;
                    const neg=ci.filter(i=>["CRITICAL","WARNING"].includes(i.sentiment?.label)).length;
                    const posP=Math.round(pos/ci.length*100);const negP=Math.round(neg/ci.length*100);
                    const dom=posP>60?"FAVORABLE":posP>40?"PRAGMATIC":negP>40?"CAUTIOUS":"MIXED";
                    return(<div key={c.id} style={{background:T.mid,borderRadius:5,padding:"10px 12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{fontSize:12,fontWeight:700}}>{c.flag} {c.id}</span>
                        <span style={{fontSize:9,fontWeight:700,color:posP>50?T.secondary:T.tertiary}}>{dom}</span>
                      </div>
                      <div style={{height:4,background:T.high,borderRadius:2,overflow:"hidden",display:"flex"}}>
                        <div style={{width:`${posP}%`,background:T.secondary,transition:"width .6s"}}/>
                        <div style={{width:`${100-posP-negP}%`,background:T.outVar}}/>
                        <div style={{width:`${negP}%`,background:T.error,transition:"width .6s"}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9,color:T.onVar}}>
                        <span style={{color:T.secondary}}>{posP}% pos</span>
                        <span style={{color:T.error}}>{negP}% neg</span>
                      </div>
                    </div>);
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── SOURCES ─────────────────────────────────────────────── */}
          {tab==="sources"&&(
            <div className="fade-in">
              <div style={{marginBottom:20}}>
                <h1 style={{fontFamily:"Manrope",fontSize:28,fontWeight:900,letterSpacing:"-.5px"}}>Source Management</h1>
                <p style={{color:T.onVar,fontSize:12,marginTop:4}}>All ingestion channels · 100% open-source stack</p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
                <StatCard label="Active RSS" value={Object.values(srcStatuses).filter(s=>s==="active").length} color={T.secondary}/>
                <StatCard label="Social Signals" value={socialItems.length} color="#a855f7"/>
                <StatCard label="Total Signals" value={allItems.length} color={T.primary}/>
                <StatCard label="Stored (Redis)" value={bulkMeta?.totalPushed||bulkMeta?.totalFiltered||0} color={T.tertiary}/>
              </div>

              {/* Bulk ingest */}
              <div className="card" style={{marginBottom:16,border:`1px solid ${T.primary}22`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <div style={{fontFamily:"Manrope",fontSize:14,fontWeight:800}}>30-Day Bulk Ingest</div>
                    <p style={{fontSize:11,color:T.onVar,marginTop:3}}>Loads from Redis store (instant) or live-fetches 7 RSS feeds + HN + social sources.</p>
                  </div>
                  <button onClick={loadBulk} disabled={bulkLoading} style={{padding:"8px 16px",background:bulkLoading?T.high:`linear-gradient(135deg,${T.priCont},${T.primary}44)`,border:`1px solid ${T.primary}33`,color:T.primary,borderRadius:4,fontSize:11,fontWeight:700,cursor:bulkLoading?"not-allowed":"pointer",whiteSpace:"nowrap"}}>
                    {bulkLoading?`${bulkProgress.stage} (${bulkProgress.pct}%)`:bulkMeta?"Refresh Bulk":"Run Bulk Ingest"}
                  </button>
                </div>
                {bulkError&&<div style={{fontSize:11,color:T.error,marginTop:6}}>⚠ {bulkError}</div>}
                {bulkMeta&&<div style={{fontSize:10,color:T.secondary,marginTop:6}}>✓ {bulkMeta.totalPushed||bulkMeta.totalFiltered} signals · Last: {bulkMeta.lastIngest?new Date(bulkMeta.lastIngest).toLocaleString():"-"}</div>}
              </div>

              {/* Source table */}
              <div style={{background:T.low,borderRadius:6,overflow:"hidden",border:`1px solid ${T.outVar}22`}}>
                <div style={{background:T.high,padding:"9px 16px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 70px",gap:12,fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.onVar}}>
                  <span>Source</span><span>Type</span><span>Frequency</span><span>Status</span><span>Signals</span>
                </div>
                {[
                  ...RSS_SOURCES.map(s=>({id:s.id,name:s.label,type:"RSS",freq:"Live",status:srcStatuses[s.id]||"unknown",cnt:items.filter(i=>i.source===s.label).length,color:T.tertiary})),
                  {id:"reddit",name:"Reddit via Pullpush (10 subreddits)",type:"Reddit",freq:"Live",status:socialItems.filter(i=>i.sourceType==="Reddit").length>0?"active":"unknown",cnt:socialItems.filter(i=>i.sourceType==="Reddit").length,color:"#ff6314"},
                  {id:"mastodon",name:"Mastodon Hashtags (12 ME tags)",type:"Mastodon",freq:"Live",status:socialItems.filter(i=>i.sourceType==="Mastodon").length>0?"active":"unknown",cnt:socialItems.filter(i=>i.sourceType==="Mastodon").length,color:"#6364ff"},
                  {id:"lemmy",name:"Lemmy Federated Search",type:"Lemmy",freq:"Live",status:socialItems.filter(i=>i.sourceType==="Lemmy").length>0?"active":"unknown",cnt:socialItems.filter(i=>i.sourceType==="Lemmy").length,color:"#00bc8c"},
                  {id:"hn",name:"Hacker News Algolia",type:"HN",freq:"Live",status:srcStatuses.hackernews||"unknown",cnt:items.filter(i=>i.source==="Hacker News").length,color:"#f97316"},
                  {id:"redis",name:"Redis Store (Upstash)",type:"Cache",freq:"Hourly cron",status:bulkMeta?"active":"unknown",cnt:bulkMeta?.totalPushed||bulkMeta?.totalFiltered||0,color:T.secondary},
                  {id:"gemini",name:"Gemini 2.5 Flash AI",type:"AI",freq:"On demand",status:brief&&!brief._error?"active":"unknown",cnt:0,color:T.primary},
                ].map((src,i)=>(
                  <div key={src.id} style={{padding:"10px 16px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 70px",gap:12,alignItems:"center",borderTop:i>0?`1px solid ${T.outVar}18`:"none"}}>
                    <span style={{fontSize:12,fontWeight:600,color:T.onSurf}}>{src.name}</span>
                    <span style={{fontSize:10,background:`${src.color}18`,color:src.color,padding:"2px 7px",borderRadius:8,fontWeight:700,width:"fit-content"}}>{src.type}</span>
                    <span style={{fontSize:10,color:T.onVar}}>{src.freq}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:src.status==="active"?T.secondary:src.status==="warn"?T.tertiary:T.outVar,boxShadow:src.status==="active"?`0 0 6px ${T.secondary}88`:"none",flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:600,color:src.status==="active"?T.secondary:src.status==="warn"?T.tertiary:T.onVar}}>{src.status==="active"?"Active":src.status==="warn"?"Partial":src.status==="error"?"Error":"—"}</span>
                    </div>
                    <span style={{fontSize:12,fontWeight:800,color:T.primary,fontFamily:"'JetBrains Mono',monospace"}}>{src.cnt>0?src.cnt:"—"}</span>
                  </div>))}
              </div>

              <div style={{background:`${T.priCont}18`,borderRadius:6,padding:"14px 16px",border:`1px solid ${T.primary}18`,marginTop:14,display:"flex",gap:12}}>
                <span className="ms" style={{fontSize:20,color:T.primary,flexShrink:0}}>info</span>
                <div>
                  <div style={{fontWeight:700,fontSize:12,color:T.primary,marginBottom:4}}>100% Free & Open-Source Stack</div>
                  <p style={{fontSize:11,color:T.onVar,lineHeight:1.7}}>RSS proxy (api/rss.js) · Reddit via Pullpush.io (no auth) · Mastodon public API · Lemmy federated API · HN Algolia · Open-Meteo weather · ExchangeRate-API · Upstash Redis (free 256MB) · Gemini 2.5 Flash AI. Add GEMINI_API_KEY + UPSTASH credentials in Vercel environment variables.</p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
