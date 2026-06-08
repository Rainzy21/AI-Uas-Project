/** Free Kimi — multimodal (vision), good for screenshot → HTML. */
export const KIMI_FREE_MODEL = "moonshotai/kimi-k2.6:free";

/** OpenRouter auto-picks another free vision model when Kimi is busy. */
export const OPENROUTER_FREE_ROUTER = "openrouter/free";

export function resolveOpenRouterModelChain(preferredModel?: string): string[] {
  const preferred = preferredModel?.trim() || KIMI_FREE_MODEL;
  const chain = [preferred, KIMI_FREE_MODEL, OPENROUTER_FREE_ROUTER];
  return [...new Set(chain)];
}
