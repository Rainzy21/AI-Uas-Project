import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isRateLimitEnabled } from "@/lib/rateLimitEnabled";

export async function proxy(request: NextRequest) {
  if (!isRateLimitEnabled()) {
    return NextResponse.next();
  }

  const ip = getClientIp(request.headers);
  const result = await checkRateLimit(ip);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Terlalu banyak permintaan. Coba lagi nanti.",
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: result.retryAfter
          ? { "Retry-After": String(result.retryAfter) }
          : undefined,
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/analyze",
};
