import { describe, expect, it } from "vitest";
import { submitOnboardingDraft } from "@/app/onboarding/actions";
import { createInitialOnboardingState } from "@/lib/intake/state";

function createValidFormData() {
  const formData = new FormData();
  formData.set("roleTitle", "Backend Software Engineer");
  formData.set("seniority", "mid-level");
  formData.set("companyType", "startup");
  formData.set("focusAreas", "APIs, ownership, scalability");
  formData.set("companyName", "Northstar");
  formData.set("jobTitle", "Software Engineer");
  formData.set("jobUrl", "https://example.com/jobs/backend-engineer");
  formData.set(
    "jobDescription",
    "Build and own APIs that support product teams, improve service reliability, and scale core platform systems.",
  );
  formData.set(
    "resumeNotes",
    "Scaled API services, shipped cross-functional product work, and improved reliability.",
  );
  return formData;
}

describe("submitOnboardingDraft", () => {
  it("returns a success state with a grounded summary for valid input", async () => {
    const result = await submitOnboardingDraft(
      createInitialOnboardingState(),
      createValidFormData(),
    );

    expect(result.status).toBe("success");
    expect(result.message).toMatch(/draft captured/i);
    expect(result.summary.recommendedTracks).toContain("resume");
    expect(result.fieldErrors).toEqual({});
  });

  it("preserves the previous summary and exposes field errors for invalid input", async () => {
    const previousState = createInitialOnboardingState();
    const invalidFormData = new FormData();
    invalidFormData.set("roleTitle", "BE");
    invalidFormData.set("seniority", "mid-level");
    invalidFormData.set("companyType", "startup");

    const result = await submitOnboardingDraft(previousState, invalidFormData);

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/target role title/i);
    expect(result.summary).toEqual(previousState.summary);
    expect(result.fieldErrors.roleTitle).toMatch(/target role title/i);
    expect(result.fieldErrors.jobDescription).toMatch(/job description/i);
  });
});
