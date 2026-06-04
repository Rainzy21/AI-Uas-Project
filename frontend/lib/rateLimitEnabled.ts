/** Off in development unless RATE_LIMIT_ENABLED=true; on in production unless RATE_LIMIT_ENABLED=false. */
export function isRateLimitEnabled(): boolean {
  if (process.env.RATE_LIMIT_ENABLED === "true") return true;
  if (process.env.RATE_LIMIT_ENABLED === "false") return false;
  return process.env.NODE_ENV === "production";
}
