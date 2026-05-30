import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";
import { ALLOWED_TYPES, MAX_SIZE } from "@/lib/imageConstants";

const GEMINI_TIMEOUT_MS = 30_000;

const PROMPT = `Analyze this UI design image and return a single JSON object with exactly two keys:
{
  "analysis": {
    "title": "page/component name",
    "layout": "description of overall layout",
    "components": [{ "name": "", "description": "", "position": "" }],
    "colorPalette": ["#hex"],
    "typography": { "headings": "", "body": "", "style": "" },
    "style": "description of design style (minimal, glassmorphism, material, etc)"
  },
  "html": "complete standalone HTML file string with Tailwind CSS CDN included that reproduces this design as accurately as possible"
}
Return only valid JSON. No markdown, no code fences, no explanation outside the JSON.`;

/** Detect actual image type from magic bytes — rejects attacker-supplied MIME. */
function detectMimeType(buffer: ArrayBuffer): string | null {
  if (buffer.byteLength < 12) return null;
  const b = new Uint8Array(buffer, 0, 12);
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  // WebP: RIFF????WEBP
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "image/webp";
  return null;
}

interface AnalysisShape {
  title: string;
  layout: string;
  components: { name: string; description: string; position: string }[];
  colorPalette: string[];
  typography: { headings: string; body: string; style: string };
  style: string;
}

/** Validate that the parsed JSON from Gemini has the expected shape. */
function validateResult(obj: unknown): obj is { analysis: AnalysisShape; html: string } {
  if (typeof obj !== "object" || obj === null) return false;
  const r = obj as Record<string, unknown>;
  if (typeof r.html !== "string") return false;
  const a = r.analysis as Record<string, unknown> | undefined;
  if (typeof a !== "object" || a === null) return false;
  return (
    typeof a.title === "string" &&
    typeof a.layout === "string" &&
    Array.isArray(a.components) &&
    Array.isArray(a.colorPalette) &&
    typeof a.typography === "object" && a.typography !== null &&
    typeof a.style === "string"
  );
}

export async function POST(req: NextRequest) {
  try {
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
        { error: "File too large. Maximum size is 20 MB." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[/api/analyze] GEMINI_API_KEY is not set");
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();

    // S3: Verify actual image bytes match an allowed type (magic bytes check).
    const detectedMime = detectMimeType(buffer);
    if (!detectedMime || !(ALLOWED_TYPES as readonly string[]).includes(detectedMime)) {
      return Response.json(
        { error: "File content does not match an allowed image type." },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(buffer).toString("base64");

    const ai = new GoogleGenAI({ apiKey });

    // S4: Race the Gemini call against a timeout to prevent indefinite hangs.
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), GEMINI_TIMEOUT_MS)
    );

    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: base64,
                },
              },
            ],
          },
        ],
        // Doc2: Set low temperature for consistent, structured output.
        config: {
          temperature: 0.2,
        },
      }),
      timeoutPromise,
    ]);

    const rawText = response.text ?? "";
    const clean = rawText.replace(/```json\s*|```/g, "").trim();

    let result: unknown;
    try {
      result = JSON.parse(clean);
    } catch {
      console.error("[/api/analyze] Failed to parse Gemini response as JSON:", rawText.slice(0, 200));
      return Response.json({ error: "Failed to parse Gemini response as JSON" }, { status: 502 });
    }

    // S2: Validate the parsed object matches the expected schema.
    if (!validateResult(result)) {
      console.error("[/api/analyze] Gemini response did not match expected schema:", JSON.stringify(result).slice(0, 200));
      return Response.json({ error: "Gemini returned an unexpected response shape" }, { status: 502 });
    }

    return Response.json({
      analysis: result.analysis,
      html: result.html,
      timestamp: Date.now(),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "TIMEOUT") {
      console.error("[/api/analyze] Gemini request timed out");
      return Response.json({ error: "Request timed out. Please try again." }, { status: 504 });
    }
    console.error("[/api/analyze] Unexpected error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
