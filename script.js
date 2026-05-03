async function extractTextFromPDF(file) {
  const reader = new FileReader();

  return new Promise((resolve) => {
    reader.onload = async function () {
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
    };

    reader.readAsArrayBuffer(file);
  });
}

async function startAnalysis() {

  const file = document.getElementById("pdfFile").files[0];
  const jobDesc = document.getElementById("jobDesc").value;
  const btn = document.getElementById("analyzeBtn");

  if (!file || !jobDesc) {
    alert("Upload PDF and add job description");
    return;
  }

  btn.innerText = "Reading your resume...";
  btn.disabled = true;

  const resumeText = await extractTextFromPDF(file);

  btn.innerText = "Analyzing...";
  
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

  showResults(data);
}

function showResults(data) {

  document.getElementById("landing").classList.add("hidden");
  document.getElementById("results").classList.remove("hidden");

  // Score
  const score = data.score || 50;
  document.getElementById("scoreText").innerText = score;

  let circle = document.getElementById("progressCircle");
  let offset = 440 - (440 * score) / 100;
  circle.style.strokeDashoffset = offset;

  // Profile
  document.querySelector("#results .glass:nth-child(2)").innerHTML = `
    <h3 class="mb-3 text-lg">Candidate Info</h3>
    <p>Name: ${data.name}</p>
    <p>Title: ${data.title}</p>
    <p>Experience: ${data.experience}</p>
    <p>Education: ${data.education}</p>
  `;

  fillTags("matched", data.matched_skills, "green");
  fillTags("missing", data.missing_skills, "red");
  fillList("strengths", data.strengths);
  fillList("tips", data.tips);
}

function fillTags(id, items = [], color) {
  let container = document.getElementById(id);
  container.innerHTML = "";

  items.forEach((i) => {
    let tag = document.createElement("span");

    tag.className =
      color === "green"
        ? "px-2 py-1 rounded bg-green-500/20 text-green-400"
        : "px-2 py-1 rounded bg-red-500/20 text-red-400";

    tag.innerText = i;
    container.appendChild(tag);
  });
}

function fillList(id, items = []) {
  let container = document.getElementById(id);
  container.innerHTML = "";

  items.forEach((i) => {
    let li = document.createElement("li");
    li.innerText = i;
    container.appendChild(li);
  });
}