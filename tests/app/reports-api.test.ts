import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";
import { makeInterviewReport, makeReportOverview } from "@/tests/helpers/factories";

const getWorkspaceUserMock = vi.hoisted(() => vi.fn());
const createWorkspaceReportStoreMock = vi.hoisted(() => vi.fn());
const createReportServiceMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceUser: getWorkspaceUserMock,
}));

vi.mock("@/lib/workspace/runtime", () => ({
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

import { GET as getReportRoute } from "@/app/api/reports/[id]/route";
import {
  GET as getSessionReportStatusRoute,
  POST as createReportRoute,
} from "@/app/api/interview/sessions/[sessionId]/report/route";
import { GET as listReportsRoute } from "@/app/api/reports/route";
import { ReportServiceError } from "@/lib/report-service/report-service";

describe("report api routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const reportOverview: ReportOverview = makeReportOverview();
  const reportDetail: InterviewReport = makeInterviewReport({
    ...reportOverview,
    practicePlan: {
      title: "Platform engineer practice plan",
      focus: reportOverview.summary.headline,
      steps: [],
    },
  });

  it("returns a 401 when the list endpoint has no authenticated user", async () => {
    getWorkspaceUserMock.mockResolvedValue(null);

    const response = await listReportsRoute();

    expect(response.status).toBe(401);
  });

  it("lists report overviews for the signed-in user", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user_1",
      email: "candidate@example.com",
      source: "demo",
    });
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn().mockResolvedValue([reportOverview]),
      getReportById: vi.fn(),
    });

    const response = await listReportsRoute();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      reports: [reportOverview],
    });
  });

  it("returns a report detail when the report exists", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user_1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn(),
      getReportById: vi.fn().mockResolvedValue(reportDetail),
    });

    const response = await getReportRoute(undefined as never, {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      report: reportDetail,
    });
  });

  it("returns a 404 when the report does not exist", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user_1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn(),
      getReportById: vi.fn().mockResolvedValue(null),
    });

    const response = await getReportRoute(undefined as never, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns the background report job status for a completed session", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user_1",
      email: "candidate@example.com",
      source: "demo",
    });
    createReportServiceMock.mockReturnValue({
      getReportGenerationState: vi.fn().mockResolvedValue({
        jobId: "job-1",
        status: "running",
      }),
    });

    const response = await getSessionReportStatusRoute(undefined as never, {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      jobId: "job-1",
      status: "running",
    });
  });

  it("queues report generation for a completed session", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user_1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createReportServiceMock.mockReturnValue({
      requestReportGeneration: vi.fn().mockResolvedValue({
        jobId: "job-1",
        status: "queued",
      }),
    });

    const response = await createReportRoute(undefined as never, {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      jobId: "job-1",
      status: "queued",
    });
  });

  it("returns the completed report when the report already exists", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user_1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createReportServiceMock.mockReturnValue({
      requestReportGeneration: vi.fn().mockResolvedValue({
        jobId: "job-1",
        status: "completed",
        reportId: "report-1",
      }),
    });

    const response = await createReportRoute(undefined as never, {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      jobId: "job-1",
      status: "completed",
      reportId: "report-1",
    });
  });

  it("returns a 503 when background processing is unavailable", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user_1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createReportServiceMock.mockReturnValue({
      requestReportGeneration: vi.fn().mockRejectedValue(
        new ReportServiceError(
          "Report generation is unavailable until Inngest and OpenAI are configured.",
          "unavailable",
          503,
        ),
      ),
    });

    const response = await createReportRoute(undefined as never, {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Report generation is unavailable until Inngest and OpenAI are configured.",
      code: "unavailable",
    });
  });
});
