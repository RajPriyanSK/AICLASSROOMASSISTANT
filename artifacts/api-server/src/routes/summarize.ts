/**
 * POST /summarize
 *
 * Sends a lecture transcript to Google Gemini and extracts:
 *   - A structured lecture summary
 *   - All assignments, homework, and deadlines
 *
 * If lectureId is provided, persists results in Neon PostgreSQL
 * (updates lectures.summary and inserts rows into tasks table).
 *
 * Response:
 * {
 *   summary: "...",
 *   tasks: [{ title, description, due_date }],
 *   lectureId: number | null,
 *   tasksCreated: number
 * }
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, lecturesTable, tasksTable } from "@workspace/db";
import { analyzeLecture } from "../lib/gemini.js";

const router: IRouter = Router();

router.post("/summarize", async (req, res): Promise<void> => {
  const { transcript, lectureId } = req.body as {
    transcript?: string;
    lectureId?: number | string;
  };

  if (!transcript?.trim()) {
    res.status(400).json({
      error: "transcript is required. Provide the full lecture text to analyze.",
    });
    return;
  }

  const parsedLectureId = lectureId ? parseInt(String(lectureId), 10) : null;

  // Verify the lecture exists if an ID was given
  if (parsedLectureId) {
    const [lecture] = await db
      .select()
      .from(lecturesTable)
      .where(eq(lecturesTable.id, parsedLectureId));

    if (!lecture) {
      res.status(404).json({ error: `Lecture with id ${parsedLectureId} not found` });
      return;
    }
  }

  try {
    const { summary, tasks } = await analyzeLecture(transcript.trim());

    let tasksCreated = 0;

    if (parsedLectureId) {
      // Persist summary
      await db
        .update(lecturesTable)
        .set({ summary, status: "done" })
        .where(eq(lecturesTable.id, parsedLectureId));

      // Persist extracted tasks
      if (tasks.length > 0) {
        const rows = tasks.map((t) => ({
          lectureId: parsedLectureId,
          title: t.title,
          description: t.description,
          deadline: t.deadline ?? null,
          status: "pending" as const,
        }));
        await db.insert(tasksTable).values(rows);
        tasksCreated = rows.length;
      }
    }

    res.json({
      summary,
      tasks: tasks.map((t) => ({
        title: t.title,
        description: t.description,
        due_date: t.deadline ?? null,
      })),
      lectureId: parsedLectureId,
      tasksCreated,
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      error: err.message ?? "Gemini analysis failed",
      lectureId: parsedLectureId,
    });
    return;
  }
});

export default router;
