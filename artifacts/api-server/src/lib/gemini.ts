import { GoogleGenerativeAI } from "@google/generative-ai";

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });
}

export interface ExtractedTask {
  title: string;
  description: string;
  deadline: string | null;
}

export interface LectureAnalysis {
  summary: string;
  tasks: ExtractedTask[];
}

const COMBINED_PROMPT = (transcript: string) => `
You are an expert educational assistant. Analyze the following lecture transcript and return a JSON object.

Rules:
- "summary": A well-structured summary covering all key concepts, topics, and takeaways from the lecture. Use clear paragraphs. Be comprehensive yet concise (4-8 paragraphs).
- "tasks": Extract ALL assignments, homework, projects, quizzes, readings, and any work students are expected to complete. For each:
  - "title": A short, clear task name (e.g. "Chapter 5 Reading", "Lab Report Submission")
  - "description": Full description of what is required, including any instructions mentioned
  - "due_date": The deadline if mentioned (e.g. "next Friday", "2024-02-15", "before next class") or null if not specified

If no tasks are mentioned, return an empty array for "tasks".

Return ONLY valid JSON matching this exact shape:
{
  "summary": "...",
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "due_date": "..."
    }
  ]
}

Lecture Transcript:
---
${transcript}
---
`.trim();

/**
 * Analyze a lecture transcript in one Gemini call.
 * Returns a structured summary and list of extracted tasks/assignments.
 */
export async function analyzeLecture(transcript: string): Promise<LectureAnalysis> {
  if (!transcript?.trim()) {
    return { summary: "", tasks: [] };
  }

  const model = getModel();
  const result = await model.generateContent(COMBINED_PROMPT(transcript));
  const raw = result.response.text().trim();

  try {
    const parsed = JSON.parse(raw) as {
      summary?: string;
      tasks?: Array<{ title?: string; description?: string; due_date?: string | null; deadline?: string | null }>;
    };

    const tasks: ExtractedTask[] = (parsed.tasks ?? []).map((t) => ({
      title: t.title ?? "Untitled Task",
      description: t.description ?? "",
      deadline: t.due_date ?? t.deadline ?? null,
    }));

    return {
      summary: parsed.summary ?? "",
      tasks,
    };
  } catch {
    // Fallback: extract JSON block if Gemini wrapped it in markdown
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const fallback = JSON.parse(jsonMatch[0]) as { summary?: string; tasks?: ExtractedTask[] };
        return {
          summary: fallback.summary ?? "",
          tasks: (fallback.tasks ?? []).map((t) => ({
            title: t.title ?? "Untitled Task",
            description: t.description ?? "",
            deadline: t.deadline ?? null,
          })),
        };
      } catch {
        /* fall through */
      }
    }
    console.warn("[gemini] Failed to parse JSON response. Raw:", raw.slice(0, 300));
    return { summary: raw, tasks: [] };
  }
}

// ─── Backward-compatible helpers used by the process route ───────────────────

export async function summarizeLecture(transcript: string): Promise<string> {
  const { summary } = await analyzeLecture(transcript);
  return summary;
}

export async function extractTasks(transcript: string): Promise<ExtractedTask[]> {
  const { tasks } = await analyzeLecture(transcript);
  return tasks;
}
