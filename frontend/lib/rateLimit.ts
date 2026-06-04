import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  success: boolean;
  retryAfter?: number;
};

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_SEC = 60;

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();

let upstashLimiter: Ratelimit | null | undefined;

function getUpstashLimiter(): Ratelimit | null {
  if (upstashLimiter !== undefined) return upstashLimiter;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    upstashLimiter = null;
    return null;
  }
  const requests = Number(process.env.RATE_LIMIT_REQUESTS ?? DEFAULT_LIMIT);
  const windowSec = Number(process.env.RATE_LIMIT_WINDOW_SEC ?? DEFAULT_WINDOW_SEC);
  upstashLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, `${windowSec} s`),
    prefix: "visai:analyze",
  });
  return upstashLimiter;
}

function checkRateLimitMemory(ip: string): RateLimitResult {
  const limit = Number(process.env.RATE_LIMIT_REQUESTS ?? DEFAULT_LIMIT);
  const windowMs =
    Number(process.env.RATE_LIMIT_WINDOW_SEC ?? DEFAULT_WINDOW_SEC) * 1000;
  const now = Date.now();
  let bucket = memoryBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      success: false,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { success: true };
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip") ?? "127.0.0.1";
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter();
  if (upstash) {
    const { success, reset } = await upstash.limit(ip);
    if (success) return { success: true };
    return {
      success: false,
      retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  }
  return checkRateLimitMemory(ip);
}

/** @internal Reset in-memory buckets (tests only). */
export function _resetMemoryRateLimitForTests() {
  memoryBuckets.clear();
  upstashLimiter = undefined;
}
