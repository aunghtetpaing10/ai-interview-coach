import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  AnswerRewrite,
  CitationBlock,
  InterviewReport,
  PracticePlan,
  ReportOverview,
  ScorecardSummary,
} from "@/lib/reporting/types";
import { createReportService } from "@/lib/report-service/report-service";

const scorecardSummary: ScorecardSummary = {
  score: 84,
  band: "strong",
  headline: "Strong and trending up with clear upside in systems thinking.",
  strengths: ["Technical depth 87%", "Clarity 84%"],
  growthAreas: ["Systems thinking 75%", "Ownership 78%"],
};

const practicePlan: PracticePlan = {
  title: "Platform engineer practice plan",
  focus: scorecardSummary.headline,
  steps: [
    {
      id: "practice-1",
      title: "Rebuild the answer spine",
      minutes: 10,
      drill: "Rewrite the answer as a 30-second setup, action, and result.",
      outcome: "The answer opens cleanly and lands with a point of view.",
    },
    {
      id: "practice-2",
      title: "Trim the filler",
      minutes: 8,
      drill: "Remove every sentence that does not change confidence in your ownership.",
      outcome: "The answer sounds sharper and more direct.",
    },
    {
      id: "practice-3",
      title: "Deliver the final pass",
      minutes: 12,
      drill: "Say the revised answer out loud twice and keep the timing under 90 seconds.",
      outcome: "The final version is ready for a live interviewer.",
    },
  ],
};

const reportOverview: ReportOverview = {
  id: "report-123",
  title: "Live interview report: queue scaling",
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
  summary: scorecardSummary,
  strengths: scorecardSummary.strengths,
  growthAreas: scorecardSummary.growthAreas,
};

const citationBlocks: CitationBlock[] = [
  {
    id: "citation-1",
    label: "Positive evidence",
    speaker: "candidate",
    timestamp: "0:29",
    quote: "I owned the retry policy and moved the queue onto Kafka.",
    insight: "The candidate clearly names a decision and ownership area.",
    emphasis: "strength",
  },
];

const answerRewrites: AnswerRewrite[] = [
  {
    id: "rewrite-1",
    prompt: "Describe a project you led",
    stronger:
      "I handled the retry policy and rollback plan. The key gap was that I did not name my decision clearly.",
    whyItWorks:
      "It foregrounds the specific action and outcome while removing vague phrasing from the draft.",
    evidence: "the retry policy and rollback plan",
  },
];

const reportDetail: InterviewReport = {
  ...reportOverview,
  transcript: [
    {
      id: "turn-1",
      speaker: "interviewer",
      text: "Tell me about the payment queue you scaled.",
      timestampSeconds: 14,
    },
    {
      id: "turn-2",
      speaker: "candidate",
      text: "I owned the retry policy and moved the queue onto Kafka.",
      timestampSeconds: 29,
    },
  ],
  citations: citationBlocks,
  rewrites: answerRewrites,
  practicePlan,
};

describe("report service", () => {
  it("returns report overviews newest-first", async () => {
    const store = {
      listReportOverviews: vi.fn().mockResolvedValue([reportOverview]),
      getReportById: vi.fn(),
      loadGenerationContext: vi.fn(),
      saveGeneratedReport: vi.fn(),
    };

    const service = createReportService(store);
    const reports = await service.listReportOverviews("user_1");

    expect(reports).toEqual([reportOverview]);
    expect(store.listReportOverviews).toHaveBeenCalledWith("user_1");
  });

  it("returns a full report detail record", async () => {
    const store = {
      listReportOverviews: vi.fn(),
      getReportById: vi.fn().mockResolvedValue(reportDetail),
      loadGenerationContext: vi.fn(),
      saveGeneratedReport: vi.fn(),
    };

    const service = createReportService(store);
    const report = await service.getReportById("user_1", "report-123");

    expect(report).toEqual(reportDetail);
    expect(store.getReportById).toHaveBeenCalledWith("user_1", "report-123");
  });

  it("generates and stores a session report from persisted transcript data", async () => {
    const saved: InterviewReport[] = [];
    const store = {
      listReportOverviews: vi.fn(),
      getReportById: vi.fn(),
      loadGenerationContext: vi.fn().mockResolvedValue({
        session: {
          id: "session-123",
          userId: "user_1",
          targetRoleId: "target-1",
          mode: "project",
          status: "completed",
          title: "Queue scaling drill",
          overallScore: 84,
          durationSeconds: 18 * 60,
          startedAt: new Date("2026-03-19T10:00:00.000Z"),
          endedAt: new Date("2026-03-19T10:18:00.000Z"),
          createdAt: new Date("2026-03-19T09:59:00.000Z"),
          updatedAt: new Date("2026-03-19T10:18:00.000Z"),
        },
        profile: {
          id: "profile-1",
          userId: "user_1",
          fullName: "Aung Paing",
          headline: "Platform engineer",
          targetRole: "Platform engineer",
          createdAt: new Date("2026-03-19T09:00:00.000Z"),
          updatedAt: new Date("2026-03-19T09:00:00.000Z"),
        },
        targetRole: {
          id: "target-1",
          userId: "user_1",
          title: "Platform engineer",
          companyType: "startup",
          level: "mid-level",
          focusAreas: ["systems-thinking", "technical-depth"],
          active: true,
          createdAt: new Date("2026-03-19T09:00:00.000Z"),
        },
        jobTarget: null,
        promptVersion: {
          id: "prompt-1",
          label: "Scorecard v1",
          model: "gpt-5.2",
          hash: "sha256:scorecard-v1",
          notes: "Baseline scoring prompt.",
          publishedAt: new Date("2026-03-19T00:00:00.000Z"),
        },
        transcript: [
          {
            id: "turn-1",
            sessionId: "session-123",
            speaker: "interviewer",
            body: "Tell me about the payment queue you scaled.",
            seconds: 14,
            sequenceIndex: 0,
            confidence: 100,
            createdAt: new Date("2026-03-19T10:00:14.000Z"),
          },
          {
            id: "turn-2",
            sessionId: "session-123",
            speaker: "candidate",
            body: "I owned the retry policy and moved the queue onto Kafka.",
            seconds: 29,
            sequenceIndex: 1,
            confidence: 100,
            createdAt: new Date("2026-03-19T10:00:29.000Z"),
          },
        ],
        report: null,
        practicePlan: null,
      }),
      saveGeneratedReport: vi.fn().mockImplementation(async (_userId, _context, report) => {
        saved.push(report);
        return report;
      }),
    };

    const service = createReportService(store);
    const report = await service.generateAndStoreReport("user_1", "session-123");

    expect(report.id).toEqual(expect.any(String));
    expect(report.title).toBe("Queue scaling drill");
    expect(report.transcript).toHaveLength(2);
    expect(report.citations.length).toBeGreaterThan(0);
    expect(report.practicePlan.steps).toHaveLength(3);
    expect(saved).toHaveLength(1);
    expect(store.loadGenerationContext).toHaveBeenCalledWith("user_1", "session-123");
  });
});
