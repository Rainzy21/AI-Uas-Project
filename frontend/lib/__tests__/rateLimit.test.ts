import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, _resetMemoryRateLimitForTests } from "../rateLimit";

describe("checkRateLimit (in-memory)", () => {
  beforeEach(() => {
    _resetMemoryRateLimitForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.RATE_LIMIT_REQUESTS = "3";
    process.env.RATE_LIMIT_WINDOW_SEC = "60";
  });

  it("allows requests under the limit", async () => {
    expect((await checkRateLimit("1.2.3.4")).success).toBe(true);
    expect((await checkRateLimit("1.2.3.4")).success).toBe(true);
    expect((await checkRateLimit("1.2.3.4")).success).toBe(true);
  });

  it("blocks requests over the limit", async () => {
    await checkRateLimit("9.9.9.9");
    await checkRateLimit("9.9.9.9");
    await checkRateLimit("9.9.9.9");
    const fourth = await checkRateLimit("9.9.9.9");
    expect(fourth.success).toBe(false);
    expect(fourth.retryAfter).toBeGreaterThan(0);
  });

  it("tracks IPs independently", async () => {
    process.env.RATE_LIMIT_REQUESTS = "1";
    expect((await checkRateLimit("a")).success).toBe(true);
    expect((await checkRateLimit("a")).success).toBe(false);
    expect((await checkRateLimit("b")).success).toBe(true);
  });
});
