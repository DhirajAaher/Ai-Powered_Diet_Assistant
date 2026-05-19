async function test() {
  const prompt = `You are a medical nutritionist. Create a diet plan for: Diabetes.
Diet preference: balanced.
Respond ONLY in this JSON format:
{
  "condition": "Diabetes",
  "foods_to_eat": ["food 1 - reason", "food 2 - reason", "food 3 - reason"],
  "foods_to_avoid": ["food 1 - reason", "food 2 - reason", "food 3 - reason"],
  "key_nutrients": ["Nutrient 1", "Nutrient 2", "Nutrient 3"],
  "meal_timing": ["Tip 1", "Tip 2"],
  "sample_day": {
    "breakfast": "Description",
    "lunch": "Description",
    "dinner": "Description",
    "snacks": ["Snack 1"]
  },
  "tips": ["Tip 1", "Tip 2"]
}`;

  console.time("Ollama Response Time");
  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma:2b",
        messages: [{ role: "user", content: prompt }],
        stream: false
      })
    });
    const data = await response.json();
    console.timeEnd("Ollama Response Time");
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.timeEnd("Ollama Response Time");
    console.error("Error:", err.message);
  }
}
test();
