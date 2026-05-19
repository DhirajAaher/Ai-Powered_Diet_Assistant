import { Router } from "express";
import { db, gamificationTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";
import { BADGES, LEVELS, getLevel, awardPoints } from "../lib/gamification.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  let [record] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, req.userId!)).limit(1);
  if (!record) {
    const [result] = await db.insert(gamificationTable).values({ userId: req.userId! });
    [record] = await db.select().from(gamificationTable).where(eq(gamificationTable.id, result.insertId));
  }
  const earnedBadgeIds: string[] = JSON.parse(record.badges || "[]");
  const earnedBadges = BADGES.filter(b => earnedBadgeIds.includes(b.id));
  const nextBadges = BADGES.filter(b => !earnedBadgeIds.includes(b.id)).slice(0, 3);
  const currentLevel = getLevel(record.points);
  const nextLevelPoints = LEVELS[currentLevel] ?? LEVELS[LEVELS.length - 1];
  const prevLevelPoints = LEVELS[currentLevel - 1] ?? 0;
  res.json({
    points: record.points,
    level: currentLevel,
    streakDays: record.streakDays,
    badges: earnedBadges,
    nextBadges,
    nextLevelPoints,
    prevLevelPoints,
    allBadges: BADGES,
  });
});

router.post("/award", async (req: AuthRequest, res) => {
  const { action } = req.body;
  const result = await awardPoints(req.userId!, action);
  if (!result) {
    res.status(400).json({ error: "Unknown action or zero points" });
    return;
  }
  res.json(result);
});

export default router;

