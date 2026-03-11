import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
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

  let query = db.select().from(tasksTable).$dynamic();

  if (params.data.lectureId != null) {
    query = query.where(eq(tasksTable.lectureId, params.data.lectureId));
  }

  const tasks = await query.orderBy(desc(tasksTable.createdAt));
  res.json(GetTasksResponse.parse(tasks));
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
});

export default router;
