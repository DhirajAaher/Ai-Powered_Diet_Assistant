import { mysqlTable, int, int, text, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const gamificationTable = mysqlTable("gamification", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  points: int("points").notNull().default(0),
  level: int("level").notNull().default(1),
  streakDays: int("streak_days").notNull().default(0),
  lastLogDate: text("last_log_date"),
  badges: text("badges").notNull().default("[]"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fastingSessionsTable = mysqlTable("fasting_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGamificationSchema = createInsertSchema(gamificationTable).omit({ id: true, updatedAt: true });
export const insertFastingSessionSchema = createInsertSchema(fastingSessionsTable).omit({ id: true, createdAt: true });
export type Gamification = typeof gamificationTable.$inferSelect;
export type FastingSession = typeof fastingSessionsTable.$inferSelect;
