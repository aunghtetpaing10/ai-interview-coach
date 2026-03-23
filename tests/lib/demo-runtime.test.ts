import { mkdtempSync, rmSync } from "node:fs";
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

  it("drives a session through completion, report generation, and progress", async () => {
    const user = demoRuntime.getDemoWorkspaceUser();
    const repository = demoRuntime.createDemoInterviewRepository();
    const sessionStore = demoRuntime.createDemoInterviewSessionStore();
    const reportStore = demoRuntime.createDemoReportStore();
    const progressStore = demoRuntime.createDemoProgressStore();
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

    const firstGeneration = await reportService.generateAndStoreReport(user.id, session.id);
    const secondGeneration = await reportService.generateAndStoreReport(user.id, session.id);

    expect(firstGeneration.status).toBe("created");
    expect(secondGeneration.status).toBe("updated");
    expect(secondGeneration.report.id).toBe(firstGeneration.report.id);

    const reports = await reportStore.listReportOverviews(user.id);
    const progressSessions = await progressStore.listProgressSessions(user.id);
    const snapshotAfter = await repository.getWorkspaceSnapshot(user.id);

    expect(reports).toHaveLength(1);
    expect(progressSessions).toHaveLength(1);
    expect(progressSessions[0]?.score).toBe(firstGeneration.report.scorecard.overallScore);
    expect(progressSessions[0]?.followUps).toBe(2);
    expect(snapshotAfter.activeMode).toBe("system-design");
    expect(snapshotAfter.recentSessionCount).toBe(1);
  });
});
