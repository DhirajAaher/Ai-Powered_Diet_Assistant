import { Router } from "express";
import { db, profilesTable, dietPlansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GenerateDietPlanBody, CheckFoodCaloriesBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/generate-plan", async (req: AuthRequest, res) => {
  const parse = GenerateDietPlanBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.message });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profile not found. Please complete your profile first." });
    return;
  }

  const prompt = `You are a professional nutritionist. Create a detailed 7-day personalized meal plan for:
- Age: ${profile.age}, Gender: ${profile.gender}
- Height: ${profile.heightCm}cm, Weight: ${profile.weightKg}kg
- Activity Level: ${profile.activityLevel.replace(/_/g, " ")}
- Diet Preference: ${profile.dietPreference.replace(/_/g, " ")}
- Goal: ${profile.goal.replace(/_/g, " ")}
- Daily Calorie Target: ${profile.dailyCalorieTarget} kcal

Respond in this EXACT JSON format (no markdown, just JSON):
{
  "title": "Personalized Diet Plan for [goal]",
  "dailyCalories": ${profile.dailyCalorieTarget},
  "proteinGrams": <calculated>,
  "carbsGrams": <calculated>,
  "fatGrams": <calculated>,
  "days": [
    {
      "day": "Monday",
      "breakfast": { "name": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "lunch": { "name": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "dinner": { "name": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "snacks": [{ "name": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }],
      "totalCalories": 0
    }
  ],
  "groceryList": ["item1", "item2", ...]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let planData: Record<string, unknown>;
  try {
    planData = JSON.parse(content);
  } catch {
    planData = { days: [], groceryList: [] };
  }

  const [saved] = await db.insert(dietPlansTable).values({
    userId: req.userId!,
    title: (planData.title as string) || `Diet Plan - ${new Date().toLocaleDateString()}`,
    dailyCalories: (planData.dailyCalories as number) || profile.dailyCalorieTarget || 2000,
    proteinGrams: (planData.proteinGrams as number) || 0,
    carbsGrams: (planData.carbsGrams as number) || 0,
    fatGrams: (planData.fatGrams as number) || 0,
    planData: JSON.stringify(planData.days || []),
    groceryList: JSON.stringify(planData.groceryList || []),
  }).returning();

  res.json(saved);
});

router.get("/plans", async (req: AuthRequest, res) => {
  const plans = await db.select({
    id: dietPlansTable.id,
    title: dietPlansTable.title,
    dailyCalories: dietPlansTable.dailyCalories,
    createdAt: dietPlansTable.createdAt,
  }).from(dietPlansTable).where(eq(dietPlansTable.userId, req.userId!)).orderBy(dietPlansTable.createdAt);
  res.json(plans);
});

router.get("/plans/:id", async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const [plan] = await db.select().from(dietPlansTable).where(eq(dietPlansTable.id, id)).limit(1);
  if (!plan || plan.userId !== req.userId!) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(plan);
});

router.post("/check-food", async (req: AuthRequest, res) => {
  const parse = CheckFoodCaloriesBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.message });
    return;
  }
  const { foodName, portionSize } = parse.data;

  const prompt = `You are a nutrition expert. Provide accurate nutritional information for:
Food: ${foodName}
Portion: ${portionSize}

Respond in this EXACT JSON format (no markdown):
{
  "foodName": "${foodName}",
  "portionSize": "${portionSize}",
  "calories": <integer>,
  "proteinGrams": <number>,
  "carbsGrams": <number>,
  "fatGrams": <number>,
  "fiberGrams": <number>,
  "healthScore": <integer 1-10>,
  "alternatives": ["alternative1", "alternative2", "alternative3"],
  "tips": "Brief tip about this food"
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let nutrition: Record<string, unknown>;
  try {
    nutrition = JSON.parse(content);
  } catch {
    nutrition = { foodName, portionSize, calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0, healthScore: 5, alternatives: [], tips: "" };
  }

  res.json(nutrition);
});

router.post("/swap-meal", async (req: AuthRequest, res) => {
  const { planId, day, mealType, dietPreference } = req.body;
  if (!planId || !day || !mealType) {
    res.status(400).json({ error: "planId, day, and mealType are required." });
    return;
  }
  const [plan] = await db.select().from(dietPlansTable).where(eq(dietPlansTable.id, parseInt(planId))).limit(1);
  if (!plan || plan.userId !== req.userId!) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  const days = JSON.parse(plan.planData);
  const dayData = days.find((d: any) => d.day === day);
  if (!dayData) { res.status(404).json({ error: "Day not found" }); return; }
  const currentMeal = dayData[mealType];
  const prompt = `You are a nutritionist. Replace this meal with a different ${dietPreference?.replace(/_/g, " ") || "balanced"} meal with similar calories (${currentMeal?.calories || 400} kcal). 
Current meal: ${currentMeal?.name || mealType}.
Respond ONLY in JSON format (no markdown):
{ "name": "New Meal Name", "calories": <integer>, "protein": <number>, "carbs": <number>, "fat": <number> }`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });
  try {
    const newMeal = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const updatedDays = days.map((d: any) => d.day === day ? { ...d, [mealType]: newMeal } : d);
    const updatedGroceries = JSON.parse(plan.groceryList || "[]");
    if (newMeal.name) updatedGroceries.push(newMeal.name);
    const [updated] = await db.update(dietPlansTable).set({
      planData: JSON.stringify(updatedDays),
      groceryList: JSON.stringify(updatedGroceries),
    }).where(eq(dietPlansTable.id, plan.id)).returning();
    res.json({ meal: newMeal, plan: updated });
  } catch {
    res.status(500).json({ error: "Failed to generate meal swap." });
  }
});

export default router;
