import { describe, it, expect } from "vitest";
import { formatHtml } from "../formatHtml";

describe("formatHtml", () => {
  it("formats minified HTML with indentation", () => {
    const input = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Test</title></head><body><div class="box"><p>Hello</p></div></body></html>';
    const output = formatHtml(input);

    expect(output).toContain("<!DOCTYPE html>");
    expect(output).toContain("<html>");
    expect(output).toContain("  <head>");
    expect(output).toContain("    <meta charset=\"UTF-8\">");
    expect(output).toContain("    <div class=\"box\">");
    expect(output).toContain("      <p>Hello</p>");
  });

  it("returns empty string unchanged", () => {
    expect(formatHtml("")).toBe("");
  });

  it("preserves already formatted HTML", () => {
    const input = "<html>\n  <body>\n    <p>Hi</p>\n  </body>\n</html>";
    expect(formatHtml(input)).toBe(input);
  });

  it("formats the user's minified wireframe example", () => {
    const input =
      '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Wireframe</title></head><body><div class="box"></div></body></html>';
    const output = formatHtml(input);
    expect(output.split("\n").length).toBeGreaterThan(5);
    expect(output).toMatch(/\n<html/);
  });
});
