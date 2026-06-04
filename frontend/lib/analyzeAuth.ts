/** When ANALYZE_API_SECRET is set, require matching x-visai-key header. */
export function checkAnalyzeAuth(authHeader: string | null): boolean {
  const secret = process.env.ANALYZE_API_SECRET;
  if (!secret) return true;
  return authHeader === secret;
}
