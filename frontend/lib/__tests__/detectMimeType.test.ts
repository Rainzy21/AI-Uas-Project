import { describe, it, expect } from "vitest";
import { detectMimeType } from "../detectMimeType";

describe("detectMimeType", () => {
  it("detects PNG", () => {
    const buf = new Uint8Array(12);
    buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectMimeType(buf.buffer)).toBe("image/png");
  });

  it("detects JPEG", () => {
    const buf = new Uint8Array(12);
    buf.set([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectMimeType(buf.buffer)).toBe("image/jpeg");
  });

  it("returns null for unknown bytes", () => {
    const buf = new Uint8Array(12);
    expect(detectMimeType(buf.buffer)).toBeNull();
  });
});
