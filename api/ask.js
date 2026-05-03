export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, resumeText, jobDesc, analysisResult } = req.body;

    if (!question || !resumeText) {
      return res.status(400).json({ error: 'Missing question or resumeText' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Build context from resume, job, and analysis
    const context = `
RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDesc || 'Not provided'}

ANALYSIS RESULTS:
${JSON.stringify(analysisResult, null, 2)}
`;

    const prompt = `You are an AI resume analysis assistant. Use the following context to answer the user's question.

${context}

USER QUESTION: ${question}

Provide a helpful, specific answer based on the resume and job description context. Be concise but thorough.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1000
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Gemini API error', 
        details: errorData 
      });
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      return res.status(500).json({ error: 'Empty AI response' });
    }

    return res.status(200).json({ answer });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
