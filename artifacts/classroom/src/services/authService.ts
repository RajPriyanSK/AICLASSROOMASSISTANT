import api from "./api";

// ─── Types ──────────────────────────────────────────────────────
export interface User {
    id: number;
    firebaseUid: string;
    email: string;
    displayName?: string | null;
    role: "teacher" | "student";
    createdAt: string;
}

export interface SyncUserPayload {
    firebaseUid: string;
    email: string;
    displayName?: string | null;
    role: "teacher" | "student";
}

// ─── Service ────────────────────────────────────────────────────

/**
 * Sync a Firebase-authenticated user to the backend database.
 * Called after signup or first login to ensure a DB record exists.
 */
export async function syncUser(payload: SyncUserPayload): Promise<User> {
    return api.post("users/sync", payload);
}

/**
 * Get the current user's profile by Firebase UID.
 */
export async function getMe(firebaseUid: string): Promise<User> {
    return api.get("/users/me", { params: { firebaseUid } });
}

const authService = { syncUser, getMe };
export default authService;
