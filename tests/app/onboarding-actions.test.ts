import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceUser } from "@/lib/auth/session";

const { requireWorkspaceUserMock, saveOnboardingDraftForUserMock } = vi.hoisted(() => ({
  requireWorkspaceUserMock: vi.fn(),
  saveOnboardingDraftForUserMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  requireWorkspaceUser: requireWorkspaceUserMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/intake/persistence", async () => {
  const actual = await vi.importActual<typeof import("@/lib/intake/persistence")>(
    "@/lib/intake/persistence",
  );

  return {
    ...actual,
    saveOnboardingDraftForUser: saveOnboardingDraftForUserMock,
  };
});

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
  beforeEach(() => {
    requireWorkspaceUserMock.mockReset();
    saveOnboardingDraftForUserMock.mockReset();
    requireWorkspaceUserMock.mockResolvedValue({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      email: "candidate@example.com",
      source: "supabase",
    } satisfies WorkspaceUser);
  });

  it("returns a success state with a grounded summary for valid input", async () => {
    const result = await submitOnboardingDraft(
      createInitialOnboardingState(),
      createValidFormData(),
    );

    expect(result.status).toBe("success");
    expect(result.message).toMatch(/draft saved/i);
    expect(result.summary.recommendedTracks).toContain("resume");
    expect(result.fieldErrors).toEqual({});
    expect(saveOnboardingDraftForUserMock).toHaveBeenCalledTimes(1);
    expect(saveOnboardingDraftForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      }),
    );
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
