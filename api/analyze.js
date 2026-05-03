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
    const { resumeText, jobDesc } = req.body;

    if (!resumeText || !jobDesc) {
      return res.status(400).json({ error: 'Missing resumeText or jobDesc' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not set');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const prompt = `You are an expert resume analyzer. Analyze this resume against the job description and return ONLY valid JSON (no markdown, no code blocks, no explanation):

{"score": 75, "name": "John Doe", "title": "Software Engineer", "experience": "3 years", "education": "BS Computer Science", "matched_skills": ["JavaScript", "React"], "missing_skills": ["TypeScript"], "strengths": ["Strong frontend skills"], "tips": ["Add more backend experience"]}

RESUME TEXT:
${resumeText}

JOB DESCRIPTION:
${jobDesc}`;

    console.log('Sending request to Gemini API...');

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
            temperature: 0.3,
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
    console.log('Gemini response:', JSON.stringify(data, null, 2));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No text in response:', data);
      return res.status(500).json({ error: 'Empty AI response', data });
    }

    // Clean and parse JSON
    let cleanedText = text.trim();
    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    console.log('Cleaned text:', cleanedText);

    try {
      const result = JSON.parse(cleanedText);
      return res.status(200).json(result);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Text that failed to parse:', cleanedText);
      return res.status(500).json({ 
        error: 'Failed to parse AI response', 
        raw: cleanedText 
      });
    }

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}