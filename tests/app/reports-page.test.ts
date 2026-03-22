import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";

const {
  requireWorkspaceUserMock,
  createPostgresReportStoreMock,
  createReportServiceMock,
  redirectMock,
} = vi.hoisted(() => ({
  requireWorkspaceUserMock: vi.fn(),
  createPostgresReportStoreMock: vi.fn(),
  createReportServiceMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/app/(auth)/actions", () => ({
  signOutAction: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireWorkspaceUser: requireWorkspaceUserMock,
}));

vi.mock("@/lib/report-service/database-store", () => ({
  createPostgresReportStore: createPostgresReportStoreMock,
}));

vi.mock("@/lib/report-service/report-service", () => ({
  createReportService: createReportServiceMock,
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>(
    "next/navigation",
  );

  return {
    ...actual,
    redirect: redirectMock,
  };
});

import ReportsPage from "@/app/reports/page";
import ReportDetailPage from "@/app/reports/[reportId]/page";

function makeReportOverview(): ReportOverview {
  return {
    id: "report-1",
    title: "Queue scaling drill",
    sessionDate: "March 19, 2026",
    candidate: "Aung Htet Paing",
    targetRole: "Platform engineer",
    promptVersion: "report-rubric-v1",
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

function makeReport(): InterviewReport {
  const overview = makeReportOverview();

  return {
    ...overview,
    transcript: [
      {
        id: "turn-1",
        speaker: "candidate",
        text: "I owned the retry policy and moved the queue onto Kafka.",
        timestampSeconds: 29,
      },
    ],
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

describe("reports pages", () => {
  const user = {
    id: "user-1",
    email: "candidate@example.com",
    source: "supabase" as const,
  };

  it("loads the latest report detail from the reports index route", async () => {
    requireWorkspaceUserMock.mockResolvedValue(user);
    createPostgresReportStoreMock.mockReturnValue({});
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn().mockResolvedValue([makeReportOverview()]),
    });

    await expect(ReportsPage()).rejects.toThrow("REDIRECT:/reports/report-1");
    expect(redirectMock).toHaveBeenCalledWith("/reports/report-1");
  });

  it("renders a coherent empty state when there are no reports", async () => {
    requireWorkspaceUserMock.mockResolvedValue(user);
    createPostgresReportStoreMock.mockReturnValue({});
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn().mockResolvedValue([]),
      getReportById: vi.fn(),
    });

    const html = renderToStaticMarkup(await ReportsPage());

    expect(html).toContain("No completed reports yet.");
    expect(html).toContain("Start interview");
    expect(html).toContain("Finish onboarding");
  });

  it("keeps report detail directly addressable", async () => {
    requireWorkspaceUserMock.mockResolvedValue(user);
    createPostgresReportStoreMock.mockReturnValue({});
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn().mockResolvedValue([makeReportOverview()]),
      getReportById: vi.fn().mockResolvedValue(makeReport()),
    });

    const html = renderToStaticMarkup(
      await ReportDetailPage({
        params: Promise.resolve({ reportId: "report-1" }),
      }),
    );

    expect(html).toContain("Back to reports home");
    expect(html).toContain("Deep links remain stable");
    expect(html).toContain("Queue scaling drill");
  });
});
