import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "@google/genai";
import { OpenRouterError } from "@openrouter/sdk/models/errors";
import { callAnalyzeWithFallback } from "@/lib/callAnalyzeWithFallback";

vi.mock("@/lib/callGemini", () => ({
  callGemini: vi.fn(),
}));

vi.mock("@/lib/callOpenRouter", () => ({
  callOpenRouter: vi.fn(),
}));

vi.mock("@/lib/callDeepSeek", () => ({
  callDeepSeek: vi.fn(),
  DeepSeekError: class DeepSeekError extends Error {
    status: number;
    body: string;
    constructor(status: number, body: string) {
      super(`DeepSeek API error (${status})`);
      this.status = status;
      this.body = body;
    }
  },
}));

import { callGemini } from "@/lib/callGemini";
import { callOpenRouter } from "@/lib/callOpenRouter";
import { callDeepSeek, DeepSeekError } from "@/lib/callDeepSeek";

const mockCallGemini = vi.mocked(callGemini);
const mockCallOpenRouter = vi.mocked(callOpenRouter);
const mockCallDeepSeek = vi.mocked(callDeepSeek);

describe("callAnalyzeWithFallback", () => {
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFallback = process.env.ANALYZE_FALLBACK;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    process.env.GEMINI_API_KEY = "gemini-key";
    delete process.env.ANALYZE_FALLBACK;
  });

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalFallback !== undefined) {
      process.env.ANALYZE_FALLBACK = originalFallback;
    } else {
      delete process.env.ANALYZE_FALLBACK;
    }
  });

  it("falls back to OpenRouter when DeepSeek returns 429", async () => {
    mockCallDeepSeek.mockRejectedValueOnce(new DeepSeekError(429, "{}"));
    mockCallOpenRouter.mockResolvedValueOnce("ok");

    const result = await callAnalyzeWithFallback(
      { provider: "deepseek", apiKey: "deepseek-key", model: "deepseek-chat" },
      "image/png",
      "abc"
    );

    expect(result).toEqual({
      rawText: "ok",
      provider: "openrouter",
      model: "moonshotai/kimi-k2.6:free",
      usedFallback: true,
    });
  });

  it("falls back to OpenRouter when Gemini returns 429", async () => {
    mockCallGemini.mockRejectedValueOnce(new ApiError({ message: "limit: 0", status: 429 }));
    mockCallOpenRouter.mockResolvedValueOnce("ok");

    const result = await callAnalyzeWithFallback(
      { provider: "gemini", apiKey: "gemini-key", model: "gemini-2.5-flash" },
      "image/png",
      "abc"
    );

    expect(result).toEqual({
      rawText: "ok",
      provider: "openrouter",
      model: "moonshotai/kimi-k2.6:free",
      usedFallback: true,
    });
  });

  it("rethrows Gemini 429 when fallback is disabled", async () => {
    process.env.ANALYZE_FALLBACK = "false";
    mockCallGemini.mockRejectedValueOnce(new ApiError({ message: "limit: 0", status: 429 }));

    await expect(
      callAnalyzeWithFallback(
        { provider: "gemini", apiKey: "gemini-key", model: "gemini-2.5-flash" },
        "image/png",
        "abc"
      )
    ).rejects.toBeInstanceOf(ApiError);

    expect(mockCallOpenRouter).not.toHaveBeenCalled();
  });

  it("rethrows non-rate-limit errors without fallback", async () => {
    mockCallOpenRouter.mockRejectedValueOnce(
      new OpenRouterError("Unauthorized", {
        response: new Response(null, { status: 401 }),
        request: new Request("http://localhost"),
        body: "{}",
      })
    );

    await expect(
      callAnalyzeWithFallback(
        { provider: "openrouter", apiKey: "openrouter-key", model: "openrouter/free" },
        "image/png",
        "abc"
      )
    ).rejects.toBeInstanceOf(OpenRouterError);

    expect(mockCallGemini).not.toHaveBeenCalled();
  });
});
