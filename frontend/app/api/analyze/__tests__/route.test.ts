import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock @google/genai ---
// Use vi.hoisted so the mock is available before vi.mock() runs (which is hoisted to the top).
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

// Import after mocks are set up
const { POST } = await import("../route");

// --- Helpers ---

/** Build a valid 12-byte PNG magic-byte prefix. */
function pngBytes(size = 100): Uint8Array {
  const buf = new Uint8Array(size);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buf;
}

/** Build a valid 12-byte JPEG magic-byte prefix. */
function jpegBytes(size = 100): Uint8Array {
  const buf = new Uint8Array(size);
  buf.set([0xff, 0xd8, 0xff, 0xe0]);
  return buf;
}

/** Build a valid WebP magic-byte buffer. */
function webpBytes(size = 100): Uint8Array {
  const buf = new Uint8Array(size);
  // RIFF
  buf.set([0x52, 0x49, 0x46, 0x46], 0);
  // WEBP at offset 8
  buf.set([0x57, 0x45, 0x42, 0x50], 8);
  return buf;
}

/** Unknown / garbage bytes. */
function unknownBytes(): Uint8Array {
  return new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
}

function makeRequest(formData: FormData): NextRequest {
  return new NextRequest("http://localhost/api/analyze", {
    method: "POST",
    body: formData,
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

// --- Tests ---

describe("POST /api/analyze", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
  });

  it("returns 400 when no image is provided", async () => {
    const fd = new FormData();
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no image/i);
  });

  it("returns 400 for an invalid MIME type (client-supplied)", async () => {
    const fd = new FormData();
    // Magic bytes are PNG but client says text/plain — magic bytes check should catch it first
    // Actually: MIME check runs before magic bytes, so this tests the declared-type path.
    fd.append("image", makeImageFile(pngBytes(), "text/plain", "test.txt"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid file type/i);
  });

  it("returns 400 when the file is too large", async () => {
    const bigFile = new File([new Uint8Array(21 * 1024 * 1024)], "big.png", { type: "image/png" });
    const fd = new FormData();
    fd.append("image", bigFile);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/too large/i);
  });

  it("returns 400 when magic bytes don't match declared MIME type", async () => {
    const fd = new FormData();
    // File claims to be PNG but bytes are garbage
    fd.append("image", makeImageFile(unknownBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/file content/i);
  });

  it("returns 500 when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/api key/i);
  });

  it("returns 502 when Gemini returns malformed JSON", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "not valid json at all {{" });
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/parse/i);
  });

  it("returns 502 when Gemini returns JSON with wrong schema", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ unexpected: "shape" }),
    });
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/unexpected response shape/i);
  });

  it("returns 504 when Gemini call hangs past the timeout", async () => {
    // Simulate a timeout by having the mock reject with the sentinel error message
    // that the route's timeout Promise.race uses internally.
    mockGenerateContent.mockRejectedValueOnce(new Error("TIMEOUT"));
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error).toMatch(/timed out/i);
  });

  it("returns 200 with analysis and html on success (PNG)", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(VALID_RESULT) });
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis.title).toBe("Test Page");
    expect(body.html).toContain("<html>");
    expect(typeof body.timestamp).toBe("number");
  });

  it("returns 200 on success (JPEG)", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(VALID_RESULT) });
    const fd = new FormData();
    fd.append("image", makeImageFile(jpegBytes(), "image/jpeg", "photo.jpg"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
  });

  it("returns 200 on success (WebP)", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(VALID_RESULT) });
    const fd = new FormData();
    fd.append("image", makeImageFile(webpBytes(), "image/webp", "design.webp"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
  });

  it("strips markdown code fences from Gemini response", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "```json\n" + JSON.stringify(VALID_RESULT) + "\n```",
    });
    const fd = new FormData();
    fd.append("image", makeImageFile(pngBytes(), "image/png"));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
  });
});
