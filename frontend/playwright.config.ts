import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3456",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command:
          "npm run build && npm run start -- --hostname 127.0.0.1 --port 3456",
        url: "http://127.0.0.1:3456",
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          NODE_ENV: "production",
          RATE_LIMIT_ENABLED: "true",
          RATE_LIMIT_REQUESTS: "2",
          RATE_LIMIT_WINDOW_SEC: "60",
          NEXT_PUBLIC_E2E_TEST: "1",
        },
      },
});
