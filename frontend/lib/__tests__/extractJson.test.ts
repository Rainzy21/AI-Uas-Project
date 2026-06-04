import { describe, it, expect } from "vitest";
import { extractJson } from "../extractJson";

describe("extractJson", () => {
  it("strips json code fences", () => {
    const input = '```json\n{"a":1}\n```';
    expect(extractJson(input)).toBe('{"a":1}');
  });

  it("extracts object from surrounding text", () => {
    const input = 'prefix {"a":1} suffix';
    expect(extractJson(input)).toBe('{"a":1}');
  });
});
