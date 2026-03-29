import api from "./api";

// ─── Types ──────────────────────────────────────────────────────
export interface ChatRequest {
    lectureId: number;
    message: string;
    firebaseUid: string;
}

export interface ChatResponse {
    answer: string;
}

// ─── Service ────────────────────────────────────────────────────

/**
 * Send a question about a specific lecture to the Groq-powered AI chatbot.
 *
 * Flow:
 *   1. Student submits a question + lectureId
 *   2. Backend retrieves the lecture transcript from the database
 *   3. Transcript + question are sent to Groq LLM (llama-3.3-70b-versatile)
 *   4. AI answer is returned
 */
export async function askQuestion(payload: ChatRequest): Promise<ChatResponse> {
    return api.post("chat", payload);
}

const chatService = { askQuestion };
export default chatService;
