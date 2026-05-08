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

    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ OPENROUTER_API_KEY not set in Vercel environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    console.log('✅ OPENROUTER_API_KEY found in environment');

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

    console.log('Sending request to OpenRouter API...');

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
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(500).json({ error: 'Empty AI response' });
    }

    return res.status(200).json({ answer });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
