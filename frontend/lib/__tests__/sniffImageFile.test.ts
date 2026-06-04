import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { validateImageFileClient } from "../sniffImageFile";
import { MAX_SIZE, MAX_SIZE_LABEL } from "../imageConstants";
import { parseVisAIResult } from "../analyzeSchema";

describe("validateImageFileClient", () => {
  it("parses E2E mock result JSON", () => {
    const mock = {
      analysis: {
        title: "E2E Test Dashboard",
        layout: "x",
        components: [{ name: "A", description: "b", position: "c" }],
        colorPalette: ["#000"],
        typography: { headings: "a", body: "b", style: "c" },
        style: "minimal",
      },
      html: "<html><body></body></html>",
      timestamp: 1,
    };
    expect(parseVisAIResult(JSON.parse(JSON.stringify(mock)))).not.toBeNull();
  });

  it("accepts the e2e tiny.png fixture", async () => {
    const buffer = readFileSync(join(process.cwd(), "e2e/fixtures/tiny.png"));
    const file = new File([buffer], "tiny.png", { type: "image/png" });
    const err = await validateImageFileClient(file, MAX_SIZE, MAX_SIZE_LABEL);
    expect(err).toBeNull();
  });
});
