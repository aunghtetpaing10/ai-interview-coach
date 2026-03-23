import { expect, test } from "@playwright/test";

test("renders the sign-in UI controls", async ({ page }) => {
  await page.goto("/sign-in");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", {
      name: /sign in to a workspace that keeps your interview prep tied to real evidence/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /create an account/i })).toBeVisible();
});
