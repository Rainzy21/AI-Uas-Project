import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../sanitizeHtml";

describe("sanitizeHtml", () => {
  it("removes script tags", () => {
    const html = "<html><body><script>alert(1)</script><p>ok</p></body></html>";
    const clean = sanitizeHtml(html);
    expect(clean).not.toMatch(/<script/i);
    expect(clean).toContain("ok");
  });

  it("removes inline event handlers", () => {
    const html = '<div onclick="alert(1)" class="x">hi</div>';
    const clean = sanitizeHtml(html);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).toContain('class="x"');
  });

  it("removes iframe tags", () => {
    const html = '<html><body><iframe src="https://evil.test"></iframe></body></html>';
    const clean = sanitizeHtml(html);
    expect(clean).not.toMatch(/<iframe/i);
  });

  it("keeps safe layout markup", () => {
    const html = '<div class="flex p-4"><h1>Title</h1></div>';
    expect(sanitizeHtml(html)).toContain("flex");
    expect(sanitizeHtml(html)).toContain("Title");
  });
});
