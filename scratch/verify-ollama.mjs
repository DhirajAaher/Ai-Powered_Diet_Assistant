async function verify() {
  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma:2b",
        messages: [{ role: "user", content: "Hello, say 'Ollama is working!'" }],
        stream: false
      })
    });
    const data = await response.json();
    console.log("Response:", data.message.content);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
verify();
