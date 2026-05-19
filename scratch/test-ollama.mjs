import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "ollama",
  baseURL: "http://localhost:11434/v1",
});

async function main() {
  try {
    console.log("Attempting to connect to Ollama...");
    const completion = await client.chat.completions.create({
      model: "gemma:2b",
      messages: [{ role: "user", content: "Hello, say 'Ollama is working!'" }],
      max_completion_tokens: 100,
    });
    console.log("SUCCESS:", completion.choices[0].message.content);
  } catch (err) {
    console.error("FAILURE:", err.message);
  }
}

main();
