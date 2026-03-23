import { expect, test } from "@playwright/test";

test("renders the landing page and links to the dashboard", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /turn interview practice into measurable mastery/i,
    }),
  ).toBeVisible();

  const dashboardLink = page.getByRole("link", { name: /open the dashboard/i });
  await expect(dashboardLink).toHaveAttribute("href", "/dashboard");

  await dashboardLink.click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /good evening,/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /view reports/i })).toBeVisible();
});
