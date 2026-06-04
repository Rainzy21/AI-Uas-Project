import * as Sentry from "@sentry/nextjs";

export function captureRouteError(
  error: unknown,
  context: Record<string, unknown>
): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context)) {
      scope.setExtra(key, value);
    }
    Sentry.captureException(error);
  });
}
