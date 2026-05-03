// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Global variables to store analysis context
let analysisContext = {
  resumeText: '',
  jobDesc: '',
  result: null
};

// 📄 Extract text from PDF
async function extractTextFromPDF(file) {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;

        let text = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();

          content.items.forEach((item) => {
            text += item.str + " ";
          });
        }

        resolve(text);
      } catch (err) {
        console.error("PDF extraction error:", err);
        reject(err);
      }
    };

    reader.readAsArrayBuffer(file);
  });
}


// 🚀 Main function
async function startAnalysis() {

  const file = document.getElementById("pdfFile").files[0];
  const jobDesc = document.getElementById("jobDesc").value.trim();
  const btn = document.getElementById("analyzeBtn");

  console.log("File:", file);
  console.log("Job Description length:", jobDesc.length);

  // ❌ Validation
  if (!file) {
    alert("Please upload a PDF resume file");
    return;
  }

  if (!jobDesc || jobDesc.length < 10) {
    alert("Please paste a job description (at least 10 characters)");
    return;
  }

  try {
    btn.innerText = "Reading your resume...";
    btn.disabled = true;

    // 📄 Extract PDF text
    const resumeText = await extractTextFromPDF(file);

    console.log("RESUME TEXT:", resumeText); // 🧪 DEBUG

    if (!resumeText || resumeText.length < 20) {
      alert("PDF text extraction failed or empty");
      return;
    }

    // Store context for Q&A
    analysisContext.resumeText = resumeText;
    analysisContext.jobDesc = jobDesc;

    btn.innerText = "Analyzing...";

    console.log("Sending to Gemini API...");

    // 🌐 Send to Gemini API directly
    const API_KEY = 'AIzaSyCjOyGoYZK2MrGgueZZ08XvTaiX62FgkBA';
    
    const prompt = `You are an expert resume analyzer. Analyze this resume against the job description and return ONLY valid JSON (no markdown, no code blocks, no explanation):

{"score": 75, "name": "John Doe", "title": "Software Engineer", "experience": "3 years", "education": "BS Computer Science", "matched_skills": ["JavaScript", "React"], "missing_skills": ["TypeScript"], "strengths": ["Strong frontend skills"], "tips": ["Add more backend experience"]}

RESUME TEXT:
${resumeText}

JOB DESCRIPTION:
${jobDesc}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
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

    console.log("Response status:", res.status);

    const geminiData = await res.json();

    console.log("GEMINI RESPONSE:", geminiData);

    if (!res.ok) {
      alert(`API Error: ${geminiData.error?.message || "Request failed"}`);
      console.error("API Error Details:", geminiData);
      return;
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      alert("Empty response from AI");
      console.error("No text in response:", geminiData);
      return;
    }

    // Clean and parse JSON
    let cleanedText = text.trim();
    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    console.log("Cleaned text:", cleanedText);

    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Text that failed to parse:", cleanedText);
      alert("Failed to parse AI response. Check console for details.");
      return;
    }

    // Store result for Q&A
    analysisContext.result = data;

    // 🎯 Show results
    showResults(data);

  } catch (err) {
    console.error("ERROR:", err);
    alert(`Error: ${err.message || "Something went wrong"}. Check console for details.`);
  } finally {
    btn.innerText = "Analyze match";
    btn.disabled = false;
  }
}


// 🎯 Show results in UI
function showResults(data) {

  // Switch UI
  document.getElementById("landing").classList.add("hidden");
  document.getElementById("results").classList.remove("hidden");

  // 📊 Score
  const score = data.score || 50;
  document.getElementById("scoreText").innerText = score;

  const circle = document.getElementById("progressCircle");
  const offset = 440 - (440 * score) / 100;
  circle.style.strokeDashoffset = offset;

  // 👤 Candidate Info
  document.getElementById("candidateInfo").innerHTML = `
    <p><b>Name:</b> ${data.name || "N/A"}</p>
    <p><b>Title:</b> ${data.title || "N/A"}</p>
    <p><b>Experience:</b> ${data.experience || "N/A"}</p>
    <p><b>Education:</b> ${data.education || "N/A"}</p>
  `;

  // 🟢 Matched skills
  fillTags("matched", data.matched_skills, "green");

  // 🔴 Missing skills
  fillTags("missing", data.missing_skills, "red");

  // 💪 Strengths
  fillList("strengths", data.strengths);

  // 💡 Tips
  fillList("tips", data.tips);
}


// 🟢🔴 Skill tags
function fillTags(id, items = [], color) {
  const container = document.getElementById(id);
  container.innerHTML = "";

  items.forEach((item) => {
    const tag = document.createElement("span");

    tag.className =
      color === "green"
        ? "px-2 py-1 rounded bg-green-500/20 text-green-400"
        : "px-2 py-1 rounded bg-red-500/20 text-red-400";

    tag.innerText = item;
    container.appendChild(tag);
  });
}


// 📋 List (strengths / tips)
function fillList(id, items = []) {
  const container = document.getElementById(id);
  container.innerHTML = "";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerText = item;
    container.appendChild(li);
  });
}

// 💬 RAG Q&A Function
async function askQuestion() {
  const questionInput = document.getElementById('questionInput');
  const answerBox = document.getElementById('answerBox');
  const askBtn = document.getElementById('askBtn');
  
  const question = questionInput.value.trim();
  
  if (!question) {
    alert('Please enter a question');
    return;
  }
  
  if (!analysisContext.resumeText) {
    alert('Please analyze a resume first');
    return;
  }
  
  askBtn.disabled = true;
  askBtn.innerText = 'Thinking...';
  answerBox.innerHTML = '<span class="text-purple-400">Analyzing your question...</span>';
  
  try {
    const API_KEY = 'AIzaSyCjOyGoYZK2MrGgueZZ08XvTaiX62FgkBA';
    
    const prompt = `You are a resume analysis assistant. Based on the following resume and job description, answer this question concisely and helpfully.

RESUME TEXT:
${analysisContext.resumeText}

JOB DESCRIPTION:
${analysisContext.jobDesc}

${analysisContext.result ? `ANALYSIS RESULT:
${JSON.stringify(analysisContext.result, null, 2)}` : ''}

QUESTION: ${question}

ANSWER:`;
    
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 500
          }
        })
      }
    );
    
    const data = await res.json();
    
    if (!res.ok || data.error) {
      answerBox.innerHTML = `<span class="text-red-400">Error: ${data.error?.message || 'Request failed'}</span>`;
      return;
    }
    
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!answer) {
      answerBox.innerHTML = '<span class="text-red-400">No answer received</span>';
      return;
    }
    
    answerBox.innerText = answer;
    questionInput.value = '';
    
  } catch (err) {
    console.error('Q&A Error:', err);
    answerBox.innerHTML = '<span class="text-red-400">Failed to get answer. Please try again.</span>';
  } finally {
    askBtn.disabled = false;
    askBtn.innerText = 'Ask AI';
  }
}

// Allow Enter key to submit question
document.addEventListener('DOMContentLoaded', () => {
  const questionInput = document.getElementById('questionInput');
  if (questionInput) {
    questionInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        askQuestion();
      }
    });
  }
});