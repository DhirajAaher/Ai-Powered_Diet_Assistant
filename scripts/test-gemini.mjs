
import 'dotenv/config';
import OpenAI from "openai";

const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function main() {
  try {
    console.log("Testing Gemini API connection...");
    const completion = await gemini.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: [{ role: "user", content: "Hello, how are you?" }],
    });
    console.log("Response:", completion.choices[0].message.content);
  } catch (err) {
    console.error("Gemini Error:", err);
  } finally {
    process.exit();
  }
}

main();
