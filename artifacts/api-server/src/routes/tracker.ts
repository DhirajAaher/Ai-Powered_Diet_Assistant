import { Router } from "express";
import { db, mealEntriesTable, waterEntriesTable, weightEntriesTable, profilesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { LogMealBody, LogWaterBody, LogWeightBody } from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/today", async (req: AuthRequest, res) => {
  const today = new Date().toISOString().split("T")[0];

  const meals = await db.select().from(mealEntriesTable).where(
    and(eq(mealEntriesTable.userId, req.userId!), eq(mealEntriesTable.loggedAt, today))
  );

  const waterResult = await db.select({
    total: sql<number>`COALESCE(SUM(${waterEntriesTable.amountMl}), 0)`,
  }).from(waterEntriesTable).where(
    and(eq(waterEntriesTable.userId, req.userId!), eq(waterEntriesTable.loggedAt, today))
  );

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.proteinGrams ?? 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbsGrams ?? 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fatGrams ?? 0), 0);

  res.json({
    date: today,
    totalCalories,
    totalProteinGrams: totalProtein,
    totalCarbsGrams: totalCarbs,
    totalFatGrams: totalFat,
    totalWaterMl: Number(waterResult[0]?.total ?? 0),
    meals,
    calorieTarget: profile?.dailyCalorieTarget ?? 2000,
    waterTarget: 2500,
  });
});

router.post("/log-meal", async (req: AuthRequest, res) => {
  const parse = LogMealBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.message });
    return;
  }
  const today = new Date().toISOString().split("T")[0];
  const loggedAt = parse.data.loggedAt instanceof Date
    ? parse.data.loggedAt.toISOString().split("T")[0]
    : (parse.data.loggedAt ?? today);
  const [entry] = await db.insert(mealEntriesTable).values({
    userId: req.userId!,
    mealType: parse.data.mealType,
    foodName: parse.data.foodName,
    portionSize: parse.data.portionSize,
    calories: parse.data.calories,
    proteinGrams: parse.data.proteinGrams ?? null,
    carbsGrams: parse.data.carbsGrams ?? null,
    fatGrams: parse.data.fatGrams ?? null,
    loggedAt,
  }).returning();
  res.status(201).json(entry);
});

router.post("/log-water", async (req: AuthRequest, res) => {
  const parse = LogWaterBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.message });
    return;
  }
  const today = new Date().toISOString().split("T")[0];
  const waterLoggedAt = parse.data.loggedAt instanceof Date
    ? parse.data.loggedAt.toISOString().split("T")[0]
    : (parse.data.loggedAt ?? today);
  const [entry] = await db.insert(waterEntriesTable).values({
    userId: req.userId!,
    amountMl: parse.data.amountMl,
    loggedAt: waterLoggedAt,
  }).returning();
  res.json(entry);
});

router.get("/meals", async (req: AuthRequest, res) => {
  const from = (req.query.from as string) ?? new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const to = (req.query.to as string) ?? new Date().toISOString().split("T")[0];

  const meals = await db.select().from(mealEntriesTable).where(
    and(
      eq(mealEntriesTable.userId, req.userId!),
      gte(mealEntriesTable.loggedAt, from),
      lte(mealEntriesTable.loggedAt, to)
    )
  );
  res.json(meals);
});

router.post("/weight", async (req: AuthRequest, res) => {
  const parse = LogWeightBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.message });
    return;
  }
  const today = new Date().toISOString().split("T")[0];
  const weightLoggedAt = parse.data.loggedAt instanceof Date
    ? parse.data.loggedAt.toISOString().split("T")[0]
    : (parse.data.loggedAt ?? today);
  const [entry] = await db.insert(weightEntriesTable).values({
    userId: req.userId!,
    weightKg: parse.data.weightKg,
    loggedAt: weightLoggedAt,
  }).returning();
  res.status(201).json(entry);
});

router.get("/weight", async (req: AuthRequest, res) => {
  const weights = await db.select().from(weightEntriesTable)
    .where(eq(weightEntriesTable.userId, req.userId!))
    .orderBy(weightEntriesTable.loggedAt);
  res.json(weights);
});

export default router;
