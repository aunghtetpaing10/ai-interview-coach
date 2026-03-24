import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const ONBOARDING = {
  roleTitle: "Staff Backend Engineer",
  focusAreas: "APIs, reliability, incident response",
  companyName: "Northstar Labs",
  jobTitle: "Staff Backend Engineer",
  jobUrl: "https://example.com/jobs/staff-backend-engineer",
  jobDescription:
    "Own the reliability of the coaching platform, shipping durable APIs and repeatable workflows.",
  resumeNotes:
    "Built backend systems, owned APIs, and led incident cleanup for customer-facing platforms.",
  resumeFileName: "resume.txt",
  resumeFileContents: "Resume summary for deterministic e2e coverage.",
} as const;

let latestReportId: string | null = null;
let latestSessionId: string | null = null;

async function seedOnboardingDraft(page: Page) {
  await page.goto("/onboarding");

  await expect(
    page.getByRole("heading", {
      name: /give the coach enough signal to sound editorial, specific, and grounded\./i,
    }),
  ).toBeVisible();

  await page.getByLabel("Role title").fill(ONBOARDING.roleTitle);

  const seniorityTrigger = page.getByRole("combobox", { name: /seniority/i });
  await seniorityTrigger.click();
  await page.getByRole("option", { name: "Senior" }).click();

  const companyTypeTrigger = page.getByRole("combobox", { name: /company type/i });
  await companyTypeTrigger.click();
  await page.getByRole("option", { name: "Enterprise" }).click();

  await page.getByLabel("Focus areas").fill(ONBOARDING.focusAreas);
  await page
    .locator('input[name="resumeFile"]')
    .setInputFiles({
      name: ONBOARDING.resumeFileName,
      mimeType: "text/plain",
      buffer: Buffer.from(ONBOARDING.resumeFileContents),
    });
  await page.getByLabel("Resume notes or pasted summary").fill(ONBOARDING.resumeNotes);
  await page.getByLabel("Company name").fill(ONBOARDING.companyName);
  await page.getByLabel("Job title").fill(ONBOARDING.jobTitle);
  await page.getByLabel("Job URL").fill(ONBOARDING.jobUrl);
  await page.getByLabel("Job description").fill(ONBOARDING.jobDescription);

  await page.getByRole("button", { name: /save onboarding draft/i }).click();

  await expect(
    page.getByText(/coach can start a grounded interview with your persisted role/i),
  ).toBeVisible();
}

async function completeInterviewToProcessing(page: Page) {
  await seedOnboardingDraft(page);

  await page.goto("/interview?mode=system-design");

  await expect(
    page.getByRole("heading", {
      name: /practice like the transcript is already under editorial review\./i,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: /start live session/i }).click();

  const responseDraft = page.getByPlaceholder(/draft your answer to:/i);
  const responseText =
    "I owned a queue-backed rollout that kept incident response under five minutes.";
  await responseDraft.fill(responseText);

  await expect(page.getByRole("button", { name: /send response/i })).toBeEnabled();
  await page.getByRole("button", { name: /send response/i }).click();

  await expect(page.getByText(responseText)).toBeVisible();

  await page.getByRole("button", { name: /^end$/i }).click();

  await page.waitForURL(/\/reports\/processing\/[^/]+$/);

  return page.url().match(/\/reports\/processing\/([^/]+)$/)?.[1] ?? null;
}

async function waitForReportDetail(page: Page) {
  await page.waitForURL(/\/reports\/[^/]+$/);
  await expect(page.getByText(/report archive/i)).toBeVisible();
  await expect(page.getByText(/session metadata/i)).toBeVisible();

  return page.url().match(/\/reports\/([^/]+)$/)?.[1] ?? null;
}

test("saves onboarding and rehydrates the draft on reload", async ({ page }) => {
  await seedOnboardingDraft(page);

  await page.reload();

  await expect(page.getByLabel("Role title")).toHaveValue(ONBOARDING.roleTitle);
  await expect(page.getByRole("combobox", { name: /seniority/i })).toContainText(/senior/i);
  await expect(page.getByRole("combobox", { name: /company type/i })).toContainText(
    /enterprise/i,
  );
  await expect(page.getByLabel("Focus areas")).toHaveValue(ONBOARDING.focusAreas);
  await expect(page.getByLabel("Company name")).toHaveValue(ONBOARDING.companyName);
  await expect(page.getByLabel("Job title")).toHaveValue(ONBOARDING.jobTitle);
  await expect(page.getByLabel("Job URL")).toHaveValue(ONBOARDING.jobUrl);
  await expect(page.getByLabel("Job description")).toHaveValue(
    ONBOARDING.jobDescription,
  );
  await expect(page.getByLabel("Resume notes or pasted summary")).toHaveValue(
    ONBOARDING.resumeNotes,
  );
});

test("drives the interview loop through the processing route into the final report", async ({
  page,
}) => {
  latestSessionId = await completeInterviewToProcessing(page);

  await expect(page).toHaveURL(/\/reports\/processing\/[^/]+$/);
  latestReportId = await waitForReportDetail(page);

  await expect(page).toHaveURL(/\/reports\/[^/]+$/);
  await expect(page.getByText(/report archive/i)).toBeVisible();
  await expect(page.getByText(/session metadata/i)).toBeVisible();
});

test("shows pending report workflow on dashboard and progress before completion", async ({
  page,
}) => {
  latestSessionId = await completeInterviewToProcessing(page);

  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: /good evening,/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /track report status/i })).toBeVisible();
  await expect(page.getByText(/latest report processing/i)).toBeVisible();

  await page.goto("/progress");

  await expect(
    page.getByRole("heading", {
      name: /the interview loop is trending upward and the telemetry layer is visible\./i,
    }),
  ).toBeVisible();
  await expect(page.getByText(/the latest report is still processing\./i)).toBeVisible();
  await expect(page.getByRole("link", { name: /track report status/i })).toBeVisible();

  await page.goto(`/reports/processing/${latestSessionId}`);
  latestReportId = await waitForReportDetail(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /open latest report/i })).toBeVisible();

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: /recent interview sessions/i })).toBeVisible();
  await expect(page.getByText("system-design").first()).toBeVisible();
});

test("routes /reports through processing while pending and back to the latest report after completion", async ({
  page,
}) => {
  latestSessionId = await completeInterviewToProcessing(page);

  await page.goto("/reports");

  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByText(/latest report is processing\./i)).toBeVisible();
  await expect(page.getByRole("link", { name: /open processing/i })).toBeVisible();

  await page.goto(`/reports/processing/${latestSessionId}`);
  latestReportId = await waitForReportDetail(page);

  await page.goto("/reports");

  await expect(page).toHaveURL(new RegExp(`/reports/${latestReportId}$`));
  await expect(page.getByText(/report archive/i)).toBeVisible();
  await expect(page.getByText(/session metadata/i)).toBeVisible();
});
