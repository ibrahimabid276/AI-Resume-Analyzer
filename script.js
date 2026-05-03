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
        reject("PDF reading failed");
      }
    };

    reader.readAsArrayBuffer(file);
  });
}


// 🚀 Main function
async function startAnalysis() {

  const file = document.getElementById("pdfFile").files[0];
  const jobDesc = document.getElementById("jobDesc").value;
  const btn = document.getElementById("analyzeBtn");

  // ❌ Validation
  if (!file || !jobDesc) {
    alert("Please upload a PDF and add job description");
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

    btn.innerText = "Analyzing...";

    // 🌐 Send to backend
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resumeText,
        jobDesc,
      }),
    });

    const data = await res.json();

    console.log("API RESPONSE:", data); // 🧪 DEBUG

    if (!data || data.error) {
      alert(data?.error || "No response from API");
      return;
    }

    // 🎯 Show results
    showResults(data);

  } catch (err) {
    console.error("ERROR:", err);
    alert("Something went wrong");
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