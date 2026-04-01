import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, tasksTable, lecturesTable, usersTable } from "@workspace/db";
import {
  GetTasksQueryParams,
  GetTasksResponse,
  ApproveTaskParams,
  ApproveTaskResponse,
  RejectTaskParams,
  RejectTaskResponse,
  CompleteTaskParams,
  CompleteTaskResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const params = GetTasksQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select({
    id: tasksTable.id,
    lectureId: tasksTable.lectureId,
    title: tasksTable.title,
    description: tasksTable.description,
    deadline: tasksTable.deadline,
    status: tasksTable.status,
    createdAt: tasksTable.createdAt,
  })
  .from(tasksTable)
  .leftJoin(lecturesTable, eq(tasksTable.lectureId, lecturesTable.id))
  .$dynamic();

  if (params.data.lectureId != null) {
    query = query.where(eq(tasksTable.lectureId, params.data.lectureId));
  }

  if (params.data.firebaseUid) {
    // Check if the user is a student or teacher
    const [user] = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, params.data.firebaseUid)).limit(1);

    if (user?.role === "student") {
      // Students ONLY see approved or completed tasks
      if (params.data.status === "completed") {
        query = query.where(eq(tasksTable.status, "completed"));
      } else {
        query = query.where(eq(tasksTable.status, "approved"));
      }
    } else if (params.data.status) {
      // Teachers can filter by status
      query = query.where(eq(tasksTable.status, params.data.status));
    }

    // Filter by the user's lectures if teacher, or just lectures in general if student?
    // Actually, lecturesTable.teacherUid is correct for teacher filtering.
    if (user?.role === "teacher") {
      query = query.where(eq(lecturesTable.teacherUid, params.data.firebaseUid));
    }
    // If student, they see all tasks for all lectures they are in? 
    // Currently, students see all approved tasks across the system, which is fine for this MVP.
  }

  const tasks = await query.orderBy(desc(tasksTable.createdAt));
  res.json(GetTasksResponse.parse(tasks));
  return;
});

router.patch("/tasks/:id/approve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ApproveTaskParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set({ status: "approved" })
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(ApproveTaskResponse.parse(task));
  return;
});

router.patch("/tasks/:id/reject", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RejectTaskParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set({ status: "rejected" })
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(RejectTaskResponse.parse(task));
  return;
});

router.patch("/tasks/:id/complete", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CompleteTaskParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set({ status: "completed" })
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(CompleteTaskResponse.parse(task));
  return;
});

export default router;
