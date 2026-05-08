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

    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ OPENROUTER_API_KEY not set in Vercel environment variables');
      console.error('📝 To fix: Go to Vercel Dashboard → Settings → Environment Variables → Add OPENROUTER_API_KEY');
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    console.log('✅ OPENROUTER_API_KEY found in environment');

    const prompt = `You are an expert resume analyzer. Analyze this resume against the job description and return ONLY valid JSON (no markdown, no code blocks, no explanation):

{"score": 75, "name": "John Doe", "title": "Software Engineer", "experience": "3 years", "education": "BS Computer Science", "matched_skills": ["JavaScript", "React"], "missing_skills": ["TypeScript"], "strengths": ["Strong frontend skills"], "tips": ["Add more backend experience"]}

RESUME TEXT:
${resumeText}

JOB DESCRIPTION:
${jobDesc}`;

    console.log('Sending request to OpenRouter API...');
    console.log('Using model: meta-llama/llama-3-8b-instruct:free');

    let response;
    try {
      response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://ai-resume-analyzer.vercel.app',
            'X-Title': 'AI Resume Analyzer'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3-8b-instruct:free',
            messages: [{
              role: 'user',
              content: prompt
            }]
          })
        }
      );
    } catch (fetchError) {
      console.error('❌ Network error calling OpenRouter:', fetchError);
      return res.status(500).json({ 
        error: `Network error: ${fetchError.message}`,
        details: 'Failed to connect to OpenRouter API'
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ OpenRouter API error:', errorData);
      console.error('Response status:', response.status);
      return res.status(response.status).json({ 
        error: `OpenRouter API error: ${errorData.error?.message || errorData.error || 'Unknown error'}`, 
        details: errorData 
      });
    }

    const data = await response.json();
    console.log('OpenRouter response:', JSON.stringify(data, null, 2));

    const text = data.choices?.[0]?.message?.content;

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