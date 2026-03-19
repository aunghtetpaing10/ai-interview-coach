import { describe, expect, it, vi } from "vitest";
import type { WorkspaceSnapshot } from "@/lib/data/repository";
import {
  hydrateOnboardingDraftFromWorkspaceSnapshot,
  makeOnboardingStateMessage,
} from "@/lib/intake/persistence";

vi.mock("server-only", () => ({}));

function makeSnapshot(): WorkspaceSnapshot {
  return {
    profile: {
      id: "11111111-1111-1111-1111-111111111111",
      userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      fullName: "Aung Htet Paing",
      headline: "Mid-level platform engineer",
      targetRole: "Platform engineer",
      createdAt: new Date("2026-03-19T00:00:00.000Z"),
      updatedAt: new Date("2026-03-19T00:00:00.000Z"),
    },
    targetRole: {
      id: "22222222-2222-2222-2222-222222222222",
      userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      title: "Platform engineer",
      companyType: "startup",
      level: "mid-level",
      focusAreas: ["APIs", "Reliability"],
      active: true,
      createdAt: new Date("2026-03-19T00:00:00.000Z"),
    },
    jobTarget: {
      id: "33333333-3333-3333-3333-333333333333",
      userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      targetRoleId: "22222222-2222-2222-2222-222222222222",
      companyName: "Northstar",
      jobTitle: "Software Engineer",
      jobUrl: "https://example.com/jobs/software-engineer",
      jobDescription: "Build APIs and improve system reliability for product teams.",
      createdAt: new Date("2026-03-19T00:00:00.000Z"),
      updatedAt: new Date("2026-03-19T00:00:00.000Z"),
    },
    resumeAsset: {
      id: "44444444-4444-4444-4444-444444444444",
      userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      fileName: "resume.pdf",
      storagePath: "resume-assets/aaaaaaaa/resume.pdf",
      mimeType: "application/pdf",
      summary: "Scaled backend services and improved reliability.",
      uploadedAt: new Date("2026-03-19T00:00:00.000Z"),
    },
    activeMode: "system-design",
    questionCount: 4,
    rubricCount: 5,
    recentSessionCount: 1,
    questionPreview: [],
  };
}

describe("onboarding persistence helpers", () => {
  it("hydrates a saved onboarding draft from a persisted workspace snapshot", () => {
    const draft = hydrateOnboardingDraftFromWorkspaceSnapshot(makeSnapshot());

    expect(draft.roleTitle).toBe("Platform engineer");
    expect(draft.companyName).toBe("Northstar");
    expect(draft.resumePreview.source).toBe("file");
    expect(draft.resumeNotes).toContain("Scaled backend services");
  });

  it("builds a state message for a saved draft", () => {
    const message = makeOnboardingStateMessage(88);

    expect(message).toMatch(/saved/i);
    expect(message).toMatch(/interview/i);
  });
});
