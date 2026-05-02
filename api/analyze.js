export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
You are an AI Resume Analyzer.

Resume:
${resumeText}

Job Description:
${jobDesc}

Give output:
1. Extracted Info
2. Matching Skills
3. Missing Skills
4. Score out of 100
5. Improvement Tips
                  `,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    res.status(200).json({
      result: data.candidates?.[0]?.content?.parts?.[0]?.text || "No response",
    });
  } catch (error) {
    res.status(500).json({ error: "Error processing request" });
  }
}