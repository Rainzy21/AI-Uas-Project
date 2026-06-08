import { SYSTEM_PROMPT, ANALYZE_PROMPT } from "@/lib/analyzePrompts";
import { OPENROUTER_TIMEOUT_MS } from "@/lib/analyzeTimeouts";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
} from "@/lib/analyzeConfig";
import { callGemini } from "@/lib/callGemini";
import { callOpenRouter } from "@/lib/callOpenRouter";

const VISION_DESCRIBE_PROMPT = `Describe this UI design screenshot in exhaustive detail for a developer who will recreate it in HTML.
Include: page title, layout structure, every visible component, exact colors (hex if possible), typography, spacing, borders, shadows, icons, and all readable text.
Do not write code. Plain text only.`;

export class VisionProxyUnavailableError extends Error {
  constructor() {
    super(
      "DeepSeek API is text-only. Set GEMINI_API_KEY or OPENROUTER_API_KEY so the app can read the image first."
    );
    this.name = "VisionProxyUnavailableError";
  }
}

export async function describeImageForTextModel(
  mimeType: string,
  base64: string
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

  if (geminiKey) {
    return callGemini(
      geminiKey,
      process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
      mimeType,
      base64,
      VISION_DESCRIBE_PROMPT
    );
  }

  if (openrouterKey) {
    return callOpenRouter(
      openrouterKey,
      process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
      mimeType,
      base64,
      VISION_DESCRIBE_PROMPT
    );
  }

  throw new VisionProxyUnavailableError();
}

export function buildDeepSeekUserPrompt(imageDescription: string): string {
  return `${ANALYZE_PROMPT}

Screenshot description (from vision step):
${imageDescription}`;
}

export { SYSTEM_PROMPT };
