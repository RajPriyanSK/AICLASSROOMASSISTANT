import axios, { type AxiosError } from "axios";

const RAPIDAPI_HOST = "ai-speech-to-text1.p.rapidapi.com";
const TRANSCRIBE_URL = `https://${RAPIDAPI_HOST}/transcribe/url`;

interface RapidApiResponse {
  text?: string;
  transcript?: string;
  results?: Array<{
    transcript?: string;
    alternatives?: Array<{ transcript?: string }>;
  }>;
  data?: { text?: string; transcript?: string };
  output?: string;
  recognized?: string;
}

function extractText(data: RapidApiResponse): string | null {
  // Handle every known field shape from the RapidAPI speech-to-text family
  if (data.text) return data.text;
  if (data.transcript) return data.transcript;
  if (data.output) return data.output;
  if (data.recognized) return data.recognized;
  if (data.data?.text) return data.data.text;
  if (data.data?.transcript) return data.data.transcript;
  if (data.results?.[0]?.transcript) return data.results[0].transcript;
  if (data.results?.[0]?.alternatives?.[0]?.transcript) {
    return data.results[0].alternatives[0].transcript;
  }
  return null;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Transcribe an audio URL using RapidAPI Speech-to-Text.
 * Retries up to maxRetries times on network/server errors (5xx).
 * Stores nothing — the caller is responsible for persisting the result.
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
      const { data } = await axios.post<RapidApiResponse>(
        TRANSCRIBE_URL,
        { url: audioUrl, language },
        {
          headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": RAPIDAPI_HOST,
            "Content-Type": "application/json",
          },
          timeout: 120_000, // 2 minutes — long audio can be slow
        }
      );

      const text = extractText(data);
      if (text?.trim()) return text.trim();

      // Response returned but no text found — don't retry
      console.warn("[speechToText] Unexpected response shape:", JSON.stringify(data));
      return "Transcription completed, but the API returned no text. The audio may be silent or in an unsupported format.";
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status ?? 0;

      lastError = new Error(
        axiosErr.response
          ? `RapidAPI error ${status}: ${JSON.stringify(axiosErr.response.data)}`
          : axiosErr.message
      );

      // 4xx = client error — don't retry
      if (status >= 400 && status < 500) break;

      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.warn(`[speechToText] Attempt ${attempt} failed. Retrying in ${delay}ms…`);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("Transcription failed after all retries.");
}
