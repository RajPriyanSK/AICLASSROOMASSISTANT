import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, questionsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/questions", async (req, res): Promise<void> => {
  const { lectureId, firebaseUid } = req.query as { lectureId?: string; firebaseUid?: string };

  if (!firebaseUid) {
    res.status(400).json({ error: "firebaseUid is required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.firebaseUid, firebaseUid));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const conditions = user.role === "student"
    ? lectureId
      ? and(eq(questionsTable.studentId, user.id), eq(questionsTable.lectureId, parseInt(lectureId)))
      : eq(questionsTable.studentId, user.id)
    : lectureId
      ? eq(questionsTable.lectureId, parseInt(lectureId))
      : undefined;

  const questions = conditions
    ? await db.select().from(questionsTable).where(conditions).orderBy(questionsTable.createdAt)
    : await db.select().from(questionsTable).orderBy(questionsTable.createdAt);

  res.json(questions);
  return;
});

router.post("/questions", async (req, res): Promise<void> => {
  const { firebaseUid, lectureId, question } = req.body as {
    firebaseUid: string;
    lectureId: number;
    question: string;
  };

  if (!firebaseUid || !lectureId || !question?.trim()) {
    res.status(400).json({ error: "firebaseUid, lectureId, and question are required" });
    return;
  }

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.firebaseUid, firebaseUid));

  if (!student) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [created] = await db
    .insert(questionsTable)
    .values({ studentId: student.id, lectureId, question: question.trim() })
    .returning();

  res.status(201).json(created);
});

router.patch("/questions/:id/answer", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { answer } = req.body as { answer: string };

  if (!answer?.trim()) {
    res.status(400).json({ error: "answer is required" });
    return;
  }

  const [updated] = await db
    .update(questionsTable)
    .set({ answer: answer.trim() })
    .where(eq(questionsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json(updated);
  return;
});

router.delete("/questions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  res.status(204).send();
});

export default router;
