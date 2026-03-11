import axios from "axios";

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const apiKey = process.env.RAPIDAPI_KEY!;

  const options = {
    method: "POST" as const,
    url: "https://ai-speech-to-text1.p.rapidapi.com/transcribe/url",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "ai-speech-to-text1.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    data: {
      url: audioUrl,
      language: "en",
    },
  };

  try {
    const response = await axios.request(options);
    const data = response.data as { text?: string; transcript?: string; results?: { transcript?: string }[] };

    if (data.text) return data.text;
    if (data.transcript) return data.transcript;
    if (data.results?.[0]?.transcript) return data.results[0].transcript;

    return "Transcription completed but no text was returned. Please check the audio file.";
  } catch (error) {
    console.error("Speech-to-text error:", error);
    throw new Error("Failed to transcribe audio. Please ensure the audio URL is publicly accessible.");
  }
}
