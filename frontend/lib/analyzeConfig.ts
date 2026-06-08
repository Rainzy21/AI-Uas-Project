export type AnalyzeProvider = "deepseek" | "gemini" | "openrouter";

export const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const DEFAULT_OPENROUTER_MODEL = "moonshotai/kimi-k2.6:free";

export type AnalyzeRuntimeConfig =
  | {
      provider: "deepseek";
      apiKey: string;
      model: string;
    }
  | {
      provider: "gemini";
      apiKey: string;
      model: string;
    }
  | {
      provider: "openrouter";
      apiKey: string;
      model: string;
    };

const PROVIDERS: AnalyzeProvider[] = ["deepseek", "gemini", "openrouter"];

function parseProvider(value: string | undefined): AnalyzeProvider | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return PROVIDERS.includes(normalized as AnalyzeProvider)
    ? (normalized as AnalyzeProvider)
    : null;
}

export function resolveAnalyzeConfig(): AnalyzeRuntimeConfig | { error: string } {
  const providerEnv = parseProvider(process.env.ANALYZE_PROVIDER);
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

  let provider: AnalyzeProvider;
  if (providerEnv) {
    provider = providerEnv;
  } else if (deepseekKey) {
    provider = "deepseek";
  } else if (geminiKey) {
    provider = "gemini";
  } else {
    provider = "openrouter";
  }

  if (provider === "deepseek") {
    if (!deepseekKey) {
      return {
        error:
          "DEEPSEEK_API_KEY is not set. Get a key at https://platform.deepseek.com/api_keys",
      };
    }
    return {
      provider: "deepseek",
      apiKey: deepseekKey,
      model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL,
    };
  }

  if (provider === "gemini") {
    if (!geminiKey) {
      return {
        error:
          "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey",
      };
    }
    return {
      provider: "gemini",
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    };
  }

  if (!openrouterKey) {
    return {
      error:
        "OPENROUTER_API_KEY is not set. Or set DEEPSEEK_API_KEY / GEMINI_API_KEY instead.",
    };
  }

  return {
    provider: "openrouter",
    apiKey: openrouterKey,
    model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
  };
}
