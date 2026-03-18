import { expect, test } from "@playwright/test";

test("renders the landing page and links to the dashboard", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /train for real software interviews/i,
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: /explore the dashboard/i }).click();

  await expect(
    page.getByRole("heading", {
      name: /good evening/i,
    }),
  ).toBeVisible();
});
