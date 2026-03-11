import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
