// api/social.js — Social Intelligence via Mastodon + Lemmy
// Replaces Reddit (403 from Vercel IPs). Both sources are free, open, no auth needed.

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
function stripHtml(html){return(html||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();}
function detectCountry(text){
  const t=(text||"").toLowerCase();
  const map=[
    ["UAE",["uae","dubai","abu dhabi","emirati","sharjah","ajman"]],
    ["Saudi Arabia",["saudi","riyadh","jeddah","aramco","ksa","mecca","neom"]],
    ["Qatar",["qatar","doha","qatari"]],
    ["Kuwait",["kuwait","kuwaiti"]],
    ["Jordan",["jordan","amman","jordanian"]],
    ["Oman",["oman","muscat","omani"]],
    ["Bahrain",["bahrain","manama"]],
    ["Lebanon",["lebanon","beirut","lebanese"]],
    ["Iraq",["iraq","baghdad","iraqi","basra","mosul"]],
    ["Egypt",["egypt","cairo","egyptian","suez"]],
    ["Israel",["israel","tel aviv","jerusalem","idf"]],
    ["Palestine",["palestine","gaza","west bank","hamas","palestinian"]],
    ["Yemen",["yemen","sanaa","houthi","yemeni"]],
    ["Iran",["iran","tehran","iranian","irgc"]],
  ];
  for(const[country,kw]of map){if(kw.some(k=>t.includes(k)))return country;}
  return"Regional";
}
function classify(text){
  const t=(text||"").toLowerCase();
  const sections={
    "🚨 Crisis":["war","conflict","ceasefire","attack","bomb","fire","flood","houthi","missile","casualties","killed","explosion","airstrike","siege"],
    "💼 Economy":["oil","opec","economy","gdp","inflation","market","investment","trade","startup","fund","aramco","property","salary","job","tourism","neom","stock","ipo"],
    "🏛️ Politics":["government","minister","policy","election","parliament","diplomacy","sanction","treaty","reform","decree","summit","president","royal","geopolitics","nuclear","coup"],
    "🌐 Expat":["visa","expat","cost of living","iqama","golden visa","traffic","metro","immigration","residency","permit","healthcare"],
    "🕌 Culture":["ramadan","eid","mosque","religion","entertainment","festival","education","university","women","sports","arts","heritage"],
    "💻 Tech":["ai","artificial intelligence","tech","innovation","crypto","blockchain","smart city","5g","solar","renewable","fintech","digital","cybersecurity"],
  };
  let best="Other",bestN=0;
  for(const[k,kw]of Object.entries(sections)){const n=kw.filter(w=>t.includes(w)).length;if(n>bestN){best=k;bestN=n;}}
  return best;
}

// ── Mastodon hashtag fetcher ───────────────────────────────────────────────────
const MASTODON_TAGS=[
  {tag:"UAE",      country:"UAE",          label:"Mastodon"},
  {tag:"Dubai",    country:"UAE",          label:"Mastodon"},
  {tag:"SaudiArabia",country:"Saudi Arabia",label:"Mastodon"},
  {tag:"MENA",     country:"Regional",     label:"Mastodon"},
  {tag:"MiddleEast",country:"Regional",    label:"Mastodon"},
  {tag:"Qatar",    country:"Qatar",        label:"Mastodon"},
  {tag:"Kuwait",   country:"Kuwait",       label:"Mastodon"},
  {tag:"Jordan",   country:"Jordan",       label:"Mastodon"},
  {tag:"Gaza",     country:"Palestine",    label:"Mastodon"},
  {tag:"Iran",     country:"Iran",         label:"Mastodon"},
  {tag:"OPEC",     country:"Regional",     label:"Mastodon"},
  {tag:"Israel",   country:"Israel",       label:"Mastodon"},
];

// ── Lemmy search queries ───────────────────────────────────────────────────────
const LEMMY_QUERIES=[
  {q:"UAE Dubai",      country:"UAE"},
  {q:"Saudi Arabia",   country:"Saudi Arabia"},
  {q:"Qatar Doha",     country:"Qatar"},
  {q:"MENA geopolitics",country:"Regional"},
  {q:"Middle East",    country:"Regional"},
  {q:"OPEC oil",       country:"Regional"},
  {q:"Houthi Red Sea", country:"Yemen"},
  {q:"Iran nuclear",   country:"Iran"},
  {q:"Israel Gaza",    country:"Palestine"},
];

async function fetchMastodonTag({tag,country}){
  try{
    const r=await fetch(
      `https://mastodon.social/api/v1/timelines/tag/${tag}?limit=10`,
      {signal:AbortSignal.timeout(6000),headers:{"Accept":"application/json"}}
    );
    if(!r.ok)return[];
    const posts=await r.json();
    return posts
      .filter(p=>p.content&&!p.reblog) // skip reposts
      .map(p=>{
        const txt=stripHtml(p.content);
        const full=txt+" "+tag;
        return{
          id:"masto-"+p.id,
          title:txt.slice(0,160)||`#${tag} signal`,
          summary:txt.slice(0,240),
          url:p.url||"",
          timestamp:p.created_at,
          source:`#${tag} (Mastodon)`,
          sourceType:"Mastodon",
          tag:tag.toUpperCase(),
          country:country||detectCountry(full),
          section:classify(full),
          sentiment:senti(full),
          score:p.favourites_count||0,
          comments:p.replies_count||0,
        };
      });
  }catch{return[];}
}

async function fetchLemmy({q,country}){
  try{
    const r=await fetch(
      `https://lemmy.world/api/v3/search?q=${encodeURIComponent(q)}&type_=Posts&sort=TopAll&limit=8&page=1`,
      {signal:AbortSignal.timeout(7000),headers:{"Accept":"application/json"}}
    );
    if(!r.ok)return[];
    const d=await r.json();
    return(d.posts||[]).map(p=>{
      const post=p.post;const counts=p.counts||{};
      const txt=post.name+" "+(post.body||"");
      return{
        id:"lemmy-"+post.id,
        title:post.name,
        summary:(post.body||"").slice(0,220)||`↑${counts.score||0} · 💬${counts.comments||0}`,
        url:post.ap_id||post.url||"",
        timestamp:post.published,
        source:`Lemmy (${post.community_id||"world"})`,
        sourceType:"Lemmy",
        tag:"SOCIAL",
        country:country||detectCountry(txt),
        section:classify(txt),
        sentiment:senti(txt),
        score:counts.score||0,
        comments:counts.comments||0,
      };
    });
  }catch{return[];}
}

export default async function handler(req,res){
  if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  const results=[];
  const seen=new Set();

  // Fetch all Mastodon tags + Lemmy queries in parallel
  const [mastoResults,lemmyResults]=await Promise.all([
    Promise.allSettled(MASTODON_TAGS.map(t=>fetchMastodonTag(t))),
    Promise.allSettled(LEMMY_QUERIES.map(q=>fetchLemmy(q))),
  ]);

  for(const r of mastoResults){if(r.status==="fulfilled")results.push(...r.value);}
  for(const r of lemmyResults){if(r.status==="fulfilled")results.push(...r.value);}

  // Deduplicate
  const unique=results.filter(i=>{if(!i.id||seen.has(i.id))return false;seen.add(i.id);return true;});
  unique.sort((a,b)=>(b.score-a.score)||new Date(b.timestamp)-new Date(a.timestamp));

  // Build status map
  const status={
    mastodon:mastoResults.filter(r=>r.status==="fulfilled"&&r.value.length>0).length,
    lemmy:lemmyResults.filter(r=>r.status==="fulfilled"&&r.value.length>0).length,
    total:unique.length,
  };

  // Sentiment dist
  const sentDist={CRITICAL:0,WARNING:0,POSITIVE:0,STABLE:0,NEUTRAL:0};
  unique.forEach(i=>{if(sentDist[i.sentiment?.label]!==undefined)sentDist[i.sentiment.label]++;});

  // Country dist
  const countryDist={};
  unique.forEach(i=>{countryDist[i.country]=(countryDist[i.country]||0)+1;});

  res.setHeader("Cache-Control","s-maxage=300,stale-while-revalidate=600");
  return res.status(200).json({ok:true,articles:unique,meta:{status,sentDist,countryDist,total:unique.length}});
}
