// api/store.js — Upstash Redis REST wrapper (no npm needed, pure fetch)
// Used by ingest.js (server) and the backfill script (Node)
//
// Keys used:
//   signals:articles   → JSON array of normalised article objects (capped at 3000)
//   signals:meta       → JSON object { lastIngest, totalPushed, firstIngest }

const BASE  = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function headers() {
  return {
    "Authorization": `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function redis(command) {
  if (!BASE || !TOKEN) throw new Error("UPSTASH_REDIS_REST_URL / TOKEN not set");
  const res = await fetch(`${BASE}/${command.map(encodeURIComponent).join("/")}`, {
    method: "GET",
    headers: headers(),
  });
  const json = await res.json();
  if (json.error) throw new Error(`Redis error: ${json.error}`);
  return json.result;
}

async function redisPost(command, body) {
  if (!BASE || !TOKEN) throw new Error("UPSTASH_REDIS_REST_URL / TOKEN not set");
  const res = await fetch(`${BASE}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify([...command, ...(body || [])]),
  });
  const json = await res.json();
  if (json.error) throw new Error(`Redis error: ${json.error}`);
  return json.result;
}

// Pipeline multiple commands at once
async function redisPipeline(commands) {
  if (!BASE || !TOKEN) throw new Error("UPSTASH_REDIS_REST_URL / TOKEN not set");
  const res = await fetch(`${BASE}/pipeline`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(commands),
  });
  const json = await res.json();
  return json;
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function getArticles() {
  const raw = await redis(["GET", "signals:articles"]);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function getMeta() {
  const raw = await redis(["GET", "signals:meta"]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Append new articles, dedup by ID, keep newest 3000, save back
export async function appendArticles(newArticles) {
  const existing = await getArticles();
  const existingIds = new Set(existing.map(a => a.id));

  // Only add genuinely new ones
  const added = newArticles.filter(a => a.id && !existingIds.has(a.id));

  if (added.length === 0) {
    return { added: 0, total: existing.length };
  }

  // Merge + sort newest first + cap at 3000
  const merged = [...added, ...existing]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 3000);

  // Save articles + update meta in pipeline
  const meta = {
    lastIngest:  new Date().toISOString(),
    totalPushed: merged.length,
    firstIngest: (await getMeta())?.firstIngest || new Date().toISOString(),
  };

  await redisPipeline([
    ["SET", "signals:articles", JSON.stringify(merged)],
    ["SET", "signals:meta",     JSON.stringify(meta)],
  ]);

  return { added: added.length, total: merged.length };
}

// Replace all articles (used by backfill)
export async function setArticles(articles) {
  const sorted = [...articles]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 3000);

  const meta = {
    lastIngest:  new Date().toISOString(),
    totalPushed: sorted.length,
    firstIngest: new Date().toISOString(),
  };

  await redisPipeline([
    ["SET", "signals:articles", JSON.stringify(sorted)],
    ["SET", "signals:meta",     JSON.stringify(meta)],
  ]);

  return { total: sorted.length };
}

export function isConfigured() {
  return !!(BASE && TOKEN);
}
