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

// 📄 Extract text from DOCX
async function extractTextFromDOCX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async function() {
      try {
        const arrayBuffer = this.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (err) {
        console.error("DOCX extraction error:", err);
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file"));
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
    alert("Please upload a resume file (PDF or DOCX)");
    return;
  }

  // Check file type
  const fileName = file.name.toLowerCase();
  const isPDF = fileName.endsWith('.pdf');
  const isDOCX = fileName.endsWith('.docx');
  
  if (!isPDF && !isDOCX) {
    alert("Please upload a PDF or DOCX file only");
    return;
  }

  if (!jobDesc || jobDesc.length < 10) {
    alert("Please paste a job description (at least 10 characters)");
    return;
  }

  try {
    btn.innerText = "⏳ Reading your resume...";
    btn.disabled = true;

    // 📄 Extract text based on file type
    let resumeText;
    if (isPDF) {
      resumeText = await extractTextFromPDF(file);
    } else {
      resumeText = await extractTextFromDOCX(file);
    }

    console.log("RESUME TEXT:", resumeText); // 🧪 DEBUG

    if (!resumeText || resumeText.length < 20) {
      alert(`File text extraction failed or empty.\n\nSupported formats: PDF and Word (.docx)\n\nPlease try:\n• Using a different PDF or Word file\n• Converting your file to PDF\n• Checking if the file is corrupted or password-protected`);
      return;
    }

    // Store context for Q&A
    analysisContext.resumeText = resumeText;
    analysisContext.jobDesc = jobDesc;

    btn.innerText = "🤖 Analyzing with AI...";

    console.log("Sending to Gemini API...");

    // 🌐 Send to Gemini API directly
    const API_KEY = 'YOUR_API_KEY_HERE';
    
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
            maxOutputTokens: 2000
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
      console.warn("JSON parse error, attempting to fix...");
      try {
        const lastBrace = cleanedText.lastIndexOf("}");
        if (lastBrace > 0) {
          cleanedText = cleanedText.substring(0, lastBrace + 1);
          data = JSON.parse(cleanedText);
          console.log("Successfully fixed and parsed JSON");
        } else {
          throw new Error("No complete JSON");
        }
      } catch (fixError) {
        console.error("Failed to fix JSON:", fixError);
        alert("AI response was incomplete. Please try again.");
        return;
      }
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

  // Switch UI with animation
  document.getElementById("landing").classList.add("hidden");
  const resultsSection = document.getElementById("results");
  resultsSection.classList.remove("hidden");
  resultsSection.classList.add("fade-in");

  // 📊 Score with animated counter
  const score = data.score || 50;
  animateScore(score);

  const circle = document.getElementById("progressCircle");
  const offset = 440 - (440 * score) / 100;
  setTimeout(() => {
    circle.style.strokeDashoffset = offset;
  }, 100);

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

// 🎯 Animate score counter
function animateScore(targetScore) {
  const scoreElement = document.getElementById("scoreText");
  let currentScore = 0;
  const increment = targetScore / 50;
  const timer = setInterval(() => {
    currentScore += increment;
    if (currentScore >= targetScore) {
      currentScore = targetScore;
      clearInterval(timer);
    }
    scoreElement.innerText = Math.round(currentScore);
  }, 30);
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
  askBtn.innerText = '🤔 Thinking...';
  answerBox.innerHTML = '<span class="text-purple-400 typing-effect">Analyzing your question</span>';
  
  try {
    const API_KEY = 'YOUR_API_KEY_HERE';
    
    const prompt = `You are an expert resume analyzer assistant. Use the following context to answer the question.

RESUME TEXT:
${analysisContext.resumeText}

${analysisContext.jobDesc ? `JOB DESCRIPTION:\n${analysisContext.jobDesc}\n\n` : ''}${analysisContext.result ? `ANALYSIS RESULT:\n${JSON.stringify(analysisContext.result, null, 2)}\n\n` : ''}

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
    
    // Typewriter effect for answer
    answerBox.innerHTML = '';
    await typewriterEffect(answerBox, answer);
    questionInput.value = '';
    
  } catch (err) {
    console.error('Q&A Error:', err);
    answerBox.innerHTML = '<span class="text-red-400">Failed to get answer. Please try again.</span>';
  } finally {
    askBtn.disabled = false;
    askBtn.innerText = 'Ask AI';
  }
}

// ✨ Typewriter effect
async function typewriterEffect(element, text) {
  const speed = 20; // milliseconds per character
  let i = 0;
  
  return new Promise((resolve) => {
    function type() {
      if (i < text.length) {
        element.innerHTML += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        resolve();
      }
    }
    
    type();
  });
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

