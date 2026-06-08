import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepSeekError } from "@/lib/callDeepSeek";

vi.mock("@/lib/describeImageForDeepSeek", () => ({
  buildDeepSeekUserPrompt: vi.fn((description: string) => `prompt:${description}`),
  describeImageForTextModel: vi.fn(),
  SYSTEM_PROMPT: "system",
}));

import { describeImageForTextModel } from "@/lib/describeImageForDeepSeek";
import { callDeepSeek } from "@/lib/callDeepSeek";

const mockDescribeImage = vi.mocked(describeImageForTextModel);

describe("callDeepSeek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDescribeImage.mockResolvedValue("A blue login page");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("describes the image then calls DeepSeek chat completions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
          }),
      })
    );

    const result = await callDeepSeek("deepseek-key", "deepseek-chat", "image/png", "abc");

    expect(mockDescribeImage).toHaveBeenCalledWith("image/png", "abc");
    expect(result).toContain('"ok":true');
    expect(fetch).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer deepseek-key",
        }),
      })
    );
  });

  it("throws DeepSeekError when the API rejects the key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: "Unauthorized" } }),
      })
    );

    await expect(
      callDeepSeek("bad-key", "deepseek-chat", "image/png", "abc")
    ).rejects.toBeInstanceOf(DeepSeekError);
  });
});
