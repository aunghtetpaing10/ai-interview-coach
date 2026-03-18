import { expect, test } from "@playwright/test";

test("submits the onboarding draft and renders the saved summary", async ({
  page,
}) => {
  await page.goto("/onboarding");

  await expect(
    page.getByRole("heading", {
      name: /give the coach enough signal to act like it knows the role/i,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: /save onboarding draft/i }).click();

  await expect(
    page.getByText(
      /draft captured\. the coach can now anchor questions to your role, resume, and target job\./i,
    ),
  ).toBeVisible();

  await expect(page.getByText(/draft saved/i).first()).toBeVisible();
});
