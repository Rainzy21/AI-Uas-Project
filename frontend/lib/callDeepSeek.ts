import { OPENROUTER_TIMEOUT_MS } from "@/lib/analyzeTimeouts";
import {
  buildDeepSeekUserPrompt,
  describeImageForTextModel,
  SYSTEM_PROMPT,
} from "@/lib/describeImageForDeepSeek";

const MAX_RESPONSE_CHARS = 500_000;
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export class DeepSeekError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`DeepSeek API error (${status})`);
    this.name = "DeepSeekError";
    this.status = status;
    this.body = body;
  }
}

function retryDelayMs(err: unknown, attempt: number): number {
  if (err instanceof DeepSeekError && err.status === 429) {
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
        e instanceof DeepSeekError && [429, 500, 502, 503].includes(e.status);
      if (!retryable || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, retryDelayMs(e, i)));
    }
  }
  throw last;
}

export function deepSeekUserMessage(err: DeepSeekError): string {
  if (err.status === 401) {
    return (
      "Invalid DeepSeek API key. Create a key at https://platform.deepseek.com/api_keys, " +
      "set DEEPSEEK_API_KEY in .env.local, then restart the dev server."
    );
  }
  if (err.status === 402) {
    return "DeepSeek account has insufficient balance. Top up at https://platform.deepseek.com/";
  }
  if (err.status === 429) {
    return (
      "DeepSeek rate limit tercapai. Tunggu sebentar dan coba lagi, " +
      "atau ganti DEEPSEEK_MODEL di .env.local."
    );
  }
  try {
    const parsed = JSON.parse(err.body) as { error?: { message?: string } };
    const msg = parsed.error?.message;
    if (msg) return `DeepSeek error: ${msg}`;
  } catch {
    // ignore parse failure
  }
  return "DeepSeek request failed. Check your API key and account balance.";
}

async function callDeepSeekTextOnce(
  apiKey: string,
  model: string,
  userPrompt: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 12_000,
        stream: false,
      }),
      signal: controller.signal,
    });

    const body = await res.text();
    if (!res.ok) {
      throw new DeepSeekError(res.status, body);
    }

    const parsed = JSON.parse(body) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = parsed.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from DeepSeek");
    }
    if (content.length > MAX_RESPONSE_CHARS) {
      throw new Error("Model response exceeded size limit");
    }
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callDeepSeek(
  apiKey: string,
  model: string,
  mimeType: string,
  base64: string
): Promise<string> {
  const imageDescription = await describeImageForTextModel(mimeType, base64);
  const userPrompt = buildDeepSeekUserPrompt(imageDescription);
  return withRetry(() => callDeepSeekTextOnce(apiKey, model, userPrompt));
}
