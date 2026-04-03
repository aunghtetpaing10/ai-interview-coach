import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";
import {
  makeInterviewReport,
  makeInterviewSessionRow,
  makeReportOverview as buildReportOverview,
} from "@/tests/helpers/factories";

const {
  requireWorkspaceUserMock,
  createWorkspaceInterviewRepositoryMock,
  createWorkspaceReportStoreMock,
  createReportServiceMock,
  redirectMock,
} = vi.hoisted(() => ({
  requireWorkspaceUserMock: vi.fn(),
  createWorkspaceInterviewRepositoryMock: vi.fn(),
  createWorkspaceReportStoreMock: vi.fn(),
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

vi.mock("@/lib/workspace/runtime", () => ({
  createWorkspaceInterviewRepository: createWorkspaceInterviewRepositoryMock,
  createWorkspaceReportStore: createWorkspaceReportStoreMock,
}));

vi.mock("@/lib/report-service/report-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/report-service/report-service")>(
    "@/lib/report-service/report-service",
  );

  return {
    ...actual,
    createReportService: createReportServiceMock,
  };
});

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
  return buildReportOverview();
}

function makeReport(): InterviewReport {
  return makeInterviewReport({
    ...buildReportOverview(),
    practicePlan: {
      title: "Platform engineer practice plan",
      focus: "Strong and trending up with clear upside in systems thinking.",
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
  });
}

describe("reports pages", () => {
  const user = {
    id: "user-1",
    email: "candidate@example.com",
    source: "demo" as const,
  };

  const repository = {
    listWorkspaceSessions: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the latest report detail from the reports index route", async () => {
    requireWorkspaceUserMock.mockResolvedValue(user);
    createWorkspaceInterviewRepositoryMock.mockResolvedValue(repository);
    createWorkspaceReportStoreMock.mockReturnValue({});
    repository.listWorkspaceSessions.mockResolvedValue([]);
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn().mockResolvedValue([makeReportOverview()]),
      getReportGenerationState: vi.fn(),
    });

    await expect(ReportsPage()).rejects.toThrow("REDIRECT:/reports/report-1");
    expect(redirectMock).toHaveBeenCalledWith("/reports/report-1");
  });

  it("renders a workflow-aware pending state when the latest report is still processing", async () => {
    requireWorkspaceUserMock.mockResolvedValue(user);
    createWorkspaceInterviewRepositoryMock.mockResolvedValue(repository);
    createWorkspaceReportStoreMock.mockReturnValue({});
    repository.listWorkspaceSessions.mockResolvedValue([
      makeInterviewSessionRow({
        id: "session-1",
        userId: user.id,
        targetRoleId: "target-1",
        mode: "project",
        status: "completed",
        title: "Queue scaling drill",
        overallScore: 84,
        durationSeconds: 1080,
        startedAt: new Date("2026-03-19T10:00:00.000Z"),
        endedAt: new Date("2026-03-19T10:18:00.000Z"),
        createdAt: new Date("2026-03-19T09:59:00.000Z"),
        updatedAt: new Date("2026-03-19T10:18:00.000Z"),
      }),
    ]);
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn().mockResolvedValue([]),
      getReportById: vi.fn(),
      getReportGenerationState: vi.fn().mockResolvedValue({
        jobId: "job-1",
        status: "running",
      }),
    });

    const html = renderToStaticMarkup(await ReportsPage());

    expect(html).toContain("Latest report is processing.");
    expect(html).toContain("Open processing");
    expect(html).toContain("/reports/processing/session-1");
  });

  it("redirects to the completed report when the workflow is done but the overview list is stale", async () => {
    requireWorkspaceUserMock.mockResolvedValue(user);
    createWorkspaceInterviewRepositoryMock.mockResolvedValue(repository);
    createWorkspaceReportStoreMock.mockReturnValue({});
    repository.listWorkspaceSessions.mockResolvedValue([
      makeInterviewSessionRow({
        id: "session-1",
        userId: user.id,
        targetRoleId: "target-1",
        mode: "project",
        status: "completed",
        title: "Queue scaling drill",
        overallScore: 84,
        durationSeconds: 1080,
        startedAt: new Date("2026-03-19T10:00:00.000Z"),
        endedAt: new Date("2026-03-19T10:18:00.000Z"),
        createdAt: new Date("2026-03-19T09:59:00.000Z"),
        updatedAt: new Date("2026-03-19T10:18:00.000Z"),
      }),
    ]);
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn().mockResolvedValue([]),
      getReportById: vi.fn(),
      getReportGenerationState: vi.fn().mockResolvedValue({
        jobId: "job-1",
        status: "completed",
        reportId: "report-1",
      }),
    });

    await expect(ReportsPage()).rejects.toThrow("REDIRECT:/reports/report-1");
    expect(redirectMock).toHaveBeenCalledWith("/reports/report-1");
  });

  it("renders a coherent empty state when there are no reports or workflows", async () => {
    requireWorkspaceUserMock.mockResolvedValue(user);
    createWorkspaceInterviewRepositoryMock.mockResolvedValue(repository);
    createWorkspaceReportStoreMock.mockReturnValue({});
    repository.listWorkspaceSessions.mockResolvedValue([]);
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn().mockResolvedValue([]),
      getReportById: vi.fn(),
      getReportGenerationState: vi.fn(),
    });

    const html = renderToStaticMarkup(await ReportsPage());

    expect(html).toContain("No completed reports yet.");
    expect(html).toContain("Start interview");
    expect(html).toContain("Finish onboarding");
  });

  it("keeps report detail directly addressable", async () => {
    requireWorkspaceUserMock.mockResolvedValue(user);
    createWorkspaceReportStoreMock.mockReturnValue({});
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
