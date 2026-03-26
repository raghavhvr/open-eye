// api/lottery.js — ME Lottery Pulse via Mastodon + Lemmy + HN + Wikipedia
// No Reddit (403 from Vercel). All sources open, no auth.

const LOT_HOPEFUL=["win","winner","jackpot","lucky","dream","hope","million","tonight","ticket","chance","raffle","prize","draw","big","blessed","fortune","rich","wealth","luckydraw","sweepstake"];
const LOT_CYNICAL=["scam","fraud","rigged","impossible","never","waste","sucker","odds","cheat","fake","illegal","banned","haram","forbidden","corrupt","addiction"];
const LOT_ANXIOUS=["debt","desperate","lost","spent","need","last","only","please","help","poor","broke","struggling","crisis","worry","afford","family"];

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

// ── Mastodon hashtag lottery signals ─────────────────────────────────────────
const MASTO_LOT_TAGS=[
  {tag:"lottery",      label:"Lottery"},
  {tag:"jackpot",      label:"Jackpot"},
  {tag:"luckydraw",    label:"Lucky Draw"},
  {tag:"gambling",     label:"Gambling"},
  {tag:"winning",      label:"Winning"},
  {tag:"raffle",       label:"Raffle"},
  {tag:"DubaiLottery", label:"Dubai Lottery"},
  {tag:"UAE",          label:"UAE"},
  {tag:"Dubai",        label:"Dubai"},
  {tag:"expat",        label:"Expat"},
];

// ── Mastodon ME community lottery signals ─────────────────────────────────────
// Search within ME tags for lottery-adjacent content
const ME_LOT_TERMS=["lottery","lucky","jackpot","prize","raffle","win","gambling","luckydraw"];

// ── Lemmy lottery searches ────────────────────────────────────────────────────
const LEMMY_LOT_QUERIES=[
  "lottery UAE Dubai lucky draw",
  "gambling middle east",
  "jackpot winning",
  "lottery addiction psychology",
  "lucky draw expat gulf",
  "lottery scam fraud",
];

// ── HN lottery/gambling queries ───────────────────────────────────────────────
const HN_LOT_QUERIES=[
  "lottery UAE Dubai lucky draw",
  "gambling middle east",
  "lottery psychology winning",
  "online gambling regulation gulf",
  "lottery addiction problem",
];

// ── Wikipedia ME lottery context ──────────────────────────────────────────────
const WIKI_TOPICS=[
  "Lottery",
  "Dubai Duty Free Millennium Millionaire",
  "Problem gambling",
  "Lucky draw",
  "Gambling in the United Arab Emirates",
];

async function fetchMastodonLotteryTag(tag){
  try{
    const r=await fetch(
      `https://mastodon.social/api/v1/timelines/tag/${tag}?limit=12`,
      {signal:AbortSignal.timeout(6000),headers:{"Accept":"application/json"}}
    );
    if(!r.ok)return[];
    const posts=await r.json();
    const cutoff7d = Date.now() - 7*24*3600*1000;
    return posts
      .filter(p=>{
        if(!p.content||p.reblog)return false;
        // Only posts from last 7 days
        if(new Date(p.created_at).getTime()<cutoff7d)return false;
        const txt=stripHtml(p.content).toLowerCase();
        // Must contain actual lottery/luck keywords (skip tangential mentions)
        const relevant=[...LOT_HOPEFUL,...LOT_CYNICAL,...LOT_ANXIOUS,"lottery","raffle","jackpot","gambling","casino","bet","sweepstake","lucky draw","draw"];
        return relevant.some(w=>txt.includes(w));
      })
      .map(p=>{
        const txt=stripHtml(p.content);
        // Detect if ME-related
        const t=txt.toLowerCase();
        const meKw=["uae","dubai","saudi","gulf","mena","middle east","qatar","kuwait","jordan","oman","bahrain","riyadh","abu dhabi","doha","arab","expat"];
        const isME=meKw.some(k=>t.includes(k));
        return{
          id:"masto-lot-"+p.id,
          title:txt.slice(0,160)||`#${tag} signal`,
          summary:txt.slice(0,240),
          url:p.url||"",
          timestamp:p.created_at,
          source:`#${tag}`,
          sourceType:"Mastodon",
          tag:isME?"ME-LOT":tag.toUpperCase(),
          country:isME?"Regional":"Global",
          score:p.favourites_count||0,
          comments:p.replies_count||0,
          upvoteRatio:0.7+(p.favourites_count||0)/Math.max((p.favourites_count||0)+(p.replies_count||0)+1,1)*0.3,
        };
      });
  }catch{return[];}
}

async function fetchLemmyLottery(q){
  try{
    // Sort by New to get recent posts, not all-time top
    const r=await fetch(
      `https://lemmy.world/api/v3/search?q=${encodeURIComponent(q)}&type_=Posts&sort=New&limit=8`,
      {signal:AbortSignal.timeout(6000)}
    );
    if(!r.ok)return[];
    const d=await r.json();
    const cutoff30d = Date.now() - 30*24*3600*1000;
    const lotKeywords=["lottery","jackpot","winning","gambling","lucky","raffle","prize","casino","bet","draw","million","powerball"];
    return(d.posts||[])
      .filter(p=>{
        if(!p.post?.name)return false;
        if(new Date(p.post.published).getTime()<cutoff30d)return false;
        const t=(p.post.name+" "+(p.post.body||"")).toLowerCase();
        return lotKeywords.some(k=>t.includes(k));
      })
      .map(p=>{
        const post=p.post;const counts=p.counts||{};
        const t=(post.name+" "+(post.body||"")).toLowerCase();
        const meKw=["uae","dubai","saudi","gulf","mena","qatar","kuwait","arab","expat","middle east"];
        const isME=meKw.some(k=>t.includes(k));
        return{
          id:"lemmy-lot-"+post.id,
          title:post.name,
          summary:(post.body||"").slice(0,220)||`↑${counts.score||0} · 💬${counts.comments||0}`,
          url:post.ap_id||post.url||"",
          timestamp:post.published,
          source:"Lemmy",
          sourceType:"Lemmy",
          tag:isME?"ME-LOT":"SOCIAL",
          country:isME?"Regional":"Global",
          score:counts.score||0,
          comments:counts.comments||0,
          upvoteRatio:0.75,
        };
      });
  }catch{return[];}
}

async function fetchHNLottery(q){
  const since=Math.floor(Date.now()/1000)-7*24*3600; // 7-day window for freshness
  try{
    const d=await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=5&numericFilters=created_at_i>${since}`,
      {signal:AbortSignal.timeout(5000)}
    ).then(r=>r.json());
    return(d.hits||[]).map(h=>({
      id:"hn-lot-"+h.objectID,
      title:h.title,
      summary:`${h.points||0} pts · ${h.num_comments||0} comments`,
      url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,
      timestamp:h.created_at,
      source:"Hacker News",
      sourceType:"HN",
      tag:"TECH",
      country:"Global",
      score:h.points||0,
      comments:h.num_comments||0,
      upvoteRatio:0.8,
    }));
  }catch{return[];}
}

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
      source:"Wikipedia",
      sourceType:"Wiki",
      tag:"INTEL",
      country:topic.toLowerCase().includes("uae")||topic.toLowerCase().includes("dubai")?"UAE":"Global",
      score:0,comments:0,upvoteRatio:1,
    };
  }catch{return null;}
}

// ── Uncertainty calculation ────────────────────────────────────────────────────
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
  // Low dominance + high variance = high uncertainty
  const raw=(1-dominance)*55+ratioVariance*25+(items.length<10?20:0);
  return Math.min(99,Math.max(1,Math.round(raw)));
}

export default async function handler(req,res){
  if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  const results=[];
  const seen=new Set();

  // Run all sources in parallel
  const [mastoResults,lemmyResults,hnResults,wikiResults]=await Promise.all([
    Promise.allSettled(MASTO_LOT_TAGS.map(({tag})=>fetchMastodonLotteryTag(tag))),
    Promise.allSettled(LEMMY_LOT_QUERIES.map(q=>fetchLemmyLottery(q))),
    Promise.allSettled(HN_LOT_QUERIES.map(q=>fetchHNLottery(q))),
    Promise.allSettled(WIKI_TOPICS.map(t=>fetchWikiLottery(t))),
  ]);

  for(const r of mastoResults){if(r.status==="fulfilled")results.push(...r.value);}
  for(const r of lemmyResults){if(r.status==="fulfilled")results.push(...r.value);}
  for(const r of hnResults){if(r.status==="fulfilled")results.push(...r.value);}
  for(const r of wikiResults){if(r.status==="fulfilled"&&r.value)results.push(r.value);}

  // Dedup + sort
  const unique=results.filter(i=>{if(!i.id||seen.has(i.id))return false;seen.add(i.id);return true;});
  unique.sort((a,b)=>(b.score-a.score)||new Date(b.timestamp)-new Date(a.timestamp));

  // Mood distribution
  const moodDist={HOPEFUL:0,CYNICAL:0,ANXIOUS:0,NEUTRAL:0};
  for(const item of unique){
    const mood=classifyLottery(item.title+" "+(item.summary||""));
    moodDist[mood]++;
  }
  const dominantMood=Object.entries(moodDist).sort((a,b)=>b[1]-a[1])[0]?.[0]||"NEUTRAL";
  const ratios=unique.filter(r=>r.upvoteRatio>0).map(r=>r.upvoteRatio);
  const avgUpvoteRatio=ratios.length?Math.round(ratios.reduce((a,b)=>a+b,0)/ratios.length*100):60;
  const uncertaintyScore=calcUncertainty(unique);
  const sourceDiversity=new Set(unique.map(r=>r.sourceType)).size;

  res.setHeader("Cache-Control","s-maxage=300,stale-while-revalidate=600");
  return res.status(200).json({
    items:unique,
    meta:{totalSignals:unique.length,sourceDiversity,avgUpvoteRatio,uncertaintyScore,dominantMood,moodDist},
  });
}
