/** Free OpenRouter models often need 60–90s; client timeout includes retry headroom. */
const DEFAULT_SERVER_MS = 90_000;
const DEFAULT_CLIENT_MS = 120_000;

export const OPENROUTER_TIMEOUT_MS = Number(
  process.env.OPENROUTER_TIMEOUT_MS ?? DEFAULT_SERVER_MS
);

/** Client fetch timeout; should exceed OPENROUTER_TIMEOUT_MS plus retry headroom. */
export const CLIENT_ANALYZE_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_ANALYZE_TIMEOUT_MS ?? DEFAULT_CLIENT_MS
);
