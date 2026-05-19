import { Router } from "express";
import { db, fastingSessionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";
import { awardPoints } from "../lib/gamification.js";

const router = Router();
router.use(requireAuth);

router.get("/active", async (req: AuthRequest, res) => {
  const [session] = await db.select().from(fastingSessionsTable).where(
    and(eq(fastingSessionsTable.userId, req.userId!), eq(fastingSessionsTable.status, "active"))
  ).limit(1);
  res.json(session || null);
});

router.post("/start", async (req: AuthRequest, res) => {
  const { mode } = req.body;
  if (!["16:8", "18:6", "OMAD"].includes(mode)) {
    res.status(400).json({ error: "Invalid mode. Choose 16:8, 18:6, or OMAD." });
    return;
  }
  await db.update(fastingSessionsTable).set({ status: "completed" }).where(
    and(eq(fastingSessionsTable.userId, req.userId!), eq(fastingSessionsTable.status, "active"))
  );
  const [result] = await db.insert(fastingSessionsTable).values({
    userId: req.userId!,
    mode,
    startTime: new Date(),
    status: "active",
  });
  const [session] = await db.select().from(fastingSessionsTable).where(eq(fastingSessionsTable.id, result.insertId));
  res.status(201).json(session);
});

router.post("/stop", async (req: AuthRequest, res) => {
  await db.update(fastingSessionsTable)
    .set({ status: "completed", endTime: new Date() })
    .where(and(eq(fastingSessionsTable.userId, req.userId!), eq(fastingSessionsTable.status, "active")));
  const [session] = await db.select().from(fastingSessionsTable).where(and(eq(fastingSessionsTable.userId, req.userId!), eq(fastingSessionsTable.status, "completed"))).orderBy(sql`${fastingSessionsTable.id} DESC`).limit(1);
  if (!session) {
    res.status(404).json({ error: "No active fasting session found." });
    return;
  }

  // Award points
  await awardPoints(req.userId!, "complete_fast");

  res.json(session);
});

router.get("/history", async (req: AuthRequest, res) => {
  const sessions = await db.select().from(fastingSessionsTable)
    .where(eq(fastingSessionsTable.userId, req.userId!))
    .orderBy(fastingSessionsTable.createdAt);
  res.json(sessions.slice(-20));
});

export default router;
