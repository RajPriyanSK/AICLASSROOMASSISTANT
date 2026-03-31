import { GoogleGenerativeAI } from "@google/generative-ai";

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
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
You are an expert academic summarizer. Your goal is to transform the following lecture transcript into a professional, beautifully formatted executive summary.

Structure the summary with the following sections using clear Markdown:
1. # [Title of the Lecture] (Create a fitting title)
2. ## 🎯 Core Objective (1-2 sentences on the main goal)
3. ## 📝 Key Concepts (Use bold headers and bullet points for detailed explanations)
4. ## 💡 Critical Insights & Takeaways (What were the most important points?)
5. ## ❓ Summary (A final concluding paragraph)

Use professional language, high-fidelity formatting, and ensure the summary is visually "aligned" and easy to scan.

Rules for JSON output:
- "summary": The full markdown-formatted summary as described above.
- "tasks": (Leave empty or extract for redundancy)

Return ONLY valid JSON matching this exact shape:
{
  "summary": "...",
  "tasks": []
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
    console.error("[gemini] Error details:", raw);
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
