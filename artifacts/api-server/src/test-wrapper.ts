import 'dotenv/config';
import { gemini } from './src/lib/gemini.js';

async function test() {
  try {
    console.log("Testing gemini wrapper...");
    const result = await gemini.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: [{ role: "user", content: "hi" }],
      stream: false
    });
    console.log("SUCCESS:", result.choices[0].message.content);
  } catch (err) {
    console.error("FAILURE:", err.message);
  }
}

test();
