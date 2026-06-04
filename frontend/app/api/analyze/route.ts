import { NextRequest } from "next/server";
import { OpenRouter } from "@openrouter/sdk";
import { OpenRouterError, RequestTimeoutError } from "@openrouter/sdk/models/errors";
import { ALLOWED_TYPES, MAX_SIZE, MAX_SIZE_LABEL } from "@/lib/imageConstants";
import { formatHtml } from "@/lib/formatHtml";
import { VisAIResultSchema } from "@/lib/analyzeSchema";
import { extractJson } from "@/lib/extractJson";
import { SYSTEM_PROMPT, ANALYZE_PROMPT } from "@/lib/analyzePrompts";
import { preparePreviewHtml } from "@/lib/preparePreviewHtml";
import { checkAnalyzeAuth } from "@/lib/analyzeAuth";
import { detectMimeType } from "@/lib/detectMimeType";
import { captureRouteError } from "@/lib/observability";
import { OPENROUTER_TIMEOUT_MS } from "@/lib/analyzeTimeouts";
const MAX_RESPONSE_CHARS = 500_000;
const DEFAULT_MODEL = "moonshotai/kimi-k2.6:free";

function logError(
  requestId: string,
  message: string,
  extra?: Record<string, unknown>
) {
  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      route: "/api/analyze",
      message,
      ...extra,
    })
  );
}

/** Map OpenRouter HTTP status to a user-facing message. */
function openRouterUserMessage(status: number, errBody: string): string {
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
      if (/free|rate.?limit/i.test(raw)) {
        return (
          "Model gratis OpenRouter sedang dibatasi. Tunggu 1–2 menit lalu coba lagi, " +
          "atau ganti OPENROUTER_MODEL di .env.local ke model berbayar (butuh kredit di openrouter.ai/credits)."
        );
      }
      if (raw) {
        return `OpenRouter rate limit: ${raw.slice(0, 200)}`;
      }
    } catch {
      // ignore parse failure
    }
    return (
      "OpenRouter rate limit tercapai. Tunggu sebentar dan coba lagi, " +
      "atau gunakan model lain lewat OPENROUTER_MODEL."
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

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
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

async function callOpenRouter(
  apiKey: string,
  model: string,
  mimeType: string,
  base64: string
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
              { type: "text", text: ANALYZE_PROMPT },
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

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    if (!checkAnalyzeAuth(req.headers.get("x-visai-key"))) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      return Response.json(
        { error: "Invalid file type. Only PNG, JPG, and WebP are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: `File too large. Maximum size is ${MAX_SIZE_LABEL}.` },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      logError(requestId, "OPENROUTER_API_KEY is not set");
      return Response.json({ error: "API key not configured", requestId }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();
    const detectedMime = detectMimeType(buffer);
    if (!detectedMime || !(ALLOWED_TYPES as readonly string[]).includes(detectedMime)) {
      return Response.json(
        { error: "File content does not match an allowed image type." },
        { status: 400 }
      );
    }

    if (file.type !== detectedMime) {
      return Response.json(
        { error: "Declared file type does not match file content." },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(buffer).toString("base64");
    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
    const startedAt = Date.now();

    const rawText = await withRetry(() =>
      callOpenRouter(apiKey, model, detectedMime, base64)
    );
    const clean = extractJson(rawText);

    let result: unknown;
    try {
      result = JSON.parse(clean);
    } catch {
      logError(requestId, "Failed to parse model response as JSON", {
        preview: rawText.slice(0, 200),
      });
      return Response.json(
        { error: "Failed to parse model response as JSON", requestId },
        { status: 502 }
      );
    }

    const parsed = VisAIResultSchema.safeParse(result);
    if (!parsed.success) {
      logError(requestId, "Schema validation failed", {
        issues: parsed.error.flatten(),
      });
      return Response.json(
        { error: "Model returned an unexpected response shape", requestId },
        { status: 502 }
      );
    }

    const { analysis, html } = parsed.data;
    const safeHtml = formatHtml(preparePreviewHtml(html, analysis));

    console.info(
      JSON.stringify({
        level: "info",
        requestId,
        route: "/api/analyze",
        message: "analyze success",
        model,
        durationMs: Date.now() - startedAt,
      })
    );

    return Response.json({
      analysis,
      html: safeHtml,
      timestamp: Date.now(),
    });
  } catch (err) {
    captureRouteError(err, { requestId, route: "/api/analyze" });
    if (err instanceof OpenRouterError) {
      logError(requestId, "OpenRouter error", {
        status: err.statusCode,
        bodyPreview: err.body.slice(0, 300),
      });
      return Response.json(
        { error: openRouterUserMessage(err.statusCode, err.body), requestId },
        { status: 502 }
      );
    }
    if (err instanceof RequestTimeoutError) {
      logError(requestId, "OpenRouter request timed out");
      return Response.json(
        { error: "Request timed out. Please try again.", requestId },
        { status: 504 }
      );
    }
    if (err instanceof Error && err.message === "Model response exceeded size limit") {
      logError(requestId, err.message);
      return Response.json(
        { error: "Model response was too large. Try a simpler image.", requestId },
        { status: 502 }
      );
    }
    logError(requestId, "Unexpected error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "Something went wrong", requestId }, { status: 500 });
  }
}
