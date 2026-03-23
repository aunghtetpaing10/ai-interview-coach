import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildResumePreviewFromText } from "@/lib/resume/parser";
import { createProgressService } from "@/lib/progress-service/progress-service";
import { createReportService } from "@/lib/report-service/report-service";
import { createInterviewSessionService } from "@/lib/session-service/session-service";

async function loadDemoRuntime() {
  vi.resetModules();
  return import("@/lib/workspace/demo-runtime");
}

describe("workspace demo runtime", () => {
  let demoStateDir: string;

  beforeEach(() => {
    demoStateDir = mkdtempSync(join(tmpdir(), "workspace-demo-runtime-test-"));
    process.env.E2E_DEMO_STATE_PATH = join(demoStateDir, "state.json");
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.E2E_DEMO_STATE_PATH;
    rmSync(demoStateDir, { recursive: true, force: true });
  });

  it("exposes a demo user and seeded onboarding snapshot", async () => {
    const demoRuntime = await loadDemoRuntime();
    const user = demoRuntime.getDemoWorkspaceUser();
    const draft = await demoRuntime.loadDemoOnboardingDraftForUser(user.id);
    const repository = demoRuntime.createDemoInterviewRepository();
    const snapshot = await repository.getWorkspaceSnapshot(user.id);

    expect(user.source).toBe("demo");
    expect(draft.roleTitle).toBe("Backend Software Engineer");
    expect(snapshot.profile?.fullName).toBe("Aung Htet Paing");
    expect(snapshot.targetRole?.title).toBe("Backend Software Engineer");
    expect(snapshot.resumeAsset?.fileName).toBe("Pasted resume notes");
    expect(snapshot.recentSessionCount).toBe(0);
    expect(snapshot.activeMode).toBe("behavioral");
  });

  it("persists onboarding changes back into the workspace snapshot", async () => {
    const demoRuntime = await loadDemoRuntime();
    const user = demoRuntime.getDemoWorkspaceUser();
    const nextDraft = {
      ...(await demoRuntime.loadDemoOnboardingDraftForUser(user.id)),
      roleTitle: "Staff Platform Engineer",
      focusAreas: ["Reliability", "Platform", "Architecture"],
      companyName: "Orbit",
      jobTitle: "Staff Engineer",
      jobUrl: "https://example.com/jobs/staff-platform",
      jobDescription:
        "Lead platform architecture, scale reliability tooling, and improve service ownership across backend teams.",
      resumeNotes:
        "Led platform migrations, improved service reliability, and drove cross-team architecture decisions.",
      resumePreview: buildResumePreviewFromText(
        "Led platform migrations, improved service reliability, and drove cross-team architecture decisions.",
      ),
    };

    await demoRuntime.saveDemoOnboardingDraftForUser({
      userId: user.id,
      email: user.email,
      draft: nextDraft,
      file: null,
    });

    const repository = demoRuntime.createDemoInterviewRepository();
    const snapshot = await repository.getWorkspaceSnapshot(user.id);

    expect(snapshot.profile?.headline).toContain("Staff Platform Engineer");
    expect(snapshot.targetRole?.focusAreas).toEqual([
      "Reliability",
      "Platform",
      "Architecture",
    ]);
    expect(snapshot.jobTarget?.companyName).toBe("Orbit");
    expect(snapshot.resumeAsset?.summary).toContain("platform migrations");
  });

  it("creates sessions, reuses unfinished drills, and updates active mode after completion", async () => {
    const demoRuntime = await loadDemoRuntime();
    const user = demoRuntime.getDemoWorkspaceUser();
    const store = demoRuntime.createDemoInterviewSessionStore();
    const role = await store.getTargetRoleById(user.id, "demo-target-role-1");

    expect(role?.title).toBe("Backend Software Engineer");

    const service = createInterviewSessionService(store);
    const firstSession = await service.createSession({
      userId: user.id,
      targetRoleId: role!.id,
      mode: "system-design",
      title: "System design rehearsal",
    });
    const reusedSession = await service.createSession({
      userId: user.id,
      targetRoleId: role!.id,
      mode: "system-design",
      title: "System design rehearsal",
    });

    expect(reusedSession.session.id).toBe(firstSession.session.id);

    const appended = await service.appendTranscriptTurns({
      userId: user.id,
      sessionId: firstSession.session.id,
      turns: [
        {
          speaker: "interviewer",
          body: "Design a notifications service.",
          seconds: 8,
        },
        {
          speaker: "candidate",
          body: "I would start with a fan-out queue and delivery state.",
          seconds: 28,
        },
      ],
    });

    expect(appended.session.status).toBe("active");
    expect(appended.transcriptTurns).toHaveLength(2);

    const completed = await service.completeSession({
      userId: user.id,
      sessionId: firstSession.session.id,
      overallScore: 88,
    });

    expect(completed.session.status).toBe("completed");

    const repository = demoRuntime.createDemoInterviewRepository();
    const snapshot = await repository.getWorkspaceSnapshot(user.id);

    expect(snapshot.activeMode).toBe("system-design");
    expect(snapshot.recentSessionCount).toBe(1);
  });

  it("stores reports idempotently and exposes derived progress sessions", async () => {
    const demoRuntime = await loadDemoRuntime();
    const user = demoRuntime.getDemoWorkspaceUser();
    const sessionService = createInterviewSessionService(
      demoRuntime.createDemoInterviewSessionStore(),
    );
    const role = await demoRuntime
      .createDemoInterviewSessionStore()
      .getTargetRoleById(user.id, "demo-target-role-1");
    const session = await sessionService.createSession({
      userId: user.id,
      targetRoleId: role!.id,
      mode: "project",
      title: "Queue scaling drill",
    });

    await sessionService.appendTranscriptTurns({
      userId: user.id,
      sessionId: session.session.id,
      turns: [
        {
          speaker: "interviewer",
          body: "How would you handle retry storms?",
          seconds: 10,
        },
        {
          speaker: "candidate",
          body: "I would isolate retries, add backpressure, and make delivery state explicit.",
          seconds: 33,
        },
      ],
    });
    await sessionService.completeSession({
      userId: user.id,
      sessionId: session.session.id,
      overallScore: 84,
    });

    const reportService = createReportService(demoRuntime.createDemoReportStore());
    const created = await reportService.generateAndStoreReport(user.id, session.session.id);
    const updated = await reportService.generateAndStoreReport(user.id, session.session.id);
    const overviews = await reportService.listReportOverviews(user.id);
    const report = await reportService.getReportById(user.id, created.report.id);
    const progressService = createProgressService(demoRuntime.createDemoProgressStore());
    const progressSessions = await progressService.listProgressSessions(user.id);
    const progressSnapshot = await progressService.getProgressSnapshot(user.id);

    expect(created.status).toBe("created");
    expect(updated.status).toBe("updated");
    expect(updated.report.id).toBe(created.report.id);
    expect(overviews).toHaveLength(1);
    expect(report?.practicePlan.steps.length).toBeGreaterThan(0);
    expect(progressSessions).toHaveLength(1);
    expect(progressSnapshot?.latestSession?.id).toBe(session.session.id);
    expect(progressSnapshot?.strongestTrack.track).toBe("project");
  });
});
