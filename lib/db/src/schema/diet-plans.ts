import { mysqlTable, int, int, text, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const dietPlansTable = mysqlTable("diet_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dailyCalories: int("daily_calories").notNull(),
  proteinGrams: int("protein_grams").notNull(),
  carbsGrams: int("carbs_grams").notNull(),
  fatGrams: int("fat_grams").notNull(),
  planData: text("plan_data").notNull(),
  groceryList: text("grocery_list"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDietPlanSchema = createInsertSchema(dietPlansTable).omit({ id: true, createdAt: true });
export type InsertDietPlan = z.infer<typeof insertDietPlanSchema>;
export type DietPlan = typeof dietPlansTable.$inferSelect;
