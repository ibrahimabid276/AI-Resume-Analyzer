export default async function handler(req, res) {
  try {
    const { resumeText, jobDesc } = req.body;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are an expert resume analyzer. Analyze this resume against the job description and return ONLY valid JSON (no markdown, no explanation):

{
  "score": <number 0-100>,
  "name": "<candidate name or Unknown>",
  "title": "<professional title>",
  "experience": "<years of experience>",
  "education": "<education details>",
  "matched_skills": ["<skills from resume that match job>"],
  "missing_skills": ["<skills required but missing>"],
  "strengths": ["<strengths of this candidate>"],
  "tips": ["<specific improvement tips>"]
}

RESUME TEXT:
${resumeText}

JOB DESCRIPTION:
${jobDesc}
                  `,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    console.log("RAW GEMINI:", data); // 👈 DEBUG

    let text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      console.log("AI TEXT:", text); //

    if (!text) {
      return res.status(500).json({ error: "Empty AI response" });
    }

    // CLEAN TEXT
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let result;

    try {
      result = JSON.parse(text);
    } catch (err) {
      console.log("JSON ERROR:", text);

      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw: text,
      });
    }

    res.status(200).json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}