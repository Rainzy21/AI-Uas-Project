import { test, expect } from "@playwright/test";
import path from "path";
import { readFileSync } from "fs";

const MOCK_RESULT = {
  analysis: {
    title: "E2E Test Dashboard",
    layout: "Two column grid",
    components: [
      { name: "Sidebar", description: "Navigation", position: "left" },
    ],
    colorPalette: ["#111111", "#ffffff"],
    typography: { headings: "Inter", body: "Inter", style: "Modern" },
    style: "minimal",
  },
  html: "<html><body><h1>E2E Preview</h1></body></html>",
  timestamp: Date.now(),
};

async function selectFileOnUploadPage(
  page: import("@playwright/test").Page,
  buffer: Buffer
) {
  const bytes = Array.from(buffer);
  await page.evaluate((fileBytes) => {
    const file = new File([new Uint8Array(fileBytes)], "tiny.png", {
      type: "image/png",
    });
    const hook = (
      window as Window & { __visaiE2ESelectFile?: (f: File) => void }
    ).__visaiE2ESelectFile;
    if (!hook) throw new Error("E2E file hook not available");
    hook(file);
  }, bytes);
}

test.describe("Upload to hasil flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/analyze", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_RESULT),
      });
    });
  });

  test("uploads image and shows analysis on /hasil", async ({ page }) => {
    const buffer = readFileSync(path.join(__dirname, "fixtures", "tiny.png"));

    await page.goto("/upload");
    await expect(page.getByRole("heading", { name: "Upload Gambar" })).toBeVisible();

    await selectFileOnUploadPage(page, buffer);
    await expect(page.getByRole("button", { name: "Proses Gambar" })).toBeVisible();

    await page.getByRole("button", { name: "Proses Gambar" }).click();
    await page.waitForURL("**/hasil");

    await expect(page.getByText("E2E Test Dashboard")).toBeVisible();
    await expect(page.getByText("Sidebar")).toBeVisible();
    await expect(page.getByText("Components")).toBeVisible();
  });
});

test.describe("Hasil page", () => {
  test("renders stored analysis from localStorage", async ({ page }) => {
    await page.goto("/upload");
    await page.evaluate((json) => {
      localStorage.setItem("visai_result", json);
    }, JSON.stringify(MOCK_RESULT));
    await page.goto("/hasil");

    await expect(page.getByText("E2E Test Dashboard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Sidebar")).toBeVisible();
  });
});
