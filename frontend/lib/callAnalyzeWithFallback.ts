import { ApiError } from "@google/genai";
import { OpenRouterError } from "@openrouter/sdk/models/errors";
import {
  DEFAULT_DEEPSEEK_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  type AnalyzeProvider,
  type AnalyzeRuntimeConfig,
} from "@/lib/analyzeConfig";
import { callDeepSeek, DeepSeekError } from "@/lib/callDeepSeek";
import { callGemini } from "@/lib/callGemini";
import { callOpenRouter } from "@/lib/callOpenRouter";

export type AnalyzeCallResult = {
  rawText: string;
  provider: AnalyzeProvider;
  model: string;
  usedFallback: boolean;
};

function isRateLimitError(err: unknown): boolean {
  if (err instanceof DeepSeekError && err.status === 429) return true;
  if (err instanceof ApiError && err.status === 429) return true;
  if (err instanceof OpenRouterError && err.statusCode === 429) return true;
  return false;
}

function fallbackEnabled(): boolean {
  return process.env.ANALYZE_FALLBACK !== "false";
}

export async function callAnalyzeWithFallback(
  primary: AnalyzeRuntimeConfig,
  mimeType: string,
  base64: string
): Promise<AnalyzeCallResult> {
  try {
    const rawText = await callPrimary(primary, mimeType, base64);
    return {
      rawText,
      provider: primary.provider,
      model: primary.model,
      usedFallback: false,
    };
  } catch (err) {
    if (!fallbackEnabled() || !isRateLimitError(err)) {
      throw err;
    }

    for (const alternate of resolveAlternateProviders(primary)) {
      try {
        const rawText = await callPrimary(alternate, mimeType, base64);
        return {
          rawText,
          provider: alternate.provider,
          model: alternate.model,
          usedFallback: true,
        };
      } catch (alternateErr) {
        if (!isRateLimitError(alternateErr)) {
          throw alternateErr;
        }
      }
    }

    throw err;
  }
}

async function callPrimary(
  config: AnalyzeRuntimeConfig,
  mimeType: string,
  base64: string
): Promise<string> {
  if (config.provider === "deepseek") {
    return callDeepSeek(config.apiKey, config.model, mimeType, base64);
  }
  if (config.provider === "gemini") {
    return callGemini(config.apiKey, config.model, mimeType, base64);
  }
  return callOpenRouter(config.apiKey, config.model, mimeType, base64);
}

function resolveAlternateProviders(
  primary: AnalyzeRuntimeConfig
): AnalyzeRuntimeConfig[] {
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

  const candidates: AnalyzeRuntimeConfig[] = [];

  if (primary.provider !== "openrouter" && openrouterKey) {
    candidates.push({
      provider: "openrouter",
      apiKey: openrouterKey,
      model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
    });
  }
  if (primary.provider !== "gemini" && geminiKey) {
    candidates.push({
      provider: "gemini",
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    });
  }
  if (primary.provider !== "deepseek" && deepseekKey) {
    candidates.push({
      provider: "deepseek",
      apiKey: deepseekKey,
      model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL,
    });
  }

  return candidates;
}
