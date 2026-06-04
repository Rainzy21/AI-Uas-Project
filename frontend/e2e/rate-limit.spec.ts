import { test, expect } from "@playwright/test";

/** Dedicated IP so parallel e2e tests do not share the in-memory rate-limit bucket. */
const RATE_LIMIT_TEST_IP = "203.0.113.99";

test("returns 429 when rate limit is exceeded", async ({ request }) => {
  test.setTimeout(15_000);

  const headers: Record<string, string> = {
    "x-forwarded-for": RATE_LIMIT_TEST_IP,
  };
  const secret = process.env.ANALYZE_API_SECRET;
  if (secret) headers["x-visai-key"] = secret;

  let saw429 = false;
  for (let i = 0; i < 4; i++) {
    const res = await request.post("/api/analyze", {
      headers,
      multipart: {},
      timeout: 5_000,
    });

    if (res.status() === 429) {
      saw429 = true;
      const body = await res.json();
      expect(body.error).toMatch(/terlalu banyak/i);
      break;
    }

    // Allowed through proxy but rejected by route without calling OpenRouter
    expect(res.status()).toBe(400);
  }

  expect(saw429).toBe(true);
});
