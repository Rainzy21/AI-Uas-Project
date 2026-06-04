const DEFAULT_SERVER_MS = process.env.NODE_ENV === "development" ? 90_000 : 30_000;
const DEFAULT_CLIENT_MS = process.env.NODE_ENV === "development" ? 120_000 : 40_000;

export const OPENROUTER_TIMEOUT_MS = Number(
  process.env.OPENROUTER_TIMEOUT_MS ?? DEFAULT_SERVER_MS
);

/** Client fetch timeout; should exceed OPENROUTER_TIMEOUT_MS plus retry headroom. */
export const CLIENT_ANALYZE_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_ANALYZE_TIMEOUT_MS ?? DEFAULT_CLIENT_MS
);
