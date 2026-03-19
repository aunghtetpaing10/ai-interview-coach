import { expect, test } from "@playwright/test";

test("supports a live interview loop from connection to follow-up", async ({
  page,
}) => {
  await page.goto("/interview");

  await expect(page).toHaveURL(/\/sign-in\?next=%2Finterview$/);
  await expect(
    page.getByRole("heading", {
      name: /sign in to a workspace that keeps your interview prep tied to real evidence/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
