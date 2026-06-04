import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.OTEL_ENABLED === "true") {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: "visai-frontend" });
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
