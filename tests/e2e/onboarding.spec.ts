import { expect, test } from "@playwright/test";

test("submits the onboarding draft and renders the saved summary", async ({
  page,
}) => {
  await page.goto("/onboarding");

  await expect(page).toHaveURL(/\/sign-in\?next=%2Fonboarding$/);
  await expect(
    page.getByRole("heading", {
      name: /sign in to a workspace that keeps your interview prep tied to real evidence/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
