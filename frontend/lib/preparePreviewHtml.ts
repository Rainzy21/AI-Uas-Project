import type { Analysis } from "@/lib/analyzeSchema";
import { safeColor } from "@/lib/safeColor";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

const TAILWIND_CDN = "https://cdn.tailwindcss.com";

const FONT_SNIPPETS: { pattern: RegExp; href: string }[] = [
  {
    pattern: /\binter\b/i,
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  {
    pattern: /\broboto\b/i,
    href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  },
  {
    pattern: /\bpoppins\b/i,
    href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  },
];

function pickFontLink(analysis?: Analysis): string {
  const text = [
    analysis?.typography.headings,
    analysis?.typography.body,
    analysis?.typography.style,
  ].join(" ");
  const match = FONT_SNIPPETS.find((f) => f.pattern.test(text));
  if (!match) return "";
  return `<link rel="stylesheet" href="${match.href}" />`;
}

function buildBaseStyle(analysis?: Analysis): string {
  const colors =
    analysis?.colorPalette
      .map(safeColor)
      .filter((c) => c !== "transparent")
      .slice(0, 8) ?? [];
  const vars =
    colors.length > 0
      ? `:root{${colors.map((c, i) => `--visai-${i}:${c}`).join(";")}}`
      : "";
  const font = analysis?.typography.body?.match(/inter/i)
    ? "font-family:Inter,system-ui,sans-serif;"
    : "";
  return `<style>html,body{margin:0;min-height:100%;${font}}${vars}</style>`;
}

function buildHeadInjection(analysis?: Analysis): string {
  return [
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<script src="${TAILWIND_CDN}"></script>`,
    pickFontLink(analysis),
    buildBaseStyle(analysis),
  ].join("");
}

function injectHead(doc: string, injection: string): string {
  if (/<head[\s>]/i.test(doc)) {
    return doc.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
  }
  return doc.replace(/<html([^>]*)>/i, `<html$1><head>${injection}</head>`);
}

/** Sanitize model HTML, wrap fragments, and inject trusted Tailwind CDN for preview. */
export function preparePreviewHtml(html: string, analysis?: Analysis): string {
  const sanitized = sanitizeHtml(html.trim());
  const injection = buildHeadInjection(analysis);

  if (/<html[\s>]/i.test(sanitized)) {
    if (/cdn\.tailwindcss\.com/i.test(sanitized)) {
      return injectHead(sanitized, pickFontLink(analysis) + buildBaseStyle(analysis));
    }
    return injectHead(sanitized, injection);
  }

  return `<!DOCTYPE html><html lang="en"><head>${injection}</head><body>${sanitized}</body></html>`;
}
