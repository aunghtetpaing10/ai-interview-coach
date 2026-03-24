import { describe, expect, it } from "vitest";
import type { WorkspaceSnapshot } from "@/lib/data/repository";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";
import type { ProgressDashboardSnapshot } from "@/lib/analytics/progress";
import { buildDashboardReadModel } from "@/lib/dashboard/read-model";

function makeWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    profile: {
      id: "profile-1",
      userId: "user-1",
      fullName: "Aung Htet Paing",
      headline: "Mid-level platform engineer",
      targetRole: "Platform engineer",
      createdAt: new Date("2026-03-19T00:00:00.000Z"),
      updatedAt: new Date("2026-03-19T00:00:00.000Z"),
    },
    targetRole: {
      id: "target-1",
      userId: "user-1",
      title: "Platform engineer",
      companyType: "startup",
      level: "mid-level",
      focusAreas: ["systems-thinking", "technical-depth"],
      active: true,
      createdAt: new Date("2026-03-19T00:00:00.000Z"),
    },
    jobTarget: null,
    resumeAsset: null,
    activeMode: "system-design",
    questionCount: 4,
    rubricCount: 5,
    recentSessionCount: 3,
    questionPreview: [],
  };
}

function makeReportOverview(): ReportOverview {
  return {
    id: "report-1",
    title: "Queue scaling drill",
    sessionDate: "March 19, 2026",
    candidate: "Aung Htet Paing",
    targetRole: "Platform engineer",
    promptVersion: "Scorecard v1",
    scorecard: {
      mode: "project",
      overallScore: 84,
      competencies: {
        clarity: 84,
        ownership: 78,
        "technical-depth": 87,
        communication: 80,
        "systems-thinking": 75,
      },
    },
    summary: {
      score: 84,
      band: "strong",
      headline: "Strong and trending up with clear upside in systems thinking.",
      strengths: ["Technical depth 87%", "Clarity 84%"],
      growthAreas: ["Systems thinking 75%", "Ownership 78%"],
    },
    strengths: ["Technical depth 87%", "Clarity 84%"],
    growthAreas: ["Systems thinking 75%", "Ownership 78%"],
  };
}

function makeLatestReport(): InterviewReport {
  const overview = makeReportOverview();

  return {
    ...overview,
    transcript: [],
    citations: [],
    rewrites: [],
    practicePlan: {
      title: "Platform engineer practice plan",
      focus: overview.summary.headline,
      steps: [
        {
          id: "step-1",
          title: "Lead with tradeoffs",
          minutes: 12,
          drill: "Answer the system design prompt in four moves.",
          outcome: "The answer makes constraints visible earlier.",
        },
      ],
    },
  };
}

function makeProgressSnapshot(): ProgressDashboardSnapshot {
  return {
    readinessBand: "improving",
    averageScore: 79,
    momentum: 8,
    streakDays: 3,
    totalMinutes: 63,
    averageFollowUps: 6,
    weakestTrack: {
      track: "system-design",
      label: "System design",
      averageScore: 74,
      sessions: 1,
      bestScore: 74,
      bestNote: "Needs earlier bottleneck framing.",
    },
    strongestTrack: {
      track: "project",
      label: "Project walkthrough",
      averageScore: 84,
      sessions: 2,
      bestScore: 84,
      bestNote: "Scope and metrics are now explicit.",
    },
    trackSummaries: [
      {
        track: "project",
        label: "Project walkthrough",
        averageScore: 84,
        sessions: 2,
        bestScore: 84,
        bestNote: "Scope and metrics are now explicit.",
      },
      {
        track: "system-design",
        label: "System design",
        averageScore: 74,
        sessions: 1,
        bestScore: 74,
        bestNote: "Needs earlier bottleneck framing.",
      },
    ],
    timeline: [],
    sessions: [
      {
        id: "session-1",
        completedAt: "2026-03-19T10:18:00.000Z",
        track: "project",
        score: 84,
        durationMinutes: 21,
        followUps: 6,
        focus: "queue scaling",
        note: "Scope and metrics are now explicit.",
      },
    ],
    latestSession: {
      id: "session-1",
      completedAt: "2026-03-19T10:18:00.000Z",
      track: "project",
      score: 84,
      durationMinutes: 21,
      followUps: 6,
      focus: "queue scaling",
      note: "Scope and metrics are now explicit.",
    },
  };
}

describe("buildDashboardReadModel", () => {
  it("builds a dashboard view from persisted workspace, progress, and reports", () => {
    const model = buildDashboardReadModel({
      workspace: makeWorkspaceSnapshot(),
      reportOverviews: [makeReportOverview()],
      latestReport: makeLatestReport(),
      progressSnapshot: makeProgressSnapshot(),
      completedSessionCount: 3,
    });

    expect(model.firstName).toBe("Aung");
    expect(model.activeModeLabel).toBe("System design");
    expect(model.stats[0]?.value).toBe("improving");
    expect(model.stats[1]?.value).toBe("3");
    expect(model.latestSession?.trackLabel).toBe("Project walkthrough");
    expect(model.timeline).toHaveLength(0);
    expect(model.questionPreview).toHaveLength(0);
    expect(model.practicePlan[0]?.title).toBe("Lead with tradeoffs");
    expect(model.scorecards.find((card) => card.mode === "project")?.competencies[0]?.score).toBeGreaterThan(0);
  });

  it("falls back cleanly when the user has no completed reports yet", () => {
    const model = buildDashboardReadModel({
      workspace: makeWorkspaceSnapshot(),
      reportOverviews: [],
      latestReport: null,
      progressSnapshot: null,
      completedSessionCount: 0,
    });

    expect(model.stats[1]?.value).toBe("0");
    expect(model.practicePlan).toHaveLength(0);
    expect(model.latestSession).toBeNull();
    expect(model.heroDescription).toMatch(/save onboarding data/i);
  });

  it("surfaces a pending report workflow while the latest session is still processing", () => {
    const model = buildDashboardReadModel({
      workspace: makeWorkspaceSnapshot(),
      reportOverviews: [],
      latestReport: null,
      reportWorkflow: {
        sessionId: "session-1",
        status: "running",
      },
      progressSnapshot: makeProgressSnapshot(),
      completedSessionCount: 1,
    });

    expect(model.reportWorkflow).toEqual({
      sessionId: "session-1",
      href: "/reports/processing/session-1",
      label: "Track report status",
      description: "The latest completed session is still processing in the background.",
      status: "running",
      error: undefined,
    });
    expect(model.nextDrillTitle).toBe("Wait for the latest report");
    expect(model.stats[2]?.copy).toMatch(/background report job is still processing/i);
  });

  it("surfaces a failed report workflow with a retry path", () => {
    const model = buildDashboardReadModel({
      workspace: makeWorkspaceSnapshot(),
      reportOverviews: [],
      latestReport: null,
      reportWorkflow: {
        sessionId: "session-1",
        status: "failed",
        error: "OpenAI report generation failed.",
      },
      progressSnapshot: makeProgressSnapshot(),
      completedSessionCount: 1,
    });

    expect(model.reportWorkflow?.label).toBe("Retry report");
    expect(model.reportWorkflow?.description).toBe("OpenAI report generation failed.");
    expect(model.heroDescription).toMatch(/report generation failed/i);
  });
});
