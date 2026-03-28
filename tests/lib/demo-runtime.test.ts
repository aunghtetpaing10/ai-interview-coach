import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReportService } from "@/lib/report-service/report-service";

describe("demo runtime", () => {
  let demoRuntime: typeof import("@/lib/workspace/demo-runtime");
  let demoStateDir: string;

  beforeEach(async () => {
    demoStateDir = mkdtempSync(join(tmpdir(), "demo-runtime-test-"));
    process.env.E2E_DEMO_STATE_PATH = join(demoStateDir, "state.json");
    vi.resetModules();
    demoRuntime = await import("@/lib/workspace/demo-runtime");
  });

  afterEach(() => {
    delete process.env.E2E_DEMO_STATE_PATH;
    rmSync(demoStateDir, { recursive: true, force: true });
  });

  it("loads and saves onboarding state with cloned drafts", async () => {
    const user = demoRuntime.getDemoWorkspaceUser();
    const draft = await demoRuntime.loadDemoOnboardingDraftForUser(user.id);

    draft.roleTitle = "Staff Platform Engineer";
    draft.seniority = "senior";
    draft.companyName = "Northstar";
    draft.jobTitle = "Staff Software Engineer";

    const saved = await demoRuntime.saveDemoOnboardingDraftForUser({
      userId: user.id,
      email: user.email,
      draft,
      file: new File(["resume"], "resume.pdf", { type: "application/pdf" }),
    });

    expect(saved.profile.fullName).toBe("Aung Htet Paing");
    expect(saved.profile.headline).toBe("senior Staff Platform Engineer");
    expect(saved.targetRole.title).toBe("Staff Platform Engineer");
    expect(saved.resumeAsset?.fileName).toBe("resume.pdf");

    const reloaded = await demoRuntime.loadDemoOnboardingDraftForUser("someone-else");
    reloaded.roleTitle = "Mutated";

    const reloadedAgain = await demoRuntime.loadDemoOnboardingDraftForUser(user.id);
    expect(reloadedAgain.roleTitle).toBe("Staff Platform Engineer");
  });

  it("writes a versioned envelope and leaves no file behind on read-only access", async () => {
    const originalCwd = process.cwd();
    const sandboxDir = mkdtempSync(join(tmpdir(), "demo-runtime-read-only-"));

    try {
      process.chdir(sandboxDir);
      delete process.env.E2E_DEMO_STATE_PATH;
      vi.resetModules();
      const runtime = await import("@/lib/workspace/demo-runtime");
      const user = runtime.getDemoWorkspaceUser();

      await runtime.loadDemoOnboardingDraftForUser(user.id);

      expect(
        existsSync(join(sandboxDir, ".next", "cache", "e2e-demo-runtime.json")),
      ).toBe(false);

      process.env.E2E_DEMO_STATE_PATH = join(sandboxDir, "state.json");
      vi.resetModules();
      const persistedRuntime = await import("@/lib/workspace/demo-runtime");

      await persistedRuntime.saveDemoOnboardingDraftForUser({
        userId: user.id,
        email: user.email,
        draft: await persistedRuntime.loadDemoOnboardingDraftForUser(user.id),
        file: null,
      });

      const persistedFile = JSON.parse(readFileSync(join(sandboxDir, "state.json"), "utf8"));

      expect(persistedFile.version).toBe(1);
      expect(persistedFile.state.draft.roleTitle).toBe("Backend Software Engineer");
    } finally {
      process.chdir(originalCwd);
      delete process.env.E2E_DEMO_STATE_PATH;
    }
  });

  it("migrates legacy raw state files and defaults missing fields", async () => {
    const legacyDraft = {
      ...(await demoRuntime.loadDemoOnboardingDraftForUser(demoRuntime.getDemoWorkspaceUser().id)),
      roleTitle: "Legacy Platform Engineer",
      companyName: "Legacy Co",
    };

    writeFileSync(
      join(demoStateDir, "state.json"),
      JSON.stringify({
        draft: legacyDraft,
        profile: {
          id: "demo-profile-1",
          userId: demoRuntime.getDemoWorkspaceUser().id,
          fullName: "Aung Htet Paing",
          headline: "senior Legacy Platform Engineer",
          targetRole: "Legacy Platform Engineer",
          createdAt: "2026-03-19T09:00:00.000Z",
          updatedAt: "2026-03-19T09:00:00.000Z",
        },
        targetRole: {
          id: "demo-target-role-1",
          userId: demoRuntime.getDemoWorkspaceUser().id,
          title: "Legacy Platform Engineer",
          companyType: "product",
          level: "senior",
          focusAreas: ["Reliability"],
          active: true,
          createdAt: "2026-03-19T09:00:00.000Z",
        },
        jobTarget: {
          id: "demo-job-target-1",
          userId: demoRuntime.getDemoWorkspaceUser().id,
          targetRoleId: "demo-target-role-1",
          companyName: "Legacy Co",
          jobTitle: "Staff Platform Engineer",
          jobUrl: null,
          jobDescription: null,
          createdAt: "2026-03-19T09:00:00.000Z",
          updatedAt: "2026-03-19T09:00:00.000Z",
        },
        resumeAsset: null,
        sessions: [],
        transcriptTurnsBySessionId: [],
        reportJobsBySessionId: [],
        reportsById: [],
        reportIdBySessionId: [],
      }),
      "utf8",
    );

    vi.resetModules();
    await import("@/lib/workspace/demo-runtime");
    const { demoRuntime: stateRuntime } = await import("@/lib/workspace/demo-runtime/state");
    const state = stateRuntime.readState();

    expect(state.draft.roleTitle).toBe("Legacy Platform Engineer");
    expect(state.profile.headline).toBe("senior Legacy Platform Engineer");
    expect(state.nextSessionNumber).toBe(1);
    expect(state.clockTick).toBe(1);
  });

  it("drives a session through completion, queued report generation, and progress", async () => {
    const user = demoRuntime.getDemoWorkspaceUser();
    const repository = demoRuntime.createDemoInterviewRepository();
    const sessionStore = demoRuntime.createDemoInterviewSessionStore();
    const reportStore = demoRuntime.createDemoReportStore();
    const progressStore = demoRuntime.createDemoProgressStore();
    const publish = vi.fn().mockResolvedValue(undefined);
    const requestService = createReportService(reportStore, {
      backgroundProcessingAvailable: true,
      publishReportGenerationRequestedEvent: publish,
    });
    const reportService = createReportService(reportStore);

    const snapshotBefore = await repository.getWorkspaceSnapshot(user.id);
    expect(snapshotBefore.activeMode).toBe("behavioral");

    const session = await sessionStore.createSession({
      userId: user.id,
      targetRoleId: snapshotBefore.targetRole!.id,
      mode: "system-design",
      title: "Queue scaling drill",
    });

    const duplicateSession = await sessionStore.createSession({
      userId: user.id,
      targetRoleId: snapshotBefore.targetRole!.id,
      mode: "system-design",
      title: "Queue scaling drill",
    });

    expect(duplicateSession.id).toBe(session.id);

    await sessionStore.appendTranscriptTurns({
      userId: user.id,
      sessionId: session.id,
      turns: [
        {
          speaker: "interviewer",
          body: "Design a cache for the payments API.",
          seconds: 8,
        },
        {
          speaker: "candidate",
          body: "I would start with a simple TTL cache and a clear invalidation policy.",
          seconds: 28,
        },
      ],
    });

    await sessionStore.appendTranscriptTurns({
      userId: user.id,
      sessionId: session.id,
      turns: [
        {
          speaker: "interviewer",
          body: "How do you keep it consistent under retries?",
          seconds: 44,
        },
      ],
    });

    const transcript = await sessionStore.listTranscriptTurns(session.id);
    expect(transcript.map((turn) => turn.sequenceIndex)).toEqual([0, 1, 2]);

    const completed = await sessionStore.completeSession({
      userId: user.id,
      sessionId: session.id,
      overallScore: 88,
    });

    expect(completed.status).toBe("completed");

    const queued = await requestService.requestReportGeneration(user.id, session.id);
    const completedState = await reportService.processQueuedReportGeneration({
      userId: user.id,
      sessionId: session.id,
      reportJobId: queued.jobId,
      attemptCount: 1,
      maxAttempts: 3,
    });
    const secondGeneration = await requestService.requestReportGeneration(user.id, session.id);

    expect(queued.status).toBe("queued");
    expect(completedState?.status).toBe("completed");
    expect(secondGeneration.status).toBe("completed");
    expect(secondGeneration.reportId).toBe(completedState?.reportId);
    expect(publish).toHaveBeenCalledWith({
      userId: user.id,
      sessionId: session.id,
      reportJobId: queued.jobId,
    });

    const reports = await reportStore.listReportOverviews(user.id);
    const progressSessions = await progressStore.listProgressSessions(user.id);
    const snapshotAfter = await repository.getWorkspaceSnapshot(user.id);

    expect(reports).toHaveLength(1);
    expect(progressSessions).toHaveLength(1);
    expect(progressSessions[0]?.score).toBe(reports[0]?.scorecard.overallScore);
    expect(progressSessions[0]?.followUps).toBe(2);
    expect(snapshotAfter.activeMode).toBe("system-design");
    expect(snapshotAfter.recentSessionCount).toBe(1);
  });
});
