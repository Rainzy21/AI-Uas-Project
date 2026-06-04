import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { OpenRouterError, RequestTimeoutError } from "@openrouter/sdk/models/errors";
import { MAX_SIZE } from "@/lib/imageConstants";

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock("@openrouter/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@openrouter/sdk")>();
  return {
    ...actual,
    OpenRouter: class {
      chat = { send: mockSend };
    },
  };
});

const { POST } = await import("../route");

function pngBytes(size = 100): Uint8Array {
  const buf = new Uint8Array(size);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buf;
}

function jpegBytes(size = 100): Uint8Array {
  const buf = new Uint8Array(size);
  buf.set([0xff, 0xd8, 0xff, 0xe0]);
  return buf;
}

function webpBytes(size = 100): Uint8Array {
  const buf = new Uint8Array(size);
  buf.set([0x52, 0x49, 0x46, 0x46], 0);
  buf.set([0x57, 0x45, 0x42, 0x50], 8);
  return buf;
}

function unknownBytes(): Uint8Array {
  return new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
}

function makeRequest(formData: FormData, headers?: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/analyze", {
    method: "POST",
    body: formData,
    headers,
  });
}

function makeImageFile(bytes: Uint8Array, mimeType: string, name = "test.png"): File {
  return new File([bytes], name, { type: mimeType });
}

const VALID_RESULT = {
  analysis: {
    title: "Test Page",
    layout: "single column",
    components: [{ name: "Header", description: "top bar", position: "top" }],
    colorPalette: ["#ffffff"],
    typography: { headings: "sans-serif", body: "serif", style: "clean" },
    style: "minimal",
  },
  html: "<html><body>hello</body></html>",
};

async function* mockStream(content: string) {
  yield { choices: [{ delta: { content } }] };
}

function mockOpenRouterResponse(content: string) {
  mockSend.mockResolvedValueOnce(mockStream(content));
}

describe("POST /api/analyze", () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  const originalSecret = process.env.ANALYZE_API_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "test-key";
    delete process.env.ANALYZE_API_SECRET;
  });

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalApiKey;
    if (originalSecret !== undefined) {
      process.env.ANALYZE_API_SECRET = originalSecret;
    } else {
      delete process.env.ANALYZE_API_SECRET;
    }
  });

  it("returns 400 when no image is provided", async () => {
    const fd = new FormData();
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no image/i);
  });

  it("returns 401 when ANALYZE_API_SECRET is set and header is missing", async () => {
    process.env.ANALYZE_API_SECRET = "secret123";
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(401);
  });

  it("returns 401 when ANALYZE_API_SECRET does not match", async () => {
    process.env.ANALYZE_API_SECRET = "secret123";
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd, { "x-visai-key": "wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid MIME type (client-supplied)", async () => {
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "text/plain", "test.txt"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid file type/i);
  });

  it("returns 400 when the file is too large", async () => {
    const bigFile = new File([new Uint8Array(MAX_SIZE + 1)], "big.png", { type: "image/png" });
    const fd = new FormData();
    fd.append("image", bigFile);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/too large/i);
  });

  it("returns 400 when magic bytes don't match declared MIME type", async () => {
    const fd = new FormData();
    fd.append("image", makeImageFile(unknownBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/file content/i);
  });

  it("returns 400 when declared MIME does not match magic bytes", async () => {
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/jpeg"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/does not match file content/i);
  });

  it("returns 500 when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/api key/i);
    expect(body.requestId).toBeDefined();
  });

  it("returns 502 with a clear message when OpenRouter rejects the API key", async () => {
    mockSend.mockRejectedValueOnce(
      new OpenRouterError("Unauthorized", {
        response: new Response(null, { status: 401 }),
        request: new Request("http://localhost"),
        body: JSON.stringify({ error: { message: "User not found.", code: 401 } }),
      })
    );
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/invalid openrouter api key/i);
  });

  it("returns 502 when OpenRouter returns malformed JSON", async () => {
    mockOpenRouterResponse("not valid json at all {{");
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/parse/i);
  });

  it("returns 502 when OpenRouter returns JSON with wrong schema", async () => {
    mockOpenRouterResponse(JSON.stringify({ unexpected: "shape" }));
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/unexpected response shape/i);
  });

  it("returns 502 when components array has invalid items", async () => {
    mockOpenRouterResponse(
      JSON.stringify({
        analysis: {
          ...VALID_RESULT.analysis,
          components: [{ name: 123 }],
        },
        html: VALID_RESULT.html,
      })
    );
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(502);
  });

  it("returns 504 when OpenRouter call times out", async () => {
    mockSend.mockRejectedValueOnce(new RequestTimeoutError("Request timed out"));
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error).toMatch(/timed out/i);
  });

  it("retries on OpenRouter 429 then succeeds", async () => {
    mockSend
      .mockRejectedValueOnce(
        new OpenRouterError("Rate limited", {
          response: new Response(null, { status: 429 }),
          request: new Request("http://localhost"),
          body: "{}",
        })
      )
      .mockResolvedValueOnce(mockStream(JSON.stringify(VALID_RESULT)));

    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("returns 200 with analysis and html on success (PNG)", async () => {
    mockOpenRouterResponse(JSON.stringify(VALID_RESULT));
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis.title).toBe("Test Page");
    expect(body.html).toContain("<html>");
    expect(typeof body.timestamp).toBe("number");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        chatRequest: expect.objectContaining({
          model: "moonshotai/kimi-k2.6:free",
          stream: true,
          maxTokens: 12_000,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
          ]),
        }),
      }),
      expect.objectContaining({ timeoutMs: 30_000 })
    );
  });

  it("returns 200 on success (JPEG)", async () => {
    mockOpenRouterResponse(JSON.stringify(VALID_RESULT));
    const fd = new FormData();
    fd.append("image", makeImageFile(jpegBytes(), "image/jpeg", "photo.jpg"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
  });

  it("returns 200 on success (WebP)", async () => {
    mockOpenRouterResponse(JSON.stringify(VALID_RESULT));
    const fd = new FormData();
    fd.append("image", makeImageFile(webpBytes(), "image/webp", "design.webp"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
  });

  it("strips markdown code fences from model response", async () => {
    mockOpenRouterResponse("```json\n" + JSON.stringify(VALID_RESULT) + "\n```");
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
  });

  it("extracts JSON wrapped in extra text", async () => {
    mockOpenRouterResponse("Here is the result:\n" + JSON.stringify(VALID_RESULT) + "\nDone.");
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
  });

  it("strips malicious scripts and injects Tailwind for preview", async () => {
    mockOpenRouterResponse(
      JSON.stringify({
        ...VALID_RESULT,
        html: "<html><body><script>alert(1)</script><p class=\"p-4\">ok</p></body></html>",
      })
    );
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.html).not.toContain("alert(1)");
    expect(body.html).toMatch(/cdn\.tailwindcss\.com/);
    expect(body.html).toContain("ok");
  });

  it("removes onclick handlers from returned html", async () => {
    mockOpenRouterResponse(
      JSON.stringify({
        ...VALID_RESULT,
        html: '<html><body><div onclick="alert(1)">safe</div></body></html>',
      })
    );
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.html).not.toMatch(/onclick/i);
    expect(body.html).toContain("safe");
  });
});
