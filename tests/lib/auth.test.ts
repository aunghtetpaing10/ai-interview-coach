import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceSnapshot } from "@/lib/data/repository";
import {
  buildAuthActionState,
  parseFormData,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/forms";
import {
  buildAuthCallbackPath,
  buildSignInPath,
  buildSignUpPath,
  resolvePostAuthPath,
} from "@/lib/auth/paths";
import { getAuthErrorMessage } from "@/lib/auth/messages";

const createPostgresInterviewRepositoryMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/data/database-repository", () => ({
  createPostgresInterviewRepository: createPostgresInterviewRepositoryMock,
}));

import {
  needsOnboarding,
  resolvePostAuthDestination,
} from "@/lib/auth/destination";

describe("auth helpers", () => {
  beforeEach(() => {
    createPostgresInterviewRepositoryMock.mockReset();
  });

  it("sanitizes post-auth redirect targets", () => {
    expect(resolvePostAuthPath("/workspace?tab=sessions")).toBe("/workspace?tab=sessions");
    expect(resolvePostAuthPath("https://example.com/workspace")).toBe("/workspace");
    expect(resolvePostAuthPath("/sign-in")).toBe("/workspace");
    expect(resolvePostAuthPath(undefined)).toBe("/workspace");
  });

  it("builds auth entrypoint paths with safe next parameters", () => {
    expect(buildSignInPath("/workspace", "oauth_failed")).toBe(
      "/sign-in?next=%2Fworkspace&error=oauth_failed",
    );
    expect(buildSignUpPath("/reports")).toBe("/sign-up?next=%2Freports");
    expect(buildAuthCallbackPath("/dashboard")).toBe("/auth/callback?next=%2Fdashboard");
  });

  it("parses auth form data with zod", () => {
    const signInFormData = new FormData();
    signInFormData.set("email", "you@example.com");
    signInFormData.set("password", "password123");

    const signUpFormData = new FormData();
    signUpFormData.set("fullName", "Aung Htet Paing");
    signUpFormData.set("email", "you@example.com");
    signUpFormData.set("password", "password123");

    expect(parseFormData(signInSchema, signInFormData).success).toBe(true);
    expect(parseFormData(signUpSchema, signUpFormData).success).toBe(true);
  });

  it("builds a stable auth action state", () => {
    expect(
      buildAuthActionState("error", "Missing fields", { email: ["invalid"] }),
    ).toEqual({
      status: "error",
      message: "Missing fields",
      fieldErrors: { email: ["invalid"] },
    });
  });

  it("maps auth error codes to UI-safe messages", () => {
    expect(getAuthErrorMessage("oauth_callback_failed")).toMatch(/Google sign-in/i);
    expect(getAuthErrorMessage("unknown")).toMatch(
      /Authentication could not be completed/i,
    );
  });

  it("detects whether onboarding is complete", () => {
    const snapshot: WorkspaceSnapshot = {
      profile: {
        id: "profile-1",
        userId: "user-1",
        fullName: "Aung Paing",
        headline: "Backend engineer",
        targetRole: "Backend engineer",
        createdAt: new Date("2026-03-19T00:00:00.000Z"),
        updatedAt: new Date("2026-03-19T00:00:00.000Z"),
      },
      targetRole: {
        id: "target-1",
        userId: "user-1",
        title: "Backend engineer",
        companyType: "startup",
        level: "mid-level",
        focusAreas: ["api design"],
        active: true,
        createdAt: new Date("2026-03-19T00:00:00.000Z"),
      },
      jobTarget: {
        id: "job-1",
        userId: "user-1",
        targetRoleId: "target-1",
        companyName: "Northstar",
        jobTitle: "Backend engineer",
        jobUrl: "https://example.com/jobs/backend",
        jobDescription: "Build APIs and scale services.",
        createdAt: new Date("2026-03-19T00:00:00.000Z"),
        updatedAt: new Date("2026-03-19T00:00:00.000Z"),
      },
      resumeAsset: {
        id: "resume-1",
        userId: "user-1",
        fileName: "resume.pdf",
        storagePath: "user-1/resume.pdf",
        mimeType: "application/pdf",
        summary: "Scaled APIs and improved reliability.",
        uploadedAt: new Date("2026-03-19T00:00:00.000Z"),
      },
      activeMode: "system-design",
      questionCount: 3,
      rubricCount: 5,
      recentSessionCount: 1,
      questionPreview: [],
    };

    expect(needsOnboarding(snapshot)).toBe(false);
    expect(needsOnboarding({ ...snapshot, resumeAsset: null })).toBe(true);
  });

  it("routes incomplete users to onboarding", async () => {
    createPostgresInterviewRepositoryMock.mockReturnValue({
      getWorkspaceSnapshot: vi.fn().mockResolvedValue({
        profile: null,
        targetRole: null,
        jobTarget: null,
        resumeAsset: null,
        activeMode: "behavioral",
        questionCount: 0,
        rubricCount: 0,
        recentSessionCount: 0,
        questionPreview: [],
      }),
    });

    await expect(resolvePostAuthDestination("user-1", "/dashboard")).resolves.toBe(
      "/onboarding",
    );
  });

  it("routes complete users to a sanitized next path", async () => {
    createPostgresInterviewRepositoryMock.mockReturnValue({
      getWorkspaceSnapshot: vi.fn().mockResolvedValue({
        profile: {
          id: "profile-1",
          userId: "user-1",
          fullName: "Aung Paing",
          headline: "Backend engineer",
          targetRole: "Backend engineer",
          createdAt: new Date("2026-03-19T00:00:00.000Z"),
          updatedAt: new Date("2026-03-19T00:00:00.000Z"),
        },
        targetRole: {
          id: "target-1",
          userId: "user-1",
          title: "Backend engineer",
          companyType: "startup",
          level: "mid-level",
          focusAreas: ["api design"],
          active: true,
          createdAt: new Date("2026-03-19T00:00:00.000Z"),
        },
        jobTarget: {
          id: "job-1",
          userId: "user-1",
          targetRoleId: "target-1",
          companyName: "Northstar",
          jobTitle: "Backend engineer",
          jobUrl: "https://example.com/jobs/backend",
          jobDescription: "Build APIs and scale services.",
          createdAt: new Date("2026-03-19T00:00:00.000Z"),
          updatedAt: new Date("2026-03-19T00:00:00.000Z"),
        },
        resumeAsset: {
          id: "resume-1",
          userId: "user-1",
          fileName: "resume.pdf",
          storagePath: "user-1/resume.pdf",
          mimeType: "application/pdf",
          summary: "Scaled APIs and improved reliability.",
          uploadedAt: new Date("2026-03-19T00:00:00.000Z"),
        },
        activeMode: "system-design",
        questionCount: 3,
        rubricCount: 5,
        recentSessionCount: 1,
        questionPreview: [],
      }),
    });

    await expect(
      resolvePostAuthDestination("user-1", "https://evil.example.com/dashboard"),
    ).resolves.toBe("/workspace");
  });
});
