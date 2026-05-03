export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { resumeText, jobDesc } = req.body;

    const prompt = `
You are an AI Resume Analyzer.

Return ONLY JSON in this format:

{
  "score": number,
  "name": "string",
  "title": "string",
  "experience": "string",
  "education": "string",
  "matched_skills": ["..."],
  "missing_skills": ["..."],
  "strengths": ["..."],
  "tips": ["..."]
}

Resume:
${resumeText}

Job Description:
${jobDesc}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Clean JSON
    const cleaned = text.replace(/```json|```/g, "").trim();

    const result = JSON.parse(cleaned);

    res.status(200).json(result);

  } catch (err) {
    res.status(500).json({ error: "AI parsing failed" });
  }
}