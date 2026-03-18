import { describe, expect, it } from "vitest";
import {
  buildOnboardingSummary,
  estimateOnboardingCompletion,
  inferRecommendedTracks,
} from "@/lib/intake/summary";
import {
  createOnboardingDraftFromFormData,
  normalizeCommaSeparatedList,
} from "@/lib/intake/validation";

function createDraft(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("roleTitle", overrides.roleTitle ?? "Backend Software Engineer");
  formData.set("seniority", overrides.seniority ?? "mid-level");
  formData.set("companyType", overrides.companyType ?? "startup");
  formData.set("focusAreas", overrides.focusAreas ?? "APIs, ownership, scalability");
  formData.set("companyName", overrides.companyName ?? "Northstar");
  formData.set("jobTitle", overrides.jobTitle ?? "Software Engineer");
  formData.set("jobUrl", overrides.jobUrl ?? "https://example.com/jobs/123");
  formData.set(
    "jobDescription",
    overrides.jobDescription ??
      "We need a backend engineer who can own APIs, improve reliability, and work across distributed systems.",
  );
  formData.set(
    "resumeNotes",
    overrides.resumeNotes ??
      "Built and scaled API services, partnered with product, and shipped features end-to-end.",
  );

  return createOnboardingDraftFromFormData(formData);
}

describe("intake helpers", () => {
  it("normalizes comma-separated focus areas", () => {
    expect(normalizeCommaSeparatedList(" APIs, ownership; scalability\nAPIs ")).toEqual([
      "APIs",
      "ownership",
      "scalability",
    ]);
  });

  it("parses onboarding form data into a structured draft", () => {
    const draft = createDraft();

    expect(draft.roleTitle).toBe("Backend Software Engineer");
    expect(draft.focusAreas).toEqual(["APIs", "ownership", "scalability"]);
    expect(draft.resumePreview.source).toBe("paste");
  });

  it("infers recommended interview tracks from the draft", async () => {
    const draft = await createDraft({
      roleTitle: "Platform Engineer",
      jobDescription:
        "Own distributed systems architecture, service boundaries, and scalability tradeoffs.",
      resumeNotes: "Uploaded resume notes for a systems-heavy role.",
    });

    expect(inferRecommendedTracks(draft)).toEqual([
      "behavioral",
      "resume",
      "system-design",
      "project",
    ]);
  });

  it("builds a readable onboarding summary", async () => {
    const draft = await createDraft();
    const summary = buildOnboardingSummary(draft);

    expect(estimateOnboardingCompletion(draft)).toBe(summary.completion);
    expect(summary.completion).toBeGreaterThanOrEqual(75);
    expect(summary.readinessLabel).toMatch(/ready|close/i);
    expect(summary.coachingHeadline).toMatch(/system design|grounded/i);
    expect(summary.resumePreview.source).toBe("paste");
  });

  it("throws on invalid minimal input", () => {
    const formData = new FormData();
    formData.set("roleTitle", "BE");

    expect(() => createOnboardingDraftFromFormData(formData)).toThrow(
      /Add the target role title/i,
    );
  });
});
