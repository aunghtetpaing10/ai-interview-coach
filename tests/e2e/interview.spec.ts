import { expect, test } from "@playwright/test";

test("supports a live interview loop from connection to follow-up", async ({
  page,
}) => {
  await page.goto("/interview");

  await expect(
    page.getByRole("heading", {
      name: /practice like the call is already in progress/i,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: /start live session/i }).click();

  await expect(page.getByText(/mock transport connected/i).first()).toBeVisible({
    timeout: 5000,
  });

  await page
    .getByPlaceholder(/draft your answer to/i)
    .fill("I partitioned the service and added backpressure to protect writes.");
  await page.getByRole("button", { name: /send response/i }).click();

  await expect(page.getByText(/hardest bottlenecks and why/i).first()).toBeVisible();
  await expect(page.getByText(/candidate response captured/i).first()).toBeVisible();
});
