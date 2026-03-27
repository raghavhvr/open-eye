// api/lottery.js — ME Lottery Pulse
// Sources: Mastodon (lottery/expat tags), Lemmy, HN, Wikipedia context
// Focus: Dubai Duty Free, BigTicket, expat lucky draws, ME gambling sentiment

const LOT_HOPEFUL=["win","winner","jackpot","lucky","dream","hope","million","tonight","ticket","chance","raffle","prize","draw","big","blessed","fortune","rich","wealth","luckydraw","sweepstake","congratulations","won","awarded","collected","claimed"];
const LOT_CYNICAL=["scam","fraud","rigged","impossible","never","waste","sucker","odds","cheat","fake","illegal","banned","haram","forbidden","corrupt","addiction","problem","loss","lost","regret","trap"];
const LOT_ANXIOUS=["debt","desperate","lost","spent","need","last","only","please","help","poor","broke","struggling","crisis","worry","afford","family","savings","rent"];

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
function stripHtml(html){return(html||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();}
function isMERelated(text){
  const t=(text||"").toLowerCase();
  return ["uae","dubai","abu dhabi","sharjah","saudi","riyadh","gulf","mena","qatar","doha","kuwait","oman","muscat","bahrain","arab","expat","big ticket","duty free","mahzooz","emirates draw","lulu","raffles"].some(k=>t.includes(k));
}

// ── Mastodon tags — broader set, ME-lottery specific ────────────────────────
const MASTO_LOT_TAGS=[
  "DubaiLottery","BigTicket","DutyFree","UAE","Dubai","expat",
  "lottery","jackpot","luckydraw","raffle","winning","gambling",
];

// ── Lemmy queries — more specific ME lottery terms ───────────────────────────
const LEMMY_LOT_QUERIES=[
  "Dubai Duty Free lottery draw",
  "Big Ticket Abu Dhabi winner",
  "UAE lottery expat win million",
  "Mahzooz Emirates draw",
  "lottery UAE Dubai lucky",
  "gambling middle east regulation",
  "online lottery gulf countries",
  "lucky draw expat salary million",
];

// ── HN queries — tech/finance angle on ME lottery ────────────────────────────
const HN_LOT_QUERIES=[
  "Dubai lottery millionaire",
  "UAE lucky draw expat",
  "lottery gambling regulation Gulf",
  "online lottery UAE legal",
  "lottery psychology winning odds",
];

// ── Wikipedia context articles ────────────────────────────────────────────────
const WIKI_TOPICS=[
  "Dubai Duty Free Millennium Millionaire",
  "Lottery",
  "Gambling in the United Arab Emirates",
  "Lucky draw",
  "Problem gambling",
];

// ── HN search with 30-day window ─────────────────────────────────────────────
async function fetchHNLottery(q){
  const since=Math.floor(Date.now()/1000)-30*24*3600;
  try{
    const d=await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=8&numericFilters=created_at_i>${since}`,
      {signal:AbortSignal.timeout(6000)}
    ).then(r=>r.json());
    return(d.hits||[]).map(h=>({
      id:"hn-lot-"+h.objectID,
      title:h.title,
      summary:`${h.points||0} pts · ${h.num_comments||0} comments`,
      url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,
      timestamp:h.created_at,
      source:"Hacker News",sourceType:"HN",tag:"TECH",
      country:isMERelated(h.title)?"Regional":"Global",
      score:h.points||0,comments:h.num_comments||0,upvoteRatio:0.8,
    }));
  }catch{return[];}
}

// ── Mastodon — relaxed filter, 14-day window ──────────────────────────────────
async function fetchMastodonLotteryTag(tag){
  try{
    const r=await fetch(
      `https://mastodon.social/api/v1/timelines/tag/${tag}?limit=20`,
      {signal:AbortSignal.timeout(7000),headers:{"Accept":"application/json"}}
    );
    if(!r.ok)return[];
    const posts=await r.json();
    const cutoff=Date.now()-14*24*3600*1000;
    // Lottery-relevant keywords — broad
    const lotKw=["win","won","jackpot","lottery","lucky","raffle","prize","draw","million","ticket","chance","gambling","casino","bet","sweepstake","luckydraw","duty free","big ticket","mahzooz"];
    return posts
      .filter(p=>{
        if(!p.content||p.reblog)return false;
        if(new Date(p.created_at).getTime()<cutoff)return false;
        const txt=stripHtml(p.content).toLowerCase();
        return lotKw.some(w=>txt.includes(w));
      })
      .map(p=>{
        const txt=stripHtml(p.content);
        const me=isMERelated(txt);
        return{
          id:"masto-lot-"+p.id,
          title:txt.slice(0,160)||`#${tag} signal`,
          summary:txt.slice(0,240),
          url:p.url||"",
          timestamp:p.created_at,
          source:`#${tag}`,sourceType:"Mastodon",
          tag:me?"ME-LOT":tag.toUpperCase(),
          country:me?"Regional":"Global",
          score:p.favourites_count||0,comments:p.replies_count||0,
          upvoteRatio:0.7+(p.favourites_count||0)/Math.max((p.favourites_count||0)+(p.replies_count||0)+1,1)*0.3,
        };
      });
  }catch{return[];}
}

// ── Lemmy — 30-day window, broader keywords ───────────────────────────────────
async function fetchLemmyLottery(q){
  try{
    const r=await fetch(
      `https://lemmy.world/api/v3/search?q=${encodeURIComponent(q)}&type_=Posts&sort=New&limit=10`,
      {signal:AbortSignal.timeout(7000)}
    );
    if(!r.ok)return[];
    const d=await r.json();
    const cutoff=Date.now()-30*24*3600*1000;
    const lotKw=["lottery","jackpot","win","gambling","lucky","raffle","prize","casino","bet","draw","million","ticket","duty free","big ticket"];
    return(d.posts||[])
      .filter(p=>{
        if(!p.post?.name)return false;
        if(new Date(p.post.published).getTime()<cutoff)return false;
        const t=(p.post.name+" "+(p.post.body||"")).toLowerCase();
        return lotKw.some(k=>t.includes(k));
      })
      .map(p=>{
        const post=p.post;const counts=p.counts||{};
        const txt=post.name+" "+(post.body||"");
        return{
          id:"lemmy-lot-"+post.id,
          title:post.name,
          summary:(post.body||"").slice(0,220)||`↑${counts.score||0} · 💬${counts.comments||0}`,
          url:post.ap_id||post.url||"",
          timestamp:post.published,
          source:"Lemmy",sourceType:"Lemmy",
          tag:isMERelated(txt)?"ME-LOT":"SOCIAL",
          country:isMERelated(txt)?"Regional":"Global",
          score:counts.score||0,comments:counts.comments||0,upvoteRatio:0.75,
        };
      });
  }catch{return[];}
}

// ── Wikipedia context ────────────────────────────────────────────────────────
async function fetchWikiLottery(topic){
  try{
    const d=await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`,
      {signal:AbortSignal.timeout(5000)}
    ).then(r=>r.json());
    if(!d.extract)return null;
    return{
      id:"wiki-lot-"+topic.replace(/\s+/g,"-"),
      title:d.title,
      summary:d.extract.slice(0,280),
      url:d.content_urls?.desktop?.page||"",
      timestamp:new Date().toISOString(),
      source:"Wikipedia",sourceType:"Wiki",tag:"INTEL",
      country:isMERelated(topic)?"UAE":"Global",
      score:0,comments:0,upvoteRatio:1,
    };
  }catch{return null;}
}

// ── Uncertainty score ────────────────────────────────────────────────────────
function calcUncertainty(items){
  if(items.length<5)return 78;
  const moodCounts={HOPEFUL:0,CYNICAL:0,ANXIOUS:0,NEUTRAL:0};
  const ratios=[];
  for(const item of items){
    const mood=classifyLottery(item.title+" "+(item.summary||""));
    moodCounts[mood]++;
    if(item.upvoteRatio>0)ratios.push(item.upvoteRatio);
  }
  const total=items.length;
  const dominant=Math.max(...Object.values(moodCounts));
  const dominance=dominant/total;
  const avgRatio=ratios.length?ratios.reduce((a,b)=>a+b,0)/ratios.length:0.6;
  const ratioVariance=ratios.length?ratios.reduce((acc,r)=>acc+Math.pow(r-avgRatio,2),0)/ratios.length:0.2;
  const raw=(1-dominance)*55+ratioVariance*25+(items.length<10?20:0);
  return Math.min(99,Math.max(1,Math.round(raw)));
}

export default async function handler(req,res){
  if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  const results=[];const seen=new Set();

  const [mastoResults,lemmyResults,hnResults,wikiResults]=await Promise.all([
    Promise.allSettled(MASTO_LOT_TAGS.map(tag=>fetchMastodonLotteryTag(tag))),
    Promise.allSettled(LEMMY_LOT_QUERIES.map(q=>fetchLemmyLottery(q))),
    Promise.allSettled(HN_LOT_QUERIES.map(q=>fetchHNLottery(q))),
    Promise.allSettled(WIKI_TOPICS.map(t=>fetchWikiLottery(t))),
  ]);

  for(const r of mastoResults){if(r.status==="fulfilled")results.push(...r.value);}
  for(const r of lemmyResults){if(r.status==="fulfilled")results.push(...r.value);}
  for(const r of hnResults){if(r.status==="fulfilled")results.push(...r.value);}
  for(const r of wikiResults){if(r.status==="fulfilled"&&r.value)results.push(r.value);}

  // Dedup
  const unique=results.filter(i=>{if(!i.id||seen.has(i.id))return false;seen.add(i.id);return true;});

  // Sort: ME signals first, then by score/recency
  unique.sort((a,b)=>{
    const aME=a.country==="Regional"||a.country==="UAE"?1:0;
    const bME=b.country==="Regional"||b.country==="UAE"?1:0;
    if(bME!==aME)return bME-aME;
    return(b.score-a.score)||new Date(b.timestamp)-new Date(a.timestamp);
  });

  const moodDist={HOPEFUL:0,CYNICAL:0,ANXIOUS:0,NEUTRAL:0};
  for(const item of unique){
    const mood=classifyLottery(item.title+" "+(item.summary||""));
    moodDist[mood]++;
  }
  const dominantMood=Object.entries(moodDist).sort((a,b)=>b[1]-a[1])[0]?.[0]||"NEUTRAL";
  const ratios=unique.filter(r=>r.upvoteRatio>0).map(r=>r.upvoteRatio);
  const avgUpvoteRatio=ratios.length?Math.round(ratios.reduce((a,b)=>a+b,0)/ratios.length*100):60;
  const uncertaintyScore=calcUncertainty(unique);
  const meSignals=unique.filter(i=>i.country==="Regional"||i.country==="UAE").length;

  res.setHeader("Cache-Control","s-maxage=300,stale-while-revalidate=600");
  return res.status(200).json({
    items:unique,
    meta:{totalSignals:unique.length,meSignals,sourceDiversity:new Set(unique.map(r=>r.sourceType)).size,avgUpvoteRatio,uncertaintyScore,dominantMood,moodDist},
  });
}
