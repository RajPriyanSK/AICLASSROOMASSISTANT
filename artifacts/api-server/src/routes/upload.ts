import { Router, type IRouter, Request, Response } from "express";
import multer from "multer";
import { getSupabase, BUCKET_NAME, ensureBucketExists } from "../lib/supabase.js";

const router: IRouter = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200 MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

/**
 * POST /upload-lecture-audio
 *
 * Accepts multipart/form-data with fields:
 *   - audio: the audio file (required)
 *   - lectureId: integer lecture ID (optional, used to name the file)
 *
 * Returns:
 *   { publicUrl: string, fileName: string, size: number, mimeType: string }
 */
router.post(
  "/upload-lecture-audio",
  upload.single("audio"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No audio file provided. Send a multipart/form-data request with field name 'audio'." });
      return;
    }

    const { lectureId } = req.body as { lectureId?: string };
    const ext = req.file.originalname.split(".").pop() ?? extensionFromMime(req.file.mimetype);
    const fileName = lectureId
      ? `lecture-${lectureId}-${Date.now()}.${ext}`
      : `audio-${Date.now()}.${ext}`;

    try {
      await ensureBucketExists();

      const supabase = getSupabase();
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (error) {
        res.status(500).json({ error: `Supabase upload failed: ${error.message}` });
        return;
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      res.status(201).json({
        publicUrl: urlData.publicUrl,
        fileName,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
      return;
    } catch (err: any) {
      res.status(500).json({ error: err.message ?? "Upload failed" });
    }
  }
);

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "mp4",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/aac": "aac",
    "audio/flac": "flac",
  };
  return map[mime] ?? "audio";
}

export default router;
