import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/callGemini", () => ({
  callGemini: vi.fn(),
}));

vi.mock("@/lib/callOpenRouter", () => ({
  callOpenRouter: vi.fn(),
}));

import { callGemini } from "@/lib/callGemini";
import { callOpenRouter } from "@/lib/callOpenRouter";
import {
  buildDeepSeekUserPrompt,
  describeImageForTextModel,
  VisionProxyUnavailableError,
} from "@/lib/describeImageForDeepSeek";

const mockCallGemini = vi.mocked(callGemini);
const mockCallOpenRouter = vi.mocked(callOpenRouter);

describe("describeImageForDeepSeek", () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const originalGeminiModel = process.env.GEMINI_MODEL;
  const originalOpenRouterModel = process.env.OPENROUTER_MODEL;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.OPENROUTER_MODEL;
    mockCallGemini.mockResolvedValue("Gemini vision description");
    mockCallOpenRouter.mockResolvedValue("OpenRouter vision description");
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalGeminiKey;
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
    process.env.GEMINI_MODEL = originalGeminiModel;
    process.env.OPENROUTER_MODEL = originalOpenRouterModel;
  });

  it("prefers Gemini when GEMINI_API_KEY is set", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.OPENROUTER_API_KEY = "openrouter-key";

    const result = await describeImageForTextModel("image/png", "base64data");

    expect(result).toBe("Gemini vision description");
    expect(mockCallGemini).toHaveBeenCalledWith(
      "gemini-key",
      expect.any(String),
      "image/png",
      "base64data",
      expect.stringContaining("Describe this UI design screenshot")
    );
    expect(mockCallOpenRouter).not.toHaveBeenCalled();
  });

  it("uses OpenRouter when only OPENROUTER_API_KEY is set", async () => {
    process.env.OPENROUTER_API_KEY = "openrouter-key";

    const result = await describeImageForTextModel("image/jpeg", "jpegdata");

    expect(result).toBe("OpenRouter vision description");
    expect(mockCallOpenRouter).toHaveBeenCalledWith(
      "openrouter-key",
      expect.any(String),
      "image/jpeg",
      "jpegdata",
      expect.stringContaining("Describe this UI design screenshot")
    );
    expect(mockCallGemini).not.toHaveBeenCalled();
  });

  it("throws VisionProxyUnavailableError when no vision keys are configured", async () => {
    await expect(describeImageForTextModel("image/png", "abc")).rejects.toBeInstanceOf(
      VisionProxyUnavailableError
    );
  });

  it("buildDeepSeekUserPrompt includes the image description", () => {
    const prompt = buildDeepSeekUserPrompt("Blue login form with email field");
    expect(prompt).toContain("Blue login form with email field");
    expect(prompt).toContain("Screenshot description");
  });
});
