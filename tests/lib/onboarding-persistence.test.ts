import { describe, expect, it, vi, beforeEach } from "vitest";
import type { WorkspaceSnapshot } from "@/lib/data/repository";
import { jobTargets, profiles, resumeAssets, targetRoles } from "@/db/schema";
import {
  hydrateOnboardingDraftFromWorkspaceSnapshot,
  makeOnboardingStateMessage,
  saveOnboardingDraftForUser,
} from "@/lib/intake/persistence";
import { createOnboardingDraftFromFormData } from "@/lib/intake/validation";

vi.mock("server-only", () => ({}));

const getDbMock = vi.hoisted(() => vi.fn());
const createSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

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

function createDraft() {
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

  return createOnboardingDraftFromFormData(formData);
}

function createDbMock({ failOnResumeAssetInsert = false } = {}) {
  const state = {
    profiles: [] as unknown[],
    targetRoles: [] as unknown[],
    jobTargets: [] as unknown[],
    resumeAssets: [] as unknown[],
  };

  let selectedTable: unknown = null;

  const selectBuilder = {
    from(table: unknown) {
      selectedTable = table;
      return this;
    },
    where() {
      return this;
    },
    limit() {
      return this;
    },
    orderBy() {
      return this;
    },
    then(onFulfilled: (value: unknown[]) => unknown, onRejected?: (reason: unknown) => unknown) {
      const value =
        selectedTable === profiles
          ? [...state.profiles]
          : selectedTable === targetRoles
            ? [...state.targetRoles]
            : selectedTable === jobTargets
              ? [...state.jobTargets]
              : selectedTable === resumeAssets
                ? [...state.resumeAssets]
                : [];

      return Promise.resolve(value).then(onFulfilled, onRejected);
    },
  };

  function buildInsertResult(table: unknown, payload: Record<string, unknown>) {
    if (table === profiles) {
      const row = {
        id: "profile-1",
        userId: payload.userId,
        fullName: payload.fullName,
        headline: payload.headline,
        targetRole: payload.targetRole,
        createdAt: payload.createdAt ?? new Date("2026-03-19T00:00:00.000Z"),
        updatedAt: payload.updatedAt ?? new Date("2026-03-19T00:00:00.000Z"),
      };
      state.profiles = [row];
      return [row];
    }

    if (table === targetRoles) {
      const row = {
        id: "target-role-1",
        userId: payload.userId,
        title: payload.title,
        companyType: payload.companyType,
        level: payload.level,
        focusAreas: payload.focusAreas,
        active: payload.active,
        createdAt: payload.createdAt ?? new Date("2026-03-19T00:00:00.000Z"),
      };
      state.targetRoles = [row];
      return [row];
    }

    if (table === jobTargets) {
      const row = {
        id: "job-target-1",
        userId: payload.userId,
        targetRoleId: payload.targetRoleId,
        companyName: payload.companyName,
        jobTitle: payload.jobTitle,
        jobUrl: payload.jobUrl,
        jobDescription: payload.jobDescription,
        createdAt: payload.createdAt ?? new Date("2026-03-19T00:00:00.000Z"),
        updatedAt: payload.updatedAt ?? new Date("2026-03-19T00:00:00.000Z"),
      };
      state.jobTargets = [row];
      return [row];
    }

    if (table === resumeAssets) {
      if (failOnResumeAssetInsert) {
        throw new Error("resume asset insert failed");
      }

      const row = {
        id: "resume-asset-1",
        userId: payload.userId,
        fileName: payload.fileName,
        storagePath: payload.storagePath,
        mimeType: payload.mimeType,
        summary: payload.summary,
        uploadedAt: payload.uploadedAt ?? new Date("2026-03-19T00:00:00.000Z"),
      };
      state.resumeAssets = [row];
      return [row];
    }

    return [];
  }

  const tx = {
    select() {
      return selectBuilder;
    },
    insert(table: unknown) {
      return {
        values(payload: Record<string, unknown>) {
          return {
            onConflictDoUpdate() {
              return this;
            },
            returning() {
              return buildInsertResult(table, payload);
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(payload: Record<string, unknown>) {
          return {
            where() {
              return {
                returning() {
                  if (table === targetRoles) {
                    const row = {
                      id: "target-role-1",
                      userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                      title: payload.title,
                      companyType: payload.companyType,
                      level: payload.level,
                      focusAreas: payload.focusAreas,
                      active: payload.active,
                      createdAt: new Date("2026-03-19T00:00:00.000Z"),
                    };
                    state.targetRoles = [row];
                    return [row];
                  }

                  if (table === jobTargets) {
                    const row = {
                      id: "job-target-1",
                      userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                      targetRoleId: "target-role-1",
                      companyName: payload.companyName,
                      jobTitle: payload.jobTitle,
                      jobUrl: payload.jobUrl,
                      jobDescription: payload.jobDescription,
                      createdAt: new Date("2026-03-19T00:00:00.000Z"),
                      updatedAt: payload.updatedAt ?? new Date("2026-03-19T00:00:00.000Z"),
                    };
                    state.jobTargets = [row];
                    return [row];
                  }

                  return [];
                },
              };
            },
          };
        },
      };
    },
  };

  const transaction = vi.fn((callback: (transactionClient: typeof tx) => Promise<unknown>) =>
    callback(tx),
  );

  const db = {
    transaction,
  };

  return { db, state, transaction };
}

describe("onboarding persistence helpers", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
  });

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

  it("saves onboarding metadata in a single transaction without uploading when no file is present", async () => {
    const { db, transaction } = createDbMock();
    getDbMock.mockReturnValue(db);
    createSupabaseAdminClientMock.mockReturnValue(null);

    const draft = createDraft();
    const result = await saveOnboardingDraftForUser({
      userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      email: "candidate@example.com",
      draft,
      file: null,
    });

    expect(result.profile.fullName).toBe("Candidate");
    expect(result.targetRole.title).toBe("Backend Software Engineer");
    expect(result.jobTarget.companyName).toBe("Northstar");
    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("cleans up an uploaded resume file when the transaction fails", async () => {
    const { db, transaction } = createDbMock({ failOnResumeAssetInsert: true });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    createSupabaseAdminClientMock.mockReturnValue({
      storage: {
        getBucket: vi.fn().mockResolvedValue({ data: null, error: { message: "bucket not found" } }),
        createBucket: vi.fn().mockResolvedValue({ error: null }),
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: removeMock,
        })),
      },
    });
    getDbMock.mockReturnValue(db);

    const draft = createDraft();
    const file = new File(["resume"], "resume.pdf", { type: "application/pdf" });

    await expect(
      saveOnboardingDraftForUser({
        userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        email: "candidate@example.com",
        draft,
        file,
      }),
    ).rejects.toThrow("resume asset insert failed");

    expect(removeMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringMatching(/^aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\//),
      ]),
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
