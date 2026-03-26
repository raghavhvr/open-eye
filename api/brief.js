// api/brief.js — AI Brief via Google Gemini
// Uses gemini-1.5-flash: 15 RPM, 1500 RPD free (vs 2.5-flash: 10 RPM, 500 RPD)
// Responses are cached on Vercel edge for 30 minutes to avoid quota hits.

// Switch back to 1.5-flash for 3× higher daily free quota.
// When you want 2.5-flash quality, set GEMINI_MODEL=gemini-2.5-flash in Vercel env vars.
// gemini-2.5-flash-lite: 15 RPM, 1000 RPD free — best quota for this use case
// gemini-2.5-flash: 10 RPM, 250 RPD free — higher quality
// Override via GEMINI_MODEL env var in Vercel
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not set in Vercel environment variables." });

  const { headlines, mode = "intelligence" } = req.body || {};
  if (!headlines || !Array.isArray(headlines) || headlines.length === 0)
    return res.status(400).json({ error: "headlines array is required" });

  let prompt;
  if (mode === "lottery") {
    prompt = `You are a public sentiment analyst specialising in gambling psychology and consumer behaviour. Based on these open-source posts about lottery, gambling, and winning, analyse the public mood.

Signals:
${headlines.slice(0, 15).map(h => `- ${h}`).join("\n")}

Return ONLY a JSON object, no markdown, no explanation:
{"overallMood":"EUPHORIC|HOPEFUL|ANXIOUS|CYNICAL|RESIGNED","sentimentSplit":{"positive":0,"neutral":0,"negative":0},"dominantNarrative":"string max 8 words","keyEmotions":["emotion1","emotion2","emotion3"],"psychInsight":"2 sentences on psychology driving these reactions","riskSignals":["signal1","signal2"],"opportunitySignals":["signal1","signal2"]}
Note: sentimentSplit values must sum to 100.`;
  } else {
    prompt = `You are a senior regional intelligence analyst for the MENA region. Analyse these open-source headlines and produce a brief.

Headlines:
${headlines.slice(0, 12).map(h => `- ${h}`).join("\n")}

Return ONLY a JSON object, no markdown, no explanation:
{"threatLevel":"LOW|MODERATE|ELEVATED|CRITICAL","topTheme":"max 5 words","summary":"2 sentences analyst tone","keyTrends":["trend1","trend2","trend3"],"watchItems":["item1","item2"],"userSentiment":"OPTIMISTIC|CAUTIOUS|ANXIOUS|FEARFUL|INDIFFERENT","sentimentDrivers":["driver1","driver2"]}`;
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(25000),
    });

    const data = await geminiRes.json();
    if (data.error) return res.status(502).json({ error: data.error.message });

    // Collect all text parts (handles thinking-mode responses in 2.5)
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const raw = parts.filter(p => typeof p.text === "string").map(p => p.text).join("").trim();
    if (!raw) return res.status(502).json({ error: "Empty response from Gemini" });

    const cleaned = raw.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: "No JSON in Gemini response" });

    // Cache 30 minutes on Vercel edge — prevents repeated quota hits on page loads
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
