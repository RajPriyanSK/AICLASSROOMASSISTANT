import api from "./api";

// ─── Types ──────────────────────────────────────────────────────
export interface Task {
    id: number;
    lectureId: number;
    title: string;
    description?: string | null;
    deadline?: string | null;
    status: "pending" | "approved" | "rejected" | "completed";
    createdAt: string;
}

// ─── Service ────────────────────────────────────────────────────

/**
 * Fetch tasks, optionally filtered by lecture.
 */
export async function getTasks(
    firebaseUid: string,
    lectureId?: number,
): Promise<Task[]> {
    return api.get("tasks", { params: { firebaseUid, lectureId } });
}

/**
 * Mark a task as approved (teacher action).
 */
export async function approveTask(taskId: number): Promise<Task> {
    return api.patch(`tasks/${taskId}/approve`);
}

/**
 * Reject a task (teacher action).
 */
export async function rejectTask(taskId: number): Promise<Task> {
    return api.patch(`tasks/${taskId}/reject`);
}

/**
 * Mark a task as completed (student action).
 */
export async function completeTask(taskId: number): Promise<Task> {
    return api.patch(`tasks/${taskId}/complete`);
}

const taskService = { getTasks, approveTask, rejectTask, completeTask };
export default taskService;
