import { expect, test } from "@playwright/test";

test("renders the progress dashboard", async ({ page }) => {
  await page.goto("/progress");

  await expect(page).toHaveURL(/\/sign-in\?next=%2Fprogress$/);
  await expect(
    page.getByRole("heading", {
      name: /sign in to a workspace that keeps your interview prep tied to real evidence/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
