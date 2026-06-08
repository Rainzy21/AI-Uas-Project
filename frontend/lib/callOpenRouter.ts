import { OpenRouter } from "@openrouter/sdk";
import { OpenRouterError } from "@openrouter/sdk/models/errors";
import { SYSTEM_PROMPT, ANALYZE_PROMPT } from "@/lib/analyzePrompts";
import { OPENROUTER_TIMEOUT_MS } from "@/lib/analyzeTimeouts";
import { resolveOpenRouterModelChain } from "@/lib/openRouterModels";

const MAX_RESPONSE_CHARS = 500_000;

/** Map OpenRouter HTTP status to a user-facing message. */
export function openRouterUserMessage(status: number, errBody: string): string {
  if (status === 401) {
    return "Invalid OpenRouter API key. Create a new key at openrouter.ai/keys, update OPENROUTER_API_KEY in .env.local, then restart the dev server.";
  }
  if (status === 402) {
    return "OpenRouter account has insufficient credits. Add credits at openrouter.ai/credits.";
  }
  if (status === 429) {
    try {
      const parsed = JSON.parse(errBody) as {
        error?: { message?: string; metadata?: { raw?: string } };
      };
      const raw = parsed.error?.metadata?.raw ?? parsed.error?.message ?? "";
      if (/kimi|free|rate.?limit/i.test(raw)) {
        return (
          "Model gratis (mis. Kimi) sedang dibatasi. Tunggu 1–2 menit lalu coba lagi, " +
          "atau set OPENROUTER_MODEL=openrouter/free di .env.local untuk model gratis lain."
        );
      }
      if (raw) {
        return `OpenRouter rate limit: ${raw.slice(0, 200)}`;
      }
    } catch {
      // ignore parse failure
    }
    return (
      "Semua model gratis OpenRouter sedang rate-limited. Tunggu sebentar dan coba lagi, " +
      "atau ganti OPENROUTER_MODEL di .env.local."
    );
  }
  try {
    const parsed = JSON.parse(errBody) as { error?: { message?: string } };
    const msg = parsed.error?.message;
    if (msg) return `OpenRouter error: ${msg}`;
  } catch {
    // ignore parse failure
  }
  return "OpenRouter request failed. Check your API key and account credits.";
}

function retryDelayMs(err: unknown, attempt: number): number {
  if (err instanceof OpenRouterError) {
    const retryAfter = err.headers.get("retry-after");
    if (retryAfter) {
      const sec = Number(retryAfter);
      if (!Number.isNaN(sec) && sec > 0) {
        return Math.min(sec * 1000, 30_000);
      }
    }
    if (err.statusCode === 429) {
      return Math.min(2000 * 2 ** attempt, 15_000);
    }
  }
  return 500 * 2 ** attempt;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const retryable =
        e instanceof OpenRouterError && [429, 502, 503].includes(e.statusCode);
      if (!retryable || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, retryDelayMs(e, i)));
    }
  }
  throw last;
}

function isModelSwitchError(err: unknown): boolean {
  return err instanceof OpenRouterError && [429, 502, 503].includes(err.statusCode);
}

async function callOpenRouterOnce(
  apiKey: string,
  model: string,
  mimeType: string,
  base64: string,
  userPrompt: string = ANALYZE_PROMPT
): Promise<string> {
  const openrouter = new OpenRouter({ apiKey });

  const stream = await openrouter.chat.send(
    {
      httpReferer: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      appTitle: "VisAI",
      chatRequest: {
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                imageUrl: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
        stream: true,
        temperature: 0.2,
        maxTokens: 12_000,
      },
    },
    { timeoutMs: OPENROUTER_TIMEOUT_MS }
  );

  const parts: string[] = [];
  let totalLen = 0;
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (!content) continue;
    parts.push(content);
    totalLen += content.length;
    if (totalLen > MAX_RESPONSE_CHARS) {
      throw new Error("Model response exceeded size limit");
    }
  }
  return parts.join("");
}

export async function callOpenRouter(
  apiKey: string,
  model: string,
  mimeType: string,
  base64: string,
  userPrompt: string = ANALYZE_PROMPT
): Promise<string> {
  const models = resolveOpenRouterModelChain(model);
  let lastErr: unknown;

  for (const candidate of models) {
    try {
      return await withRetry(() =>
        callOpenRouterOnce(apiKey, candidate, mimeType, base64, userPrompt)
      );
    } catch (err) {
      lastErr = err;
      if (!isModelSwitchError(err)) throw err;
    }
  }

  throw lastErr;
}
