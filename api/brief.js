// api/brief.js
// Vercel Serverless Function — proxies requests to Google Gemini 2.5 Flash.
// The API key lives in GEMINI_API_KEY env var (set in Vercel dashboard),
// so it is never exposed to the browser.

const GEMINI_MODEL = "gemini-2.5-flash";

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not set. Add it in your Vercel project → Settings → Environment Variables.",
    });
  }

  const { headlines } = req.body;
  if (!headlines || !Array.isArray(headlines) || headlines.length === 0) {
    return res.status(400).json({ error: "headlines array is required" });
  }

  const prompt = `You are a senior regional intelligence analyst for the Middle East & North Africa (MENA) region. Based on these recent open-source headlines, produce a structured strategic intelligence brief.

Headlines:
${headlines.slice(0, 12).map((h) => `- ${h}`).join("\n")}

Respond ONLY with a raw JSON object — no markdown fences, no explanation, no backticks:
{
  "threatLevel": "LOW|MODERATE|ELEVATED|CRITICAL",
  "topTheme": "string (max 5 words)",
  "summary": "string (2 sentences, analyst tone)",
  "keyTrends": ["trend1", "trend2", "trend3"],
  "watchItems": ["item1", "item2"]
}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
      }),
    });

    const data = await geminiRes.json();

    if (data.error) {
      return res.status(502).json({ error: data.error.message });
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
