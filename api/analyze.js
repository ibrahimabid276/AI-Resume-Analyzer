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
Return ONLY JSON:

{
  "score": 75,
  "name": "John",
  "title": "Developer",
  "experience": "2 years",
  "education": "BS CS",
  "matched_skills": ["Python"],
  "missing_skills": ["Docker"],
  "strengths": ["Good logic"],
  "tips": ["Improve resume"]
}

Resume: ${resumeText}
Job: ${jobDesc}
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