/** Strip markdown fences and extract a JSON object substring when needed. */
export function extractJson(raw: string): string {
  const clean = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (clean.startsWith("{")) return clean;
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) return clean.slice(start, end + 1);
  return clean;
}
