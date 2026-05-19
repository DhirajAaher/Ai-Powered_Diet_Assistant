import { mysqlTable, int, int, text, real, date, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const mealEntriesTable = mysqlTable("meal_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mealType: text("meal_type").notNull(),
  foodName: text("food_name").notNull(),
  portionSize: text("portion_size").notNull(),
  calories: int("calories").notNull(),
  proteinGrams: real("protein_grams"),
  carbsGrams: real("carbs_grams"),
  fatGrams: real("fat_grams"),
  loggedAt: date("logged_at", { mode: 'string' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const waterEntriesTable = mysqlTable("water_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amountMl: int("amount_ml").notNull(),
  loggedAt: date("logged_at", { mode: 'string' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const weightEntriesTable = mysqlTable("weight_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  weightKg: real("weight_kg").notNull(),
  loggedAt: date("logged_at", { mode: 'string' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMealEntrySchema = createInsertSchema(mealEntriesTable).omit({ id: true, createdAt: true });
export const insertWaterEntrySchema = createInsertSchema(waterEntriesTable).omit({ id: true, createdAt: true });
export const insertWeightEntrySchema = createInsertSchema(weightEntriesTable).omit({ id: true, createdAt: true });

export type InsertMealEntry = z.infer<typeof insertMealEntrySchema>;
export type MealEntry = typeof mealEntriesTable.$inferSelect;
export type InsertWaterEntry = z.infer<typeof insertWaterEntrySchema>;
export type WaterEntry = typeof waterEntriesTable.$inferSelect;
export type InsertWeightEntry = z.infer<typeof insertWeightEntrySchema>;
export type WeightEntry = typeof weightEntriesTable.$inferSelect;
