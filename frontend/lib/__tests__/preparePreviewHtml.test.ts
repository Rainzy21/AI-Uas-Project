import { describe, it, expect } from "vitest";
import { preparePreviewHtml } from "../preparePreviewHtml";

const SAMPLE_ANALYSIS = {
  title: "Dashboard",
  layout: "grid",
  components: [],
  colorPalette: ["#111111", "#ffffff"],
  typography: { headings: "Inter", body: "Inter", style: "sans" },
  style: "minimal",
};

describe("preparePreviewHtml", () => {
  it("wraps fragments and injects Tailwind CDN", () => {
    const html = '<div class="flex min-h-screen bg-[#111] p-4"><h1 class="text-white">Hi</h1></div>';
    const out = preparePreviewHtml(html, SAMPLE_ANALYSIS);
    expect(out).toMatch(/cdn\.tailwindcss\.com/);
    expect(out).toMatch(/<body>/i);
    expect(out).toContain("Hi");
  });

  it("removes malicious scripts but keeps Tailwind injection", () => {
    const html = "<html><body><script>alert(1)</script><p class=\"p-4\">ok</p></body></html>";
    const out = preparePreviewHtml(html);
    expect(out).not.toContain("alert(1)");
    expect(out).toMatch(/cdn\.tailwindcss\.com/);
    expect(out).toContain("ok");
  });

  it("adds Inter font link when typography mentions Inter", () => {
    const out = preparePreviewHtml("<div class=\"p-2\">x</div>", SAMPLE_ANALYSIS);
    expect(out).toMatch(/fonts\.googleapis\.com/);
    expect(out).toMatch(/Inter/);
  });
});
