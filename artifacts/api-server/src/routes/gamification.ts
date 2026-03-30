import { Router } from "express";
import { db, gamificationTable, mealEntriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

const BADGES = [
  { id: "first_log", name: "First Step", desc: "Log your first meal", icon: "🌱", points: 10 },
  { id: "streak_3", name: "3-Day Streak", desc: "Log meals 3 days in a row", icon: "🔥", points: 30 },
  { id: "streak_7", name: "7-Day Healthy Streak", desc: "Log meals 7 days in a row", icon: "⚡", points: 70 },
  { id: "streak_30", name: "Monthly Champion", desc: "Log meals 30 days in a row", icon: "🏆", points: 300 },
  { id: "protein_master", name: "Protein Goal Master", desc: "Hit protein goal 5 times", icon: "💪", points: 50 },
  { id: "hydration_hero", name: "Hydration Hero", desc: "Hit water goal 7 times", icon: "💧", points: 50 },
  { id: "level_5", name: "Level 5 Achiever", desc: "Reach Level 5", icon: "⭐", points: 100 },
  { id: "level_10", name: "Diet Master", desc: "Reach Level 10", icon: "👑", points: 200 },
];

const LEVELS = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000, 4000];

function getLevel(points: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i]) return i + 1;
  }
  return 1;
}

router.get("/", async (req: AuthRequest, res) => {
  let [record] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, req.userId!)).limit(1);
  if (!record) {
    [record] = await db.insert(gamificationTable).values({ userId: req.userId! }).returning();
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
  const pointsMap: Record<string, number> = {
    log_meal: 5,
    log_water: 2,
    log_weight: 3,
    generate_plan: 20,
    complete_fast: 15,
    chat_message: 1,
  };
  const pts = pointsMap[action] ?? 0;
  if (pts === 0) {
    res.status(400).json({ error: "Unknown action" });
    return;
  }

  let [record] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, req.userId!)).limit(1);
  if (!record) {
    [record] = await db.insert(gamificationTable).values({ userId: req.userId! }).returning();
  }

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  let newStreak = record.streakDays;
  let newLastLog = record.lastLogDate;

  if (action === "log_meal") {
    if (record.lastLogDate === yesterday) {
      newStreak = record.streakDays + 1;
    } else if (record.lastLogDate !== today) {
      newStreak = 1;
    }
    newLastLog = today;
  }

  const newPoints = record.points + pts;
  const newLevel = getLevel(newPoints);

  const earnedBadgeIds: string[] = JSON.parse(record.badges || "[]");
  const newBadges = [...earnedBadgeIds];

  if (action === "log_meal" && !newBadges.includes("first_log")) newBadges.push("first_log");
  if (newStreak >= 3 && !newBadges.includes("streak_3")) newBadges.push("streak_3");
  if (newStreak >= 7 && !newBadges.includes("streak_7")) newBadges.push("streak_7");
  if (newStreak >= 30 && !newBadges.includes("streak_30")) newBadges.push("streak_30");
  if (newLevel >= 5 && !newBadges.includes("level_5")) newBadges.push("level_5");
  if (newLevel >= 10 && !newBadges.includes("level_10")) newBadges.push("level_10");

  const [updated] = await db.update(gamificationTable).set({
    points: newPoints,
    level: newLevel,
    streakDays: newStreak,
    lastLogDate: newLastLog,
    badges: JSON.stringify(newBadges),
    updatedAt: new Date(),
  }).where(eq(gamificationTable.userId, req.userId!)).returning();

  const newlyEarned = newBadges.filter(id => !earnedBadgeIds.includes(id)).map(id => BADGES.find(b => b.id === id)).filter(Boolean);
  res.json({ points: newPoints, level: newLevel, streak: newStreak, pointsEarned: pts, newBadges: newlyEarned });
});

export default router;
