/**
 * Teacher-specific routes
 *
 * GET /teacher/lectures
 *   Returns all lectures owned by the authenticated teacher, each enriched
 *   with its full transcript, summary, and associated tasks.
 *   Query param: firebaseUid (string, required)
 */
import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { db, lecturesTable, tasksTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/teacher/lectures", async (req, res): Promise<void> => {
  const { firebaseUid } = req.query as { firebaseUid?: string };

  if (!firebaseUid) {
    res.status(400).json({ error: "firebaseUid query parameter is required" });
    return;
  }

  // Verify the user exists and is a teacher
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.firebaseUid, firebaseUid));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role !== "teacher") {
    res.status(403).json({ error: "Only teachers can access this endpoint" });
    return;
  }

  // Fetch all lectures (filtered by teacher UID)
  const lectures = await db
    .select()
    .from(lecturesTable)
    .where(eq(lecturesTable.teacherUid, firebaseUid))
    .orderBy(desc(lecturesTable.createdAt));

  // Fetch all tasks for those lectures in a single query
  const lectureIds = lectures.map((l) => l.id);
  const allTasks =
    lectureIds.length > 0
      ? await db
          .select()
          .from(tasksTable)
          .where(inArray(tasksTable.lectureId, lectureIds))
          .orderBy(desc(tasksTable.createdAt))
      : [];

  // Group tasks by lectureId
  const tasksByLecture: Record<number, typeof allTasks> = {};
  for (const task of allTasks) {
    if (!tasksByLecture[task.lectureId]) tasksByLecture[task.lectureId] = [];
    tasksByLecture[task.lectureId].push(task);
  }

  const enriched = lectures.map((lecture) => ({
    id: lecture.id,
    title: lecture.title,
    description: lecture.description,
    audioUrl: lecture.audioUrl,
    transcript: lecture.transcript,
    summary: lecture.summary,
    status: lecture.status,
    teacherUid: lecture.teacherUid,
    createdAt: lecture.createdAt,
    updatedAt: lecture.updatedAt,
    tasks: (tasksByLecture[lecture.id] ?? []).map((t) => ({
      id: t.id,
      lectureId: t.lectureId,
      title: t.title,
      description: t.description,
      deadline: t.deadline,
      status: t.status,
      createdAt: t.createdAt,
    })),
  }));

  res.json(enriched);
  return;
});

export default router;
