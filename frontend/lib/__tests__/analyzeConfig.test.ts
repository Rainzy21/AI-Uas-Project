import { describe, it, expect, afterEach } from "vitest";
import {
  DEFAULT_DEEPSEEK_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  resolveAnalyzeConfig,
} from "@/lib/analyzeConfig";

describe("resolveAnalyzeConfig", () => {
  const originalDeepseekKey = process.env.DEEPSEEK_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const originalProvider = process.env.ANALYZE_PROVIDER;
  const originalDeepseekModel = process.env.DEEPSEEK_MODEL;
  const originalGeminiModel = process.env.GEMINI_MODEL;
  const originalOpenRouterModel = process.env.OPENROUTER_MODEL;

  afterEach(() => {
    if (originalDeepseekKey !== undefined) {
      process.env.DEEPSEEK_API_KEY = originalDeepseekKey;
    } else {
      delete process.env.DEEPSEEK_API_KEY;
    }
    process.env.GEMINI_API_KEY = originalGeminiKey;
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
    if (originalProvider !== undefined) {
      process.env.ANALYZE_PROVIDER = originalProvider;
    } else {
      delete process.env.ANALYZE_PROVIDER;
    }
    if (originalDeepseekModel !== undefined) {
      process.env.DEEPSEEK_MODEL = originalDeepseekModel;
    } else {
      delete process.env.DEEPSEEK_MODEL;
    }
    if (originalGeminiModel !== undefined) {
      process.env.GEMINI_MODEL = originalGeminiModel;
    } else {
      delete process.env.GEMINI_MODEL;
    }
    if (originalOpenRouterModel !== undefined) {
      process.env.OPENROUTER_MODEL = originalOpenRouterModel;
    } else {
      delete process.env.OPENROUTER_MODEL;
    }
  });

  it("prefers DeepSeek when DEEPSEEK_API_KEY is set and provider is unset", () => {
    process.env.DEEPSEEK_API_KEY = "deepseek-key";
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    delete process.env.ANALYZE_PROVIDER;

    const config = resolveAnalyzeConfig();
    expect(config).toEqual({
      provider: "deepseek",
      apiKey: "deepseek-key",
      model: DEFAULT_DEEPSEEK_MODEL,
    });
  });

  it("uses Gemini when only GEMINI_API_KEY is set", () => {
    delete process.env.DEEPSEEK_API_KEY;
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    delete process.env.ANALYZE_PROVIDER;

    const config = resolveAnalyzeConfig();
    expect(config).toEqual({
      provider: "gemini",
      apiKey: "gemini-key",
      model: DEFAULT_GEMINI_MODEL,
    });
  });

  it("uses OpenRouter when only OPENROUTER_API_KEY is set", () => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.GEMINI_API_KEY;
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    delete process.env.ANALYZE_PROVIDER;

    const config = resolveAnalyzeConfig();
    expect(config).toEqual({
      provider: "openrouter",
      apiKey: "openrouter-key",
      model: DEFAULT_OPENROUTER_MODEL,
    });
  });

  it("respects ANALYZE_PROVIDER=openrouter even when DeepSeek key exists", () => {
    process.env.DEEPSEEK_API_KEY = "deepseek-key";
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    process.env.ANALYZE_PROVIDER = "openrouter";

    const config = resolveAnalyzeConfig();
    expect(config).toMatchObject({
      provider: "openrouter",
      apiKey: "openrouter-key",
    });
  });
});
