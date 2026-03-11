import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { lecturesTable } from "./lectures";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  lectureId: integer("lecture_id").notNull().references(() => lecturesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  deadline: text("deadline"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
