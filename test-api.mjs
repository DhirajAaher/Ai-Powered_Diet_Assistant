import OpenAI from "openai";

const gemini = new OpenAI({
  apiKey: "AIzaSyAKlo-HsENLBuHUaBAFUUL7boaWBJYnh0U",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function main() {
  try {
    const completion = await gemini.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: [{ role: "user", content: "Hello" }],
    });
    console.log("SUCCESS:", completion.choices[0].message.content);
  } catch (err) {
    console.error("FAILURE:", err.message);
  }
}

main();
