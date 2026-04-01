import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, lecturesTable, tasksTable } from "@workspace/db";
import {
  GetLecturesQueryParams,
  GetLecturesResponse,
  CreateLectureBody,
  GetLectureParams,
  GetLectureResponse,
  DeleteLectureParams,
  ProcessLectureParams,
  ProcessLectureBody,
  ProcessLectureResponse,
  GetUploadUrlParams,
  GetUploadUrlBody,
  GetUploadUrlResponse,
} from "@workspace/api-zod";
import { getSupabase, BUCKET_NAME, ensureBucketExists } from "../lib/supabase.js";
import { transcribeAudio } from "../lib/speechToText.js";
import { summarizeLecture, extractTasksFromTranscript as extractTasks } from "../lib/groq.js";

const router: IRouter = Router();

router.get("/lectures", async (req, res): Promise<void> => {
  const params = GetLecturesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(lecturesTable).$dynamic();

  if (params.data.firebaseUid) {
    query = query.where(eq(lecturesTable.teacherUid, params.data.firebaseUid));
  }

  const lectures = await query.orderBy(desc(lecturesTable.createdAt));

  res.json(GetLecturesResponse.parse(lectures));
  return;
});

router.post("/lectures", async (req, res): Promise<void> => {
  const parsed = CreateLectureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lecture] = await db
    .insert(lecturesTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      teacherUid: parsed.data.teacherUid,
      status: "pending",
    })
    .returning();

  res.status(201).json(lecture);
  return;
});

router.get("/lectures/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetLectureParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lecture] = await db
    .select()
    .from(lecturesTable)
    .where(eq(lecturesTable.id, params.data.id));

  if (!lecture) {
    res.status(404).json({ error: "Lecture not found" });
    return;
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.lectureId, params.data.id));

  res.json(
    GetLectureResponse.parse({
      ...lecture,
      tasks,
    })
  );
  return;
});

router.delete("/lectures/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteLectureParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(lecturesTable)
    .where(eq(lecturesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Lecture not found" });
    return;
  }

  res.sendStatus(204);
  return;
});

router.post("/lectures/:id/upload-url", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUploadUrlParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = GetUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await ensureBucketExists();

  const filePath = `lectures/${params.data.id}/${Date.now()}-${parsed.data.fileName}`;

  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    res.status(500).json({ error: "Failed to create upload URL" });
    return;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  res.json(
    GetUploadUrlResponse.parse({
      uploadUrl: data.signedUrl,
      publicUrl,
    })
  );
  return;
});

router.post("/lectures/:id/process", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ProcessLectureParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ProcessLectureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(lecturesTable)
    .set({ status: "processing", audioUrl: parsed.data.audioUrl })
    .where(eq(lecturesTable.id, params.data.id));

  try {
    const transcript = await transcribeAudio(parsed.data.audioUrl);
    const summary = await summarizeLecture(transcript);
    const extractedTasks = await extractTasks(transcript);

    await db
      .update(lecturesTable)
      .set({ transcript, summary, status: "done" })
      .where(eq(lecturesTable.id, params.data.id));

    const taskInserts = extractedTasks.map((t) => ({
      lectureId: params.data.id,
      title: t.title,
      description: t.description,
      deadline: t.deadline ?? null,
      status: "pending" as const,
    }));

    if (taskInserts.length > 0) {
      await db.insert(tasksTable).values(taskInserts);
    }

    res.json(
      ProcessLectureResponse.parse({
        lectureId: params.data.id,
        status: "done",
        transcript,
        summary,
        tasksExtracted: taskInserts.length,
      })
    );
    return;
  } catch (err) {
    await db
      .update(lecturesTable)
      .set({ status: "error" })
      .where(eq(lecturesTable.id, params.data.id));

    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("[lectures] Processing error:", err);
    res.status(500).json({ error: message });
    return;
  }
});

export default router;
