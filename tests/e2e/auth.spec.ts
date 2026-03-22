import { expect, test } from "@playwright/test";

test("preserves next across auth screens and exposes Google login", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();

  await page.getByRole("link", { name: /create an account/i }).click();

  await expect(page).toHaveURL(/\/sign-up\?next=%2Fdashboard$/);
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});
