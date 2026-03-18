import { expect, test } from "@playwright/test";

test("renders the progress dashboard", async ({ page }) => {
  await page.goto("/progress");

  await expect(
    page.getByRole("heading", { name: /the interview loop is trending upward/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /score trajectory over time/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /recent interview sessions/i }),
  ).toBeVisible();
});
