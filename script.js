async function analyze() {
  const resume = document.getElementById("resume").value;
  const job = document.getElementById("job").value;
  const output = document.getElementById("output");

  if (!resume || !job) {
    output.innerText = "Please fill both fields.";
    return;
  }

  output.innerText = "Analyzing...";

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeText: resume,
      jobDesc: job,
    }),
  });

  const data = await res.json();
  output.innerText = data.result;
}