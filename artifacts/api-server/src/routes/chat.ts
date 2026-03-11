import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, lecturesTable } from "@workspace/db";
import { ChatBody, ChatResponse } from "@workspace/api-zod";
import { chatWithLecture } from "../lib/groq.js";

const router: IRouter = Router();

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lecture] = await db
    .select()
    .from(lecturesTable)
    .where(eq(lecturesTable.id, parsed.data.lectureId));

  if (!lecture) {
    res.status(404).json({ error: "Lecture not found" });
    return;
  }

  if (!lecture.transcript) {
    res.status(400).json({ error: "This lecture has not been transcribed yet." });
    return;
  }

  const answer = await chatWithLecture(lecture.transcript, parsed.data.message);

  res.json(ChatResponse.parse({ answer }));
});

export default router;
