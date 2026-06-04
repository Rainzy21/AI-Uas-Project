const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function getTagName(line: string): string | null {
  const match = line.match(/^<\/?([a-zA-Z0-9-]+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

function isClosingTag(line: string): boolean {
  return /^<\//.test(line);
}

function isSelfClosingTag(line: string): boolean {
  return /\/>$/.test(line) || /^<!/.test(line);
}

function isOpeningTag(line: string): boolean {
  return /^<[^/!?]/.test(line) && !isSelfClosingTag(line);
}

function hasInlineCloseTag(line: string): boolean {
  return /<\/[^>]+>\s*$/.test(line);
}

/** Pretty-print minified HTML with 2-space indentation. */
export function formatHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return html;

  const lineCount = trimmed.split("\n").length;
  if (lineCount > 8 && trimmed.includes("\n  ")) {
    return trimmed;
  }

  const normalized = trimmed.replace(/\r\n/g, "\n").replace(/>\s*</g, ">\n<");
  const rawLines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);

  const out: string[] = [];
  let indent = 0;

  for (const line of rawLines) {
    const tag = getTagName(line);
    const closing = isClosingTag(line);
    const selfClosing = isSelfClosingTag(line);
    const voidElement = tag !== null && VOID_ELEMENTS.has(tag);
    const inlineElement = hasInlineCloseTag(line);

    if (closing) {
      indent = Math.max(0, indent - 1);
    }

    out.push(`${"  ".repeat(indent)}${line}`);

    if (isOpeningTag(line) && !voidElement && !selfClosing && !inlineElement) {
      indent += 1;
    }
  }

  return out.join("\n");
}
