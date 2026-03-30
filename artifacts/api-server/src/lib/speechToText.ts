import axios, { type AxiosError } from "axios";

const RAPIDAPI_HOST = "speech-to-text-ai.p.rapidapi.com";
const TRANSCRIBE_URL = `https://${RAPIDAPI_HOST}/transcribe`;

interface RapidApiResponse {
  text?: string;
  transcript?: string;
  output?: string;
  recognized?: string;
  results?: Array<{ transcript?: string }>;
}

function extractText(data: RapidApiResponse): string | null {
  return (
    data.text ||
    data.transcript ||
    data.output ||
    data.recognized ||
    data.results?.[0]?.transcript ||
    null
  );
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Transcribe an audio URL using RapidAPI Speech-to-Text (Whisper).
 */
export async function transcribeAudio(
  audioUrl: string,
  language = "en",
  maxRetries = 3
): Promise<string> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error("RAPIDAPI_KEY environment variable is not set");

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // The API expects url, lang, and task as query parameters per the snippet provided
      const { data } = await axios.post<RapidApiResponse>(
        TRANSCRIBE_URL,
        "file=", // Body as requested in snippet
        {
          params: {
            url: audioUrl,
            lang: language,
            task: "transcribe",
          },
          headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": RAPIDAPI_HOST,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 180_000, // 3 minutes
        }
      );

      const text = extractText(data);
      if (text?.trim()) return text.trim();

      console.warn("[speechToText] Unexpected response shape:", JSON.stringify(data));
      return "Transcription completed, but no text was extracted. Please ensure the audio contains clear speech.";
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status ?? 0;

      lastError = new Error(
        axiosErr.response
          ? `RapidAPI error ${status}: ${JSON.stringify(axiosErr.response.data)}`
          : axiosErr.message
      );

      if (status >= 400 && status < 500) break;

      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("Transcription failed after all retries.");
}
