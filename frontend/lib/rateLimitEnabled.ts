/** Opt-in only — set RATE_LIMIT_ENABLED=true when you want per-IP limits on /api/analyze. */
export function isRateLimitEnabled(): boolean {
  return process.env.RATE_LIMIT_ENABLED === "true";
}
