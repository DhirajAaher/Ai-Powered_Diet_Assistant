import { Router } from "express";
import { db, profilesTable, mealEntriesTable, gamificationTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, AuthRequest } from "../lib/auth.js";
import { gemini, GEMINI_MODEL } from "../lib/gemini";

const router = Router();
router.use(requireAuth);

router.get("/message", async (req: AuthRequest, res) => {
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);
  const [gamification] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, req.userId!)).limit(1);

  const today = new Date().toISOString().split("T")[0];
  const meals = await db.select().from(mealEntriesTable).where(
    and(eq(mealEntriesTable.userId, req.userId!), gte(mealEntriesTable.loggedAt, today))
  );

  const totalCaloriesToday = meals.reduce((sum, m) => sum + m.calories, 0);
  const streak = gamification?.streakDays ?? 0;
  const goal = profile?.goal?.replace(/_/g, " ") ?? "stay healthy";
  const preference = profile?.dietPreference?.replace(/_/g, " ") ?? "balanced";

  const prompt = `You are NutriCoach, an encouraging and knowledgeable personal diet coach.
User info: Goal: ${goal}, Diet: ${preference}, Current streak: ${streak} days, Calories today: ${totalCaloriesToday} kcal.
Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.

Send a short, personalized daily coaching message (3-4 sentences max). Include:
1. A motivational line based on their goal/streak
2. One specific diet tip relevant to ${preference} diet
3. One actionable suggestion for today

Keep it warm, conversational, and encouraging. No lists, just natural text.`;

  const completion = await gemini.chat.completions.create({
    model: GEMINI_MODEL,
    max_completion_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  res.json({ message: completion.choices[0]?.message?.content ?? "Keep up the great work today!" });
});

router.get("/health-risks", async (req: AuthRequest, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const meals = await db.select().from(mealEntriesTable).where(
    and(eq(mealEntriesTable.userId, req.userId!), gte(mealEntriesTable.loggedAt, sevenDaysAgo))
  );

  if (meals.length < 3) {
    res.json({ risks: [], suggestions: [] });
    return;
  }

  const avgCalories = meals.reduce((s, m) => s + m.calories, 0) / 7;
  const avgProtein = meals.reduce((s, m) => s + (m.proteinGrams ?? 0), 0) / 7;
  const avgCarbs = meals.reduce((s, m) => s + (m.carbsGrams ?? 0), 0) / 7;
  const avgFat = meals.reduce((s, m) => s + (m.fatGrams ?? 0), 0) / 7;

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);
  const target = profile?.dailyCalorieTarget ?? 2000;

  const prompt = `You are a nutrition expert. Analyze these 7-day average nutrition stats and identify potential health risks.

Daily averages: Calories: ${Math.round(avgCalories)} (target: ${target}), Protein: ${Math.round(avgProtein)}g, Carbs: ${Math.round(avgCarbs)}g, Fat: ${Math.round(avgFat)}g

Respond ONLY in this JSON format (no markdown):
{
  "risks": [
    { "type": "warning|danger|info", "title": "Short title", "description": "1-2 sentence description" }
  ],
  "suggestions": ["Actionable suggestion 1", "Actionable suggestion 2", "Actionable suggestion 3"]
}

Include 2-4 risks based on the data. If everything looks good, include one positive "info" type message.`;

  const completion = await gemini.chat.completions.create({
    model: GEMINI_MODEL,
    max_completion_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    res.json(result);
  } catch {
    res.json({ risks: [], suggestions: [] });
  }
});

export default router;
