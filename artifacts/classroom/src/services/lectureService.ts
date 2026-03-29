import api from "./api";

// ─── Types ──────────────────────────────────────────────────────
export interface Lecture {
    id: number;
    title: string;
    description?: string | null;
    audioUrl?: string | null;
    status: "pending" | "processing" | "done" | "error";
    teacherUid: string;
    createdAt: string;
    updatedAt: string;
}

export interface Task {
    id: number;
    lectureId: number;
    title: string;
    description?: string | null;
    deadline?: string | null;
    status: "pending" | "approved" | "rejected" | "completed";
    createdAt: string;
}

export interface LectureDetail extends Lecture {
    transcript?: string | null;
    summary?: string | null;
    tasks?: Task[];
}

export interface CreateLecturePayload {
    title: string;
    description?: string | null;
    teacherUid: string;
}

export interface ProcessLecturePayload {
    audioUrl: string;
}

export interface ProcessLectureResponse {
    lectureId: number;
    status: string;
    transcript?: string | null;
    summary?: string | null;
    tasksExtracted: number;
}

export interface UploadUrlResponse {
    uploadUrl: string;
    publicUrl: string;
}

// ─── Service ────────────────────────────────────────────────────

/**
 * Fetch all lectures visible to the authenticated user.
 */
export async function getLectures(firebaseUid: string): Promise<Lecture[]> {
    return api.get("lectures", { params: { firebaseUid } });
}

/**
 * Fetch a single lecture with its transcript, summary, and tasks.
 */
export async function getLecture(id: number): Promise<LectureDetail> {
    return api.get(`lectures/${id}`);
}

/**
 * Create a new lecture (teacher only).
 */
export async function createLecture(payload: CreateLecturePayload): Promise<Lecture> {
    return api.post("lectures", payload);
}

/**
 * Delete a lecture by ID (teacher only).
 */
export async function deleteLecture(id: number): Promise<void> {
    return api.delete(`lectures/${id}`);
}

/**
 * Get a signed upload URL for Supabase Storage.
 * Returns { uploadUrl, publicUrl }.
 */
export async function getUploadUrl(
    lectureId: number,
    fileName: string,
    contentType: string,
): Promise<UploadUrlResponse> {
    return api.post(`lectures/${lectureId}/upload-url`, { fileName, contentType });
}

/**
 * Trigger AI processing for a lecture (transcribe → summarise → extract tasks).
 */
export async function processLecture(
    lectureId: number,
    audioUrl: string,
): Promise<ProcessLectureResponse> {
    return api.post(`lectures/${lectureId}/process`, { audioUrl });
}

const lectureService = {
    getLectures,
    getLecture,
    createLecture,
    deleteLecture,
    getUploadUrl,
    processLecture,
};
export default lectureService;
