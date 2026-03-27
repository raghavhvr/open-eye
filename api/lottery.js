// api/lottery.js — ME Lottery Pulse
// Sources:
//   1. Pullpush Reddit: r/lottery (top posts), r/dubai, r/UAE, r/expats (ME-filtered)
//   2. Lemmy: lottery/gambling topics
//   3. HN: no date filter, broad lottery queries
// Strategy: fetch real engaging content, filter/prioritise ME-relevant, show global as context

const LOT_HOPEFUL=["win","winner","jackpot","lucky","dream","hope","million","ticket","chance","raffle","prize","draw","blessed","fortune","rich","wealth","congratulations","won","awarded","claimed","collected"];
const LOT_CYNICAL=["scam","fraud","rigged","impossible","waste","sucker","odds","cheat","fake","illegal","banned","haram","forbidden","corrupt","addiction","trap","beware","warning","regret","never win"];
const LOT_ANXIOUS=["debt","desperate","spent","need","last","only","please","help","poor","broke","struggling","worry","afford","savings","emergency","losing everything"];

function classifyLottery(text){
  const t=(text||"").toLowerCase();
  const h=LOT_HOPEFUL.filter(w=>t.includes(w)).length;
  const c=LOT_CYNICAL.filter(w=>t.includes(w)).length;
  const a=LOT_ANXIOUS.filter(w=>t.includes(w)).length;
  if(a>1)return"ANXIOUS";
  if(c>h+1)return"CYNICAL";
  if(h>c+1)return"HOPEFUL";
  if(h>0)return"HOPEFUL";
  return"NEUTRAL";
}

function isME(text){
  const t=(text||"").toLowerCase();
  return["uae","dubai","abu dhabi","sharjah","saudi","gulf","qatar","kuwait","oman","bahrain","arab","expat in","mahzooz","emirates draw","big ticket","duty free","dream dubai","dirham","aed"].some(k=>t.includes(k));
}

const LOT_KW=["lottery","jackpot","won","winner","winning","lucky","raffle","prize","draw","million","ticket","duty free","big ticket","mahzooz","gambling","lotto","lucky draw","scratch","grand prize","sweepstake","powerball"];

// ── Pullpush Reddit ───────────────────────────────────────────────────────────
async function fetchPullpush(sub, size=100, sortType="score") {
  try {
    const url=`https://api.pullpush.io/reddit/search/submission/?subreddit=${sub}&size=${size}&sort=desc&sort_type=${sortType}`;
    const r=await fetch(url,{headers:{"User-Agent":"OpenEye/1.0"},signal:AbortSignal.timeout(12000)});
    if(!r.ok)return[];
    const d=await r.json();
    return(d.data||[])
      .filter(p=>p.title&&!p.removed_by_category)
      .filter(p=>{
        // For ME subs, filter for lottery keywords; for r/lottery, take all
        if(sub==="lottery")return true;
        const text=(p.title+" "+(p.selftext||"")).toLowerCase();
        return LOT_KW.some(k=>text.includes(k));
      })
      .map(p=>{
        const text=p.title+" "+(p.selftext||"");
        return{
          id:`reddit-lot-${p.id}`,
          title:p.title,
          summary:(p.selftext||"").replace(/\n+/g," ").trim().slice(0,240)||`↑${p.score||0} · 💬${p.num_comments||0} comments`,
          url:`https://reddit.com${p.permalink||""}`,
          timestamp:new Date((p.created_utc||0)*1000).toISOString(),
          source:`r/${sub}`,
          sourceType:"Reddit",
          tag:isME(text)?"ME-LOT":"LOT",
          country:isME(text)?"Regional":"Global",
          score:p.score||0,
          comments:p.num_comments||0,
          upvoteRatio:p.upvote_ratio||0.75,
        };
      });
  }catch{return[];}
}

// ── HN — no date filter, broad lottery queries ────────────────────────────────
async function fetchHN(){
  const queries=["lottery jackpot winner","gambling psychology winning","Dubai lottery UAE","lottery scam fraud","lottery addiction problem","big jackpot winner story"];
  const all=[];const seen=new Set();
  await Promise.allSettled(queries.map(async q=>{
    try{
      const d=await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=8`).then(r=>r.json());
      for(const h of(d.hits||[])){
        if(!h.title||seen.has(h.objectID))continue;
        seen.add(h.objectID);
        const text=h.title+" "+(h.url||"");
        if(!LOT_KW.some(k=>text.toLowerCase().includes(k)))continue;
        all.push({
          id:"hn-lot-"+h.objectID,title:h.title,
          summary:`${h.points||0} pts · ${h.num_comments||0} comments`,
          url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,
          timestamp:h.created_at,source:"Hacker News",sourceType:"HN",
          tag:isME(h.title)?"ME-LOT":"LOT",country:isME(h.title)?"Regional":"Global",
          score:h.points||0,comments:h.num_comments||0,upvoteRatio:0.8,
        });
      }
    }catch{}
  }));
  return all;
}

// ── Lemmy ─────────────────────────────────────────────────────────────────────
async function fetchLemmy(q){
  try{
    const r=await fetch(`https://lemmy.world/api/v3/search?q=${encodeURIComponent(q)}&type_=Posts&sort=New&limit=10`,{signal:AbortSignal.timeout(8000)});
    if(!r.ok)return[];
    const d=await r.json();
    const cutoff=Date.now()-60*24*3600*1000;
    return(d.posts||[])
      .filter(p=>{
        if(!p.post?.name)return false;
        if(new Date(p.post.published).getTime()<cutoff)return false;
        const t=(p.post.name+" "+(p.post.body||"")).toLowerCase();
        return LOT_KW.some(k=>t.includes(k));
      })
      .map(p=>{
        const post=p.post;const counts=p.counts||{};
        const text=post.name+" "+(post.body||"");
        return{
          id:"lemmy-lot-"+post.id,title:post.name,
          summary:(post.body||"").slice(0,220)||`↑${counts.score||0}`,
          url:post.ap_id||post.url||"",timestamp:post.published,
          source:"Lemmy",sourceType:"Lemmy",
          tag:isME(text)?"ME-LOT":"LOT",country:isME(text)?"Regional":"Global",
          score:counts.score||0,comments:counts.comments||0,upvoteRatio:0.75,
        };
      });
  }catch{return[];}
}

function calcUncertainty(items){
  if(items.length<5)return 78;
  const mc={HOPEFUL:0,CYNICAL:0,ANXIOUS:0,NEUTRAL:0};
  for(const i of items)mc[classifyLottery(i.title+" "+(i.summary||""))]++;
  const dom=Math.max(...Object.values(mc));
  return Math.min(99,Math.max(1,Math.round((1-dom/items.length)*55+(items.length<10?20:0))));
}

export default async function handler(req,res){
  if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  const [redditLottery, redditDubai, redditUAE, redditExpats, hnItems, lemmyResults]=await Promise.all([
    fetchPullpush("lottery",100,"score"),       // r/lottery top posts (global, high engagement)
    fetchPullpush("dubai",100,"created_utc"),   // r/dubai - filter for lottery keywords
    fetchPullpush("UAE",100,"created_utc"),     // r/UAE - filter for lottery keywords
    fetchPullpush("expats",50,"created_utc"),   // r/expats
    fetchHN(),
    Promise.allSettled(["lottery jackpot winner","UAE Dubai lottery","gambling winning psychology","lottery scam fraud","lottery big win"].map(fetchLemmy)),
  ]);

  const all=[
    ...redditLottery,...redditDubai,...redditUAE,...redditExpats,...hnItems,
    ...(lemmyResults.filter(r=>r.status==="fulfilled").flatMap(r=>r.value)),
  ];

  const seen=new Set();
  const unique=all.filter(i=>{if(!i.id||seen.has(i.id))return false;seen.add(i.id);return true;});

  // ME signals first, then by score
  unique.sort((a,b)=>{
    const aME=isME(a.title+a.summary)?1:0;
    const bME=isME(b.title+b.summary)?1:0;
    if(bME!==aME)return bME-aME;
    if(b.score!==a.score)return b.score-a.score;
    return new Date(b.timestamp)-new Date(a.timestamp);
  });

  const moodDist={HOPEFUL:0,CYNICAL:0,ANXIOUS:0,NEUTRAL:0};
  for(const item of unique)moodDist[classifyLottery(item.title+" "+(item.summary||""))]++;
  const dominantMood=Object.entries(moodDist).sort((a,b)=>b[1]-a[1])[0]?.[0]||"NEUTRAL";
  const meSignals=unique.filter(i=>isME(i.title+(i.summary||""))).length;
  const ratios=unique.filter(r=>r.upvoteRatio>0).map(r=>r.upvoteRatio);
  const avgUpvoteRatio=ratios.length?Math.round(ratios.reduce((a,b)=>a+b,0)/ratios.length*100):60;

  res.setHeader("Cache-Control","s-maxage=300,stale-while-revalidate=600");
  return res.status(200).json({
    items:unique,
    meta:{totalSignals:unique.length,meSignals,sourceDiversity:new Set(unique.map(r=>r.sourceType)).size,avgUpvoteRatio,uncertaintyScore:calcUncertainty(unique),dominantMood,moodDist},
  });
}
