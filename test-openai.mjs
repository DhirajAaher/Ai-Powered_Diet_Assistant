import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "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",
  baseURL: "https://api.openai.com/v1",
});

async function main() {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello" }],
    });
    console.log("SUCCESS:", completion.choices[0].message.content);
  } catch (err) {
    console.error("FAILURE:", err.message);
  }
}

main();
