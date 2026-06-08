import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isRateLimitEnabled } from "@/lib/rateLimitEnabled";

describe("isRateLimitEnabled", () => {
  const originalRateLimitEnabled = process.env.RATE_LIMIT_ENABLED;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    delete process.env.RATE_LIMIT_ENABLED;
  });

  afterEach(() => {
    if (originalRateLimitEnabled !== undefined) {
      process.env.RATE_LIMIT_ENABLED = originalRateLimitEnabled;
    } else {
      delete process.env.RATE_LIMIT_ENABLED;
    }
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("returns true when RATE_LIMIT_ENABLED=true", () => {
    process.env.RATE_LIMIT_ENABLED = "true";
    process.env.NODE_ENV = "development";
    expect(isRateLimitEnabled()).toBe(true);
  });

  it("returns false when RATE_LIMIT_ENABLED=false", () => {
    process.env.RATE_LIMIT_ENABLED = "false";
    process.env.NODE_ENV = "production";
    expect(isRateLimitEnabled()).toBe(false);
  });

  it("defaults to false when unset (opt-in only)", () => {
    process.env.NODE_ENV = "production";
    expect(isRateLimitEnabled()).toBe(false);
    process.env.NODE_ENV = "development";
    expect(isRateLimitEnabled()).toBe(false);
  });
});
