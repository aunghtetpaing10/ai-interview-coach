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

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);
  await expect(
    page.getByRole("heading", {
      name: /sign in to a workspace that keeps your interview prep tied to real evidence/i,
    }),
  ).toBeVisible();
});
