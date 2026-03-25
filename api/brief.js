// api/brief.js
// Vercel Serverless Function — Gemini 2.5 Flash AI analysis.
// Supports two modes: "intelligence" (MENA brief) and "lottery" (sentiment analysis).

const GEMINI_MODEL = "gemini-2.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not set. Add it in Vercel → Settings → Environment Variables.",
    });
  }

  const { headlines, mode = "intelligence" } = req.body;
  if (!headlines || !Array.isArray(headlines) || headlines.length === 0) {
    return res.status(400).json({ error: "headlines array is required" });
  }

  let prompt;

  if (mode === "lottery") {
    prompt = `You are a public sentiment analyst specialising in gambling psychology and consumer behaviour. Based on these recent open-source posts and headlines about lottery, gambling, and winning, analyse the public mood.

Signals:
${headlines.slice(0, 15).map((h) => `- ${h}`).join("\n")}

Respond ONLY with a raw JSON object — no markdown, no backticks:
{
  "overallMood": "EUPHORIC|HOPEFUL|ANXIOUS|CYNICAL|RESIGNED",
  "sentimentSplit": { "positive": 0, "neutral": 0, "negative": 0 },
  "dominantNarrative": "string (max 8 words)",
  "keyEmotions": ["emotion1", "emotion2", "emotion3"],
  "psychInsight": "string (2 sentences about the psychology driving these reactions)",
  "riskSignals": ["signal1", "signal2"],
  "opportunitySignals": ["signal1", "signal2"]
}
Note: sentimentSplit values must sum to 100.`;
  } else {
    prompt = `You are a senior regional intelligence analyst for the Middle East & North Africa (MENA) region. Based on these recent open-source headlines, produce a structured strategic intelligence brief.

Headlines:
${headlines.slice(0, 12).map((h) => `- ${h}`).join("\n")}

Respond ONLY with a raw JSON object — no markdown, no backticks:
{
  "threatLevel": "LOW|MODERATE|ELEVATED|CRITICAL",
  "topTheme": "string (max 5 words)",
  "summary": "string (2 sentences, analyst tone)",
  "keyTrends": ["trend1", "trend2", "trend3"],
  "watchItems": ["item1", "item2"],
  "userSentiment": "OPTIMISTIC|CAUTIOUS|ANXIOUS|FEARFUL|INDIFFERENT",
  "sentimentDrivers": ["driver1", "driver2"]
}`;
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await geminiRes.json();
    if (data.error) return res.status(502).json({ error: data.error.message });

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const raw = parts.filter(p => typeof p.text === "string").map(p => p.text).join("").trim();
    if (!raw) return res.status(502).json({ error: "Empty response from Gemini" });

    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: "No JSON object in Gemini response" });

    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
