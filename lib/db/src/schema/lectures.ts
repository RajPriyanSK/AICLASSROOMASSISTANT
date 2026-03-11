import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lecturesTable = pgTable("lectures", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  audioUrl: text("audio_url"),
  transcript: text("transcript"),
  summary: text("summary"),
  status: text("status").notNull().default("pending"),
  teacherUid: text("teacher_uid").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLectureSchema = createInsertSchema(lecturesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLecture = z.infer<typeof insertLectureSchema>;
export type Lecture = typeof lecturesTable.$inferSelect;
