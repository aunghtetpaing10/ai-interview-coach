import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";

const getWorkspaceUserMock = vi.hoisted(() => vi.fn());
const createPostgresReportStoreMock = vi.hoisted(() => vi.fn());
const createReportServiceMock = vi.hoisted(() => vi.fn());
const createReportGenerationQueueMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceUser: getWorkspaceUserMock,
}));

vi.mock("@/lib/report-service/database-store", () => ({
  createPostgresReportStore: createPostgresReportStoreMock,
}));

vi.mock("@/lib/report-service/report-service", () => ({
  createReportService: createReportServiceMock,
}));

vi.mock("@/lib/inngest/report-generation", () => ({
  createReportGenerationQueue: createReportGenerationQueueMock,
}));

import { GET as getReportRoute } from "@/app/api/reports/[id]/route";
import { POST as generateReportRoute } from "@/app/api/reports/[id]/generate/route";
import { GET as listReportsRoute } from "@/app/api/reports/route";

describe("report api routes", () => {
  beforeEach(() => {
    getWorkspaceUserMock.mockReset();
    createPostgresReportStoreMock.mockReset();
    createReportServiceMock.mockReset();
    createReportGenerationQueueMock.mockReset();
  });

  const reportOverview: ReportOverview = {
    id: "report-1",
    title: "Queue scaling drill",
    sessionDate: "March 19, 2026",
    candidate: "Aung Paing",
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

  const reportDetail: InterviewReport = {
    ...reportOverview,
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
      focus: reportOverview.summary.headline,
      steps: [],
    },
  };

  it("returns a 401 when the list endpoint has no authenticated user", async () => {
    getWorkspaceUserMock.mockResolvedValue(null);

    const response = await listReportsRoute();

    expect(response.status).toBe(401);
  });

  it("lists report overviews for the signed-in user", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user_1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn().mockResolvedValue([reportOverview]),
      getReportById: vi.fn(),
      generateAndStoreReport: vi.fn(),
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
      generateAndStoreReport: vi.fn(),
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
      generateAndStoreReport: vi.fn(),
    });

    const response = await getReportRoute(undefined as never, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("queues report generation after session completion", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user_1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createReportServiceMock.mockReturnValue({
      listReportOverviews: vi.fn(),
      getReportById: vi.fn(),
      generateAndStoreReport: vi.fn(),
    });
    createReportGenerationQueueMock.mockReturnValue({
      enqueueReportGeneration: vi.fn().mockResolvedValue({
        queued: true,
        sessionId: "session-1",
      }),
    });

    const response = await generateReportRoute(undefined as never, {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      queued: true,
      sessionId: "session-1",
    });
  });
});
