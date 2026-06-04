const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function safeColor(color: string): string {
  const trimmed = color.trim();
  return HEX_COLOR.test(trimmed) ? trimmed : "transparent";
}
