// ========================================
// AI Resume Analyzer - Frontend Script
// ========================================
// IMPORTANT: Replace 'YOUR_OPENROUTER_API_KEY_HERE' with your actual OpenRouter API key
// Lines to update: ~178 (startAnalysis function) and ~360 (askQuestion function)
// For production, use a backend proxy to hide API keys
// ========================================

// Global variables to store analysis context
let analysisContext = {
  resumeText: '',
  jobDesc: '',
  result: null
};

//  Extract text from PDF
async function extractTextFromPDF(file) {
  try {
    console.log("Starting PDF extraction...");
    console.log("File name:", file.name);
    console.log("File size:", file.size, "bytes");
    console.log("PDF.js available:", typeof pdfjsLib !== 'undefined');
    
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF.js library is not loaded. Please refresh the page and try again.");
    }
    
    const reader = new FileReader();
    
    const arrayBuffer = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });

    console.log("File loaded, initializing PDF.js...");
    const typedarray = new Uint8Array(arrayBuffer);
    
    let pdf;
    try {
      const loadingTask = pdfjsLib.getDocument({data: typedarray});
      pdf = await loadingTask.promise;
      console.log("✅ PDF document loaded successfully");
    } catch (pdfError) {
      console.error("❌ PDF.js document loading error:", pdfError);
      throw new Error(`Failed to parse PDF file. The file might be corrupted or password-protected. Details: ${pdfError.message}`);
    }
    
    console.log("PDF loaded, pages:", pdf.numPages);

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Extracting page ${i}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      content.items.forEach((item) => {
        if (item.str) {
          text += item.str + " ";
        }
      });
    }

    console.log("✅ PDF extraction complete, text length:", text.length);
    
    if (text.trim().length < 20) {
      console.warn("⚠️ Extracted text is very short. This might be an image-based PDF.");
    }
    
    return text;
  } catch (err) {
    console.error(" PDF extraction error:", err);
    throw new Error(`PDF extraction failed: ${err.message}`);
  }
}

//  Extract text from DOCX
async function extractTextFromDOCX(file) {
  try {
    console.log("Starting DOCX extraction...");
    console.log("File name:", file.name);
    console.log("File size:", file.size, "bytes");
    console.log("Mammoth.js available:", typeof mammoth !== 'undefined');
    
    if (typeof mammoth === 'undefined') {
      throw new Error("Mammoth.js library is not loaded. Please refresh the page and try again.");
    }
    
    const reader = new FileReader();
    
    const arrayBuffer = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });

    console.log("File loaded, extracting with Mammoth.js...");
    let result;
    try {
      result = await mammoth.extractRawText({ arrayBuffer });
      console.log("✅ DOCX extraction completed successfully");
    } catch (mammothError) {
      console.error("❌ Mammoth.js extraction error:", mammothError);
      throw new Error(`Failed to extract text from Word document. The file might be corrupted. Details: ${mammothError.message}`);
    }
    
    console.log("DOCX extraction complete, text length:", result.value.length);
    
    if (result.value.trim().length < 20) {
      console.warn("⚠️ Extracted text is very short.");
    }
    
    return result.value;
  } catch (err) {
    console.error(" DOCX extraction error:", err);
    throw new Error(`DOCX extraction failed: ${err.message}`);
  }
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
    try {
      if (isPDF) {
        resumeText = await extractTextFromPDF(file);
      } else {
        resumeText = await extractTextFromDOCX(file);
      }
    } catch (extractError) {
      console.error("Extraction failed:", extractError);
      alert(`Failed to extract text from file.\n\nError: ${extractError.message}\n\nPlease try:\n• Using a different PDF or Word file\n• Converting your file to PDF\n• Checking if the file is corrupted or password-protected\n\nCheck the browser console (F12) for more details.`);
      return;
    }

    console.log("RESUME TEXT:", resumeText); // 🧪 DEBUG

    if (!resumeText || resumeText.trim().length < 20) {
      alert(`File text extraction failed or empty.\n\nSupported formats: PDF and Word (.docx)\n\nPlease try:\n• Using a different PDF or Word file\n• Converting your file to PDF\n• Checking if the file is corrupted or password-protected\n\nCheck the browser console (F12) for more details.`);
      return;
    }

    // Store context for Q&A
    analysisContext.resumeText = resumeText;
    analysisContext.jobDesc = jobDesc;

    btn.innerText = "🤖 Analyzing with AI...";

    console.log("Sending to OpenRouter API via backend...");

    // 🌐 Send to backend API endpoint (keeps API key secure on server)
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeText: resumeText,
        jobDesc: jobDesc
      })
    });

    console.log("Response status:", res.status);

    const responseData = await res.json();

    console.log("BACKEND API RESPONSE:", responseData);

    if (!res.ok) {
      alert(`API Error: ${responseData.error || "Request failed"}`);
      console.error("API Error Details:", responseData);
      return;
    }

    // Backend returns the parsed result directly
    const data = responseData;

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
    // Send to backend API endpoint (keeps API key secure on server)
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question,
        resumeText: analysisContext.resumeText,
        jobDesc: analysisContext.jobDesc,
        analysisResult: analysisContext.result
      })
    });
    
    const data = await res.json();
    
    if (!res.ok || data.error) {
      answerBox.innerHTML = `<span class="text-red-400">Error: ${data.error || 'Request failed'}</span>`;
      return;
    }
    
    const answer = data.answer;
    
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

