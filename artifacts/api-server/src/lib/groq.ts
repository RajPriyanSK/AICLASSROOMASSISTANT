import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ExtractedTask {
  title: string;
  description: string;
  deadline: string | null;
}

export async function extractTasksFromTranscript(transcript: string): Promise<ExtractedTask[]> {
  if (!transcript?.trim()) return [];

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting actionable tasks from lecture transcripts. 
          Identify ALL assignments, homework, projects, readings, and deadlines.
          
          Return ONLY a JSON array of objects with exactly these fields:
          - "title": concise task name
          - "description": full details/instructions
          - "deadline": ISO date string if mentioned, or a short relative date like "next Friday", or null if unknown.
          
          Example output: [{"title": "Read Ch 5", "description": "Read and take notes", "deadline": "2024-03-20"}]
          Return an empty array [] if no tasks are found.`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    const parsed = JSON.parse(raw);
    
    // Groq sometimes wraps the array in an object like { tasks: [...] }
    const tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
    
    return tasks.map((t: any) => ({
      title: t.title ?? "Untitled Task",
      description: t.description ?? "",
      deadline: t.deadline ?? t.due_date ?? null,
    }));
  } catch (error) {
    console.error("[groq] Task extraction failed:", error);
    return [];
  }
}

export async function chatWithLecture(transcript: string, question: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a helpful classroom assistant. You answer questions based on the lecture content provided. Be concise, accurate, and helpful. If the answer is not in the lecture content, say so clearly.

Lecture Transcript:
${transcript}`,
      },
      {
        role: "user",
        content: question,
      },
    ],
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";
}
