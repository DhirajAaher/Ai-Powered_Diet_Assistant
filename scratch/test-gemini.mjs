import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";

// Load .env from api-server
dotenv.config({ path: "artifacts/api-server/.env" });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY not found in artifacts/api-server/.env");
  process.exit(1);
}

console.log("Testing Gemini API key:", GEMINI_API_KEY.substring(0, 10) + "...");

const client = new OpenAI({
  apiKey: GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function test() {
  try {
    const response = await client.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: [{ role: "user", content: "Say 'Gemini is working!'" }],
    });
    console.log("Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error testing Gemini:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

test();
