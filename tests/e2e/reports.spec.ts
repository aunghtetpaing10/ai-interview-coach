import { expect, test } from "@playwright/test";

test("renders the reports catalog and opens the featured report", async ({
  page,
}) => {
  await page.goto("/reports");

  await expect(
    page.getByRole("heading", {
      name: /reports that read like a product/i,
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: /open latest report/i }).click();
  await expect(page).toHaveURL(/\/reports\/report-042$/);

  await expect(
    page.getByRole("heading", {
      name: /live interview report: payments platform/i,
    }).first(),
  ).toBeVisible();

  await expect(page.getByRole("tab", { name: /citations/i })).toBeVisible();
});
