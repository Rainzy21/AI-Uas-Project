import { ApiError, GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, ANALYZE_PROMPT } from "@/lib/analyzePrompts";
import { OPENROUTER_TIMEOUT_MS } from "@/lib/analyzeTimeouts";

const MAX_RESPONSE_CHARS = 500_000;

function retryDelayMs(err: unknown, attempt: number): number {
  if (err instanceof ApiError && err.status === 429) {
    return Math.min(2000 * 2 ** attempt, 15_000);
  }
  return 500 * 2 ** attempt;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const retryable =
        e instanceof ApiError && [429, 500, 502, 503].includes(e.status);
      if (!retryable || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, retryDelayMs(e, i)));
    }
  }
  throw last;
}

export function geminiUserMessage(err: ApiError): string {
  if (err.status === 401 || err.status === 403) {
    return (
      "Invalid Gemini API key. Get a free key at https://aistudio.google.com/apikey, " +
      "set GEMINI_API_KEY in .env.local, then restart the dev server."
    );
  }
  if (err.status === 429) {
    if (/limit:\s*0/i.test(err.message)) {
      return (
        "Kuota gratis Gemini untuk model ini habis (limit: 0). " +
        "Ganti GEMINI_MODEL=gemini-2.5-flash di .env.local, atau hubungkan billing di AI Studio " +
        "(Plan information → Set up billing). OpenRouter fallback juga gagal jika keduanya rate-limited."
      );
    }
    const retryMatch = err.message.match(/retry in (\d+(?:\.\d+)?)s/i);
    if (retryMatch) {
      const seconds = Math.ceil(Number(retryMatch[1]));
      return (
        `Gemini rate limit tercapai. Tunggu ~${seconds} detik lalu coba lagi, ` +
        "atau ganti GEMINI_MODEL=gemini-2.5-flash-lite di .env.local."
      );
    }
    return (
      "Gemini rate limit tercapai. Tunggu sebentar dan coba lagi, " +
      "atau ganti GEMINI_MODEL=gemini-2.5-flash di .env.local."
    );
  }
  if (err.message) return `Gemini error: ${err.message}`;
  return "Gemini request failed. Check your API key at https://aistudio.google.com/apikey.";
}

async function callGeminiOnce(
  apiKey: string,
  model: string,
  mimeType: string,
  base64: string,
  userPrompt: string = ANALYZE_PROMPT
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: userPrompt },
        { inlineData: { mimeType, data: base64 } },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 12_000,
        abortSignal: controller.signal,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    if (text.length > MAX_RESPONSE_CHARS) {
      throw new Error("Model response exceeded size limit");
    }
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callGemini(
  apiKey: string,
  model: string,
  mimeType: string,
  base64: string,
  userPrompt: string = ANALYZE_PROMPT
): Promise<string> {
  return withRetry(() => callGeminiOnce(apiKey, model, mimeType, base64, userPrompt));
}
