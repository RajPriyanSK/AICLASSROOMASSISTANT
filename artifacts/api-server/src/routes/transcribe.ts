/**
 * POST /transcribe
 *
 * Receives an audio URL and an optional lectureId.
 * Sends the audio to RapidAPI Speech-to-Text.
 * If lectureId is provided, stores the transcript in Neon PostgreSQL.
 * Returns the transcript text.
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, lecturesTable } from "@workspace/db";
import { transcribeAudio } from "../lib/speechToText.js";

const router: IRouter = Router();

router.post("/transcribe", async (req, res): Promise<void> => {
  const { audioUrl, lectureId, language } = req.body as {
    audioUrl?: string;
    lectureId?: number | string;
    language?: string;
  };

  if (!audioUrl?.trim()) {
    res.status(400).json({
      error: "audioUrl is required. Provide the publicly accessible URL of the audio file.",
    });
    return;
  }

  const parsedLectureId = lectureId ? parseInt(String(lectureId), 10) : null;

  // If lectureId given, verify lecture exists and mark as processing
  if (parsedLectureId) {
    const [lecture] = await db
      .select()
      .from(lecturesTable)
      .where(eq(lecturesTable.id, parsedLectureId));

    if (!lecture) {
      res.status(404).json({ error: `Lecture with id ${parsedLectureId} not found` });
      return;
    }

    await db
      .update(lecturesTable)
      .set({ status: "processing", audioUrl: audioUrl.trim() })
      .where(eq(lecturesTable.id, parsedLectureId));
  }

  try {
    const transcript = await transcribeAudio(
      audioUrl.trim(),
      language ?? "en"
    );

    // Store transcript in the lectures table if lectureId was given
    if (parsedLectureId) {
      await db
        .update(lecturesTable)
        .set({ transcript })
        .where(eq(lecturesTable.id, parsedLectureId));
    }

    res.json({
      transcript,
      lectureId: parsedLectureId,
      audioUrl: audioUrl.trim(),
      language: language ?? "en",
      charCount: transcript.length,
      wordCount: transcript.split(/\s+/).filter(Boolean).length,
    });
    return;
  } catch (err: any) {
    // If we marked the lecture as processing, set it back to error
    if (parsedLectureId) {
      await db
        .update(lecturesTable)
        .set({ status: "error" })
        .where(eq(lecturesTable.id, parsedLectureId))
        .catch(() => {}); // non-fatal
    }

    res.status(500).json({
      error: err.message ?? "Transcription failed",
      audioUrl: audioUrl.trim(),
      lectureId: parsedLectureId,
    });
    return;
  }
});

export default router;
