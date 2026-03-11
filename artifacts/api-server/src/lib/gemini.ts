import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function summarizeLecture(transcript: string): Promise<string> {
  const prompt = `You are an educational assistant. Summarize the following lecture transcript in a clear, structured way with key points and main topics covered. Keep it concise but comprehensive.

Transcript:
${transcript}

Provide a well-structured summary:`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export interface ExtractedTask {
  title: string;
  description: string;
  deadline: string | null;
}

export async function extractTasks(transcript: string): Promise<ExtractedTask[]> {
  const prompt = `You are an educational assistant. Extract all assignments, tasks, homework, projects, and deadlines from the following lecture transcript.

Return ONLY a valid JSON array. Each item should have:
- title: short task title (string)
- description: detailed description of what needs to be done (string)
- deadline: deadline if mentioned (string like "next week", "Friday", "2024-01-15", etc.) or null

Transcript:
${transcript}

Return ONLY the JSON array, no other text:`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  
  try {
    return JSON.parse(jsonMatch[0]) as ExtractedTask[];
  } catch {
    return [];
  }
}
