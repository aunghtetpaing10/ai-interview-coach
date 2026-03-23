import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadWorkspaceRuntime({ demoMode }: { demoMode: boolean }) {
  vi.resetModules();

  const demoRepo = { source: "demo-repo" };
  const demoSessionStore = { source: "demo-session-store" };
  const demoProgressStore = { source: "demo-progress-store" };
  const demoReportStore = { source: "demo-report-store" };
  const demoDraft = { roleTitle: "Demo role" };
  const saveDemoDraft = { ok: true };
  const prodRepo = { source: "prod-repo" };
  const prodSessionStore = { source: "prod-session-store" };
  const prodProgressStore = { source: "prod-progress-store" };
  const prodReportStore = { source: "prod-report-store" };
  const prodDraft = { roleTitle: "Prod role" };
  const saveProdDraft = { ok: true };

  vi.doMock("@/lib/env", () => ({
    isE2EDemoMode: () => demoMode,
  }));
  vi.doMock("@/lib/workspace/demo-runtime", () => ({
    createDemoInterviewRepository: vi.fn(() => demoRepo),
    createDemoInterviewSessionStore: vi.fn(() => demoSessionStore),
    createDemoProgressStore: vi.fn(() => demoProgressStore),
    createDemoReportStore: vi.fn(() => demoReportStore),
    loadDemoOnboardingDraftForUser: vi.fn().mockResolvedValue(demoDraft),
    saveDemoOnboardingDraftForUser: vi.fn().mockResolvedValue(saveDemoDraft),
  }));
  vi.doMock("@/lib/data/database-repository", () => ({
    createPostgresInterviewRepository: vi.fn(() => prodRepo),
  }));
  vi.doMock("@/lib/session-service/database-store", () => ({
    createDatabaseInterviewSessionStore: vi.fn(() => prodSessionStore),
  }));
  vi.doMock("@/lib/progress-service/database-store", () => ({
    createPostgresProgressStore: vi.fn(() => prodProgressStore),
  }));
  vi.doMock("@/lib/report-service/database-store", () => ({
    createPostgresReportStore: vi.fn(() => prodReportStore),
  }));
  vi.doMock("@/lib/intake/persistence", () => ({
    loadOnboardingDraftForUser: vi.fn().mockResolvedValue(prodDraft),
    saveOnboardingDraftForUser: vi.fn().mockResolvedValue(saveProdDraft),
  }));

  const runtime = await import("@/lib/workspace/runtime");

  return {
    runtime,
    expected: demoMode
      ? {
          interviewRepository: demoRepo,
          interviewSessionStore: demoSessionStore,
          progressStore: demoProgressStore,
          reportStore: demoReportStore,
          loadDraft: demoDraft,
          saveDraft: saveDemoDraft,
        }
      : {
          interviewRepository: prodRepo,
          interviewSessionStore: prodSessionStore,
          progressStore: prodProgressStore,
          reportStore: prodReportStore,
          loadDraft: prodDraft,
          saveDraft: saveProdDraft,
        },
  };
}

describe("workspace runtime", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("routes all workspace factories to the demo runtime when E2E mode is enabled", async () => {
    const { runtime, expected } = await loadWorkspaceRuntime({ demoMode: true });

    await expect(runtime.createWorkspaceInterviewRepository()).resolves.toBe(
      expected.interviewRepository,
    );
    await expect(runtime.createWorkspaceInterviewSessionStore()).resolves.toBe(
      expected.interviewSessionStore,
    );
    await expect(runtime.createWorkspaceProgressStore()).resolves.toBe(expected.progressStore);
    await expect(runtime.createWorkspaceReportStore()).resolves.toBe(expected.reportStore);
    await expect(runtime.loadWorkspaceOnboardingDraftForUser("user-1")).resolves.toBe(
      expected.loadDraft,
    );
    await expect(
      runtime.saveWorkspaceOnboardingDraftForUser({
        userId: "user-1",
        email: "candidate@example.com",
        draft: {} as never,
        file: null,
      }),
    ).resolves.toBe(expected.saveDraft);
  });

  it("routes all workspace factories to production services when E2E mode is disabled", async () => {
    const { runtime, expected } = await loadWorkspaceRuntime({ demoMode: false });

    await expect(runtime.createWorkspaceInterviewRepository()).resolves.toBe(
      expected.interviewRepository,
    );
    await expect(runtime.createWorkspaceInterviewSessionStore()).resolves.toBe(
      expected.interviewSessionStore,
    );
    await expect(runtime.createWorkspaceProgressStore()).resolves.toBe(expected.progressStore);
    await expect(runtime.createWorkspaceReportStore()).resolves.toBe(expected.reportStore);
    await expect(runtime.loadWorkspaceOnboardingDraftForUser("user-1")).resolves.toBe(
      expected.loadDraft,
    );
    await expect(
      runtime.saveWorkspaceOnboardingDraftForUser({
        userId: "user-1",
        email: "candidate@example.com",
        draft: {} as never,
        file: null,
      }),
    ).resolves.toBe(expected.saveDraft);
  });
});
