import {
  REPORT_EVAL_CASES as REPORT_EVAL_CASES_DATA,
  REPORT_PROMPT_FIXTURES as REPORT_PROMPT_FIXTURES_DATA,
} from "@/lib/evals/fixtures";
import {
  buildCitationBlocks,
  generatePracticePlan,
  rewriteAnswerDraft,
  summarizeScorecard,
} from "@/lib/reporting/reporting";
import type {
  CitationSignal,
  InterviewReport,
  ReportOverview,
  RewriteInput,
} from "@/lib/reporting/types";
import type { Scorecard, TranscriptTurn } from "@/lib/types/interview";

type ReportSeed = {
  id: string;
  title: string;
  sessionDate: string;
  candidate: string;
  targetRole: string;
  promptVersion: string;
  scorecard: Scorecard;
  transcript: TranscriptTurn[];
  signals: CitationSignal[];
  rewrites: RewriteInput[];
  focusAreas: string[];
};

function makeReport(seed: ReportSeed): InterviewReport {
  const summary = summarizeScorecard(seed.scorecard);
  const citations = buildCitationBlocks(seed.transcript, seed.signals);
  const rewrites = seed.rewrites.map((rewrite) => rewriteAnswerDraft(rewrite));

  return {
    id: seed.id,
    title: seed.title,
    sessionDate: seed.sessionDate,
    candidate: seed.candidate,
    targetRole: seed.targetRole,
    promptVersion: seed.promptVersion,
    scorecard: seed.scorecard,
    summary,
    strengths: summary.strengths,
    growthAreas: summary.growthAreas,
    transcript: seed.transcript,
    citations,
    rewrites,
    practicePlan: generatePracticePlan({
      targetRole: seed.targetRole,
      scorecard: seed.scorecard,
      summary,
      focusAreas: seed.focusAreas,
    }),
  };
}

const report042 = makeReport({
  id: "report-042",
  title: "Live interview report: payments platform",
  sessionDate: "March 19, 2026",
  candidate: "Aung Paing",
  targetRole: "Mid-level software engineer",
  promptVersion: "report-rubric-v1",
  scorecard: {
    mode: "project",
    overallScore: 83,
    competencies: {
      clarity: 84,
      ownership: 78,
      "technical-depth": 87,
      communication: 80,
      "systems-thinking": 75,
    },
  },
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
      text: "I owned the retry policy and moved the queue onto Kafka, which cut duplicate processing during retries.",
      timestampSeconds: 29,
    },
    {
      id: "turn-3",
      speaker: "interviewer",
      text: "What happened when the queue fell behind during peak traffic?",
      timestampSeconds: 41,
    },
    {
      id: "turn-4",
      speaker: "candidate",
      text: "I described the rollback path, but I should have opened with the throughput limit and fallback behavior.",
      timestampSeconds: 47,
    },
  ],
  signals: [
    {
      turnId: "turn-2",
      emphasis: "strength",
      insight: "The answer clearly names ownership and a concrete engineering decision.",
    },
    {
      turnId: "turn-4",
      emphasis: "gap",
      insight: "The answer needed a stronger systems framing before discussing the implementation.",
    },
  ],
  rewrites: [
    {
      prompt: "Describe a project you led",
      draft: "We improved the queue and the rollout went fine.",
      evidence: "the retry policy and rollback plan for the queue rollout",
      weakness: "It was too vague about who made the decisions",
    },
    {
      prompt: "Explain a tradeoff you made",
      draft: "I picked Kafka because it seemed better.",
      evidence: "the queue migration required more durable retries and better visibility into backpressure",
      weakness: "It did not explain the tradeoff clearly",
    },
  ],
  focusAreas: ["systems thinking"],
});

const report041 = makeReport({
  id: "report-041",
  title: "Live interview report: caching strategy",
  sessionDate: "March 18, 2026",
  candidate: "Aung Paing",
  targetRole: "Backend engineer",
  promptVersion: "report-rubric-v1",
  scorecard: {
    mode: "system-design",
    overallScore: 76,
    competencies: {
      clarity: 72,
      ownership: 74,
      "technical-depth": 81,
      communication: 70,
      "systems-thinking": 79,
    },
  },
  transcript: [
    {
      id: "turn-1",
      speaker: "interviewer",
      text: "Design a cache invalidation strategy for user profiles.",
      timestampSeconds: 11,
    },
    {
      id: "turn-2",
      speaker: "candidate",
      text: "I started with a TTL and then added explicit invalidation when the profile changed, but I skipped the failure path.",
      timestampSeconds: 26,
    },
    {
      id: "turn-3",
      speaker: "interviewer",
      text: "What breaks if the invalidation event is delayed?",
      timestampSeconds: 39,
    },
    {
      id: "turn-4",
      speaker: "candidate",
      text: "I should have explained stale reads, eventual consistency, and the fallback state for the client.",
      timestampSeconds: 46,
    },
  ],
  signals: [
    {
      turnId: "turn-2",
      emphasis: "strength",
      insight: "The answer names a concrete caching strategy and the trigger for invalidation.",
    },
    {
      turnId: "turn-4",
      emphasis: "gap",
      insight: "The response needs a clearer failure-mode walkthrough and fallback behavior.",
    },
  ],
  rewrites: [
    {
      prompt: "Explain your caching approach",
      draft: "I used TTLs and some invalidation logic.",
      evidence: "the profile-cache TTL and explicit invalidation when user data changed",
      weakness: "It did not explain stale reads or fallback behavior",
    },
  ],
  focusAreas: ["technical depth"],
});

const report040 = makeReport({
  id: "report-040",
  title: "Live interview report: launch retrospective",
  sessionDate: "March 17, 2026",
  candidate: "Aung Paing",
  targetRole: "Mid-level software engineer",
  promptVersion: "report-rubric-v1",
  scorecard: {
    mode: "behavioral",
    overallScore: 68,
    competencies: {
      clarity: 71,
      ownership: 63,
      "technical-depth": 66,
      communication: 74,
      "systems-thinking": 64,
    },
  },
  transcript: [
    {
      id: "turn-1",
      speaker: "interviewer",
      text: "Tell me about a time a launch went wrong.",
      timestampSeconds: 9,
    },
    {
      id: "turn-2",
      speaker: "candidate",
      text: "We had a delayed launch, and I helped the team work through it.",
      timestampSeconds: 21,
    },
    {
      id: "turn-3",
      speaker: "interviewer",
      text: "What exactly did you own?",
      timestampSeconds: 34,
    },
    {
      id: "turn-4",
      speaker: "candidate",
      text: "I should have said which decision I made, what changed, and what the result was.",
      timestampSeconds: 42,
    },
  ],
  signals: [
    {
      turnId: "turn-2",
      emphasis: "gap",
      insight: "The answer uses shared-language and needs a clear first-person decision.",
    },
    {
      turnId: "turn-4",
      emphasis: "probe",
      insight: "The candidate recognized the missing structure after the follow-up.",
    },
  ],
  rewrites: [
    {
      prompt: "Describe a launch that did not go to plan",
      draft: "We had a delayed launch, and I helped the team work through it.",
      evidence: "the release triage decision and the rollback path after the launch slipped",
      weakness: "It blurred my responsibility with the team effort",
    },
  ],
  focusAreas: ["ownership", "clarity"],
});

export const REPORTS = [report042, report041, report040] as const;

export const FEATURED_REPORT = REPORTS[0];

export const REPORT_OVERVIEWS: readonly ReportOverview[] = REPORTS.map(
  (report) => ({
    id: report.id,
    title: report.title,
    sessionDate: report.sessionDate,
    candidate: report.candidate,
    targetRole: report.targetRole,
    promptVersion: report.promptVersion,
    scorecard: report.scorecard,
    summary: report.summary,
    strengths: report.strengths,
    growthAreas: report.growthAreas,
  }),
);

export function getReportById(reportId: string) {
  return REPORTS.find((report) => report.id === reportId);
}

export function getReportOverviewById(reportId: string) {
  return REPORT_OVERVIEWS.find((report) => report.id === reportId);
}

export const REPORT_PROMPT_FIXTURES = REPORT_PROMPT_FIXTURES_DATA;
export const REPORT_EVAL_CASES = REPORT_EVAL_CASES_DATA;
