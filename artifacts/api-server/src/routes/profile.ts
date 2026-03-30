import { Router } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateOrUpdateProfileBody } from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profile);
});

router.post("/", async (req: AuthRequest, res) => {
  const parse = CreateOrUpdateProfileBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.message });
    return;
  }
  const data = parse.data;

  // Calculate BMR and daily calorie target
  const bmr = data.gender === "male"
    ? 10 * data.weightKg + 6.25 * data.heightCm - 5 * data.age + 5
    : 10 * data.weightKg + 6.25 * data.heightCm - 5 * data.age - 161;

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const tdee = bmr * (activityMultipliers[data.activityLevel] || 1.55);
  const goalAdjustments: Record<string, number> = {
    weight_loss: -500,
    muscle_gain: 300,
    maintenance: 0,
    improve_health: 0,
  };
  const dailyCalorieTarget = Math.round(tdee + (goalAdjustments[data.goal] || 0));

  const existing = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);

  let profile;
  if (existing.length > 0) {
    [profile] = await db
      .update(profilesTable)
      .set({ ...data, dailyCalorieTarget, updatedAt: new Date() })
      .where(eq(profilesTable.userId, req.userId!))
      .returning();
  } else {
    [profile] = await db
      .insert(profilesTable)
      .values({ ...data, userId: req.userId!, dailyCalorieTarget })
      .returning();
  }

  res.json(profile);
});

export default router;
