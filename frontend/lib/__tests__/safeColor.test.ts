import { describe, it, expect } from "vitest";
import { safeColor } from "../safeColor";

describe("safeColor", () => {
  it("accepts valid hex colors", () => {
    expect(safeColor("#fff")).toBe("#fff");
    expect(safeColor("#AABBCC")).toBe("#AABBCC");
  });

  it("rejects unsafe values", () => {
    expect(safeColor("red; position:fixed")).toBe("transparent");
  });
});
