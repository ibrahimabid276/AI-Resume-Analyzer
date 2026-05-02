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

async function handleUpload() {
  const file = document.getElementById("pdfFile").files[0];
  const jobDesc = document.getElementById("jobDesc").value;
  const output = document.getElementById("output");

  if (!file) {
    output.innerText = "Please upload a PDF.";
    return;
  }

  output.innerText = "Reading PDF...";

  const resumeText = await extractTextFromPDF(file);

  output.innerText = "Analyzing with AI...";

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
  output.innerText = data.result;
}