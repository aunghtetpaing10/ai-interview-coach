import { expect, test } from "@playwright/test";

test("completes the onboarding draft flow", async ({ page }) => {
  await page.goto("/onboarding");

  await expect(
    page.getByRole("heading", {
      name: /set the target role, resume shell, and job description once/i,
    }),
  ).toBeVisible();

  await page.getByLabel(/role title/i).fill("Platform Engineer");
  await page.getByLabel(/focus areas/i).fill("APIs, ownership, scalability");
  await page.getByLabel(/company name/i).fill("Northstar");
  await page.getByLabel(/job title/i).fill("Staff Platform Engineer");
  await page.getByLabel(/job url/i).fill("https://example.com/jobs/platform-engineer");
  await page.getByLabel(/job description/i).fill(
    "Build and own distributed systems architecture, service boundaries, and reliability improvements across the platform.",
  );

  await page
    .getByLabel(/resume file/i)
    .setInputFiles({
      name: "platform-engineer-resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("synthetic resume content"),
    });

  await page.getByRole("button", { name: /save onboarding draft/i }).click();

  await expect(page.getByText(/draft captured/i)).toBeVisible();
  await expect(page.getByText(/ready for a live mock interview/i)).toBeVisible();
  await expect(page.getByText(/platform-engineer-resume/i)).toBeVisible();
});
