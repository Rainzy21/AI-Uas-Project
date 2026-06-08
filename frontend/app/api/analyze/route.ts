import { NextRequest } from "next/server";
import { OpenRouterError, RequestTimeoutError } from "@openrouter/sdk/models/errors";
import { ApiError } from "@google/genai";
import { ALLOWED_TYPES, MAX_SIZE, MAX_SIZE_LABEL } from "@/lib/imageConstants";
import { formatHtml } from "@/lib/formatHtml";
import { VisAIResultSchema } from "@/lib/analyzeSchema";
import { extractJson } from "@/lib/extractJson";
import { preparePreviewHtml } from "@/lib/preparePreviewHtml";
import { checkAnalyzeAuth } from "@/lib/analyzeAuth";
import { detectMimeType } from "@/lib/detectMimeType";
import { captureRouteError } from "@/lib/observability";
import { resolveAnalyzeConfig } from "@/lib/analyzeConfig";
import { callAnalyzeWithFallback } from "@/lib/callAnalyzeWithFallback";
import { DeepSeekError, deepSeekUserMessage } from "@/lib/callDeepSeek";
import { geminiUserMessage } from "@/lib/callGemini";
import { openRouterUserMessage } from "@/lib/callOpenRouter";
import { VisionProxyUnavailableError } from "@/lib/describeImageForDeepSeek";

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

    const analyzeConfig = resolveAnalyzeConfig();
    if ("error" in analyzeConfig) {
      logError(requestId, analyzeConfig.error);
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
    const startedAt = Date.now();

    const {
      rawText,
      provider,
      model,
      usedFallback,
    } = await callAnalyzeWithFallback(analyzeConfig, detectedMime, base64);
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
        provider,
        model,
        usedFallback,
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
    if (err instanceof DeepSeekError) {
      logError(requestId, "DeepSeek error", {
        status: err.status,
        bodyPreview: err.body.slice(0, 300),
      });
      return Response.json(
        { error: deepSeekUserMessage(err), requestId },
        { status: 502 }
      );
    }
    if (err instanceof VisionProxyUnavailableError) {
      logError(requestId, err.message);
      return Response.json({ error: err.message, requestId }, { status: 500 });
    }
    if (err instanceof ApiError) {
      logError(requestId, "Gemini error", {
        status: err.status,
        message: err.message,
      });
      return Response.json(
        { error: geminiUserMessage(err), requestId },
        { status: 502 }
      );
    }
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
      logError(requestId, "Model request timed out");
      return Response.json(
        { error: "Request timed out. Please try again.", requestId },
        { status: 504 }
      );
    }
    if (err instanceof Error && err.name === "AbortError") {
      logError(requestId, "Model request timed out");
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
    if (err instanceof Error && err.message === "Empty response from DeepSeek") {
      logError(requestId, err.message);
      return Response.json(
        { error: "Model returned an empty response. Please try again.", requestId },
        { status: 502 }
      );
    }
    if (err instanceof Error && err.message === "Empty response from Gemini") {
      logError(requestId, err.message);
      return Response.json(
        { error: "Model returned an empty response. Please try again.", requestId },
        { status: 502 }
      );
    }
    logError(requestId, "Unexpected error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "Something went wrong", requestId }, { status: 500 });
  }
}
