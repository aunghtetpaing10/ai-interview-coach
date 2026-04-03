import {
  REPORT_EVAL_CASES as REPORT_EVAL_CASES_DATA,
  REPORT_PROMPT_FIXTURES as REPORT_PROMPT_FIXTURES_DATA,
} from "@/lib/evals/fixtures";
import { getModeRubricVersion } from "@/lib/domain/interview";
import {
  buildArtifactSections,
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
  practiceStyle: InterviewReport["practiceStyle"];
  difficulty: InterviewReport["difficulty"];
  companyStyle: InterviewReport["companyStyle"];
  questionId: string;
  questionFamily: string;
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
    practiceStyle: seed.practiceStyle,
    difficulty: seed.difficulty,
    companyStyle: seed.companyStyle,
    questionId: seed.questionId,
    questionFamily: seed.questionFamily,
    artifactSections: buildArtifactSections({
      mode: seed.scorecard.mode,
      summary,
      transcript: seed.transcript,
      strongestLine: summary.strengths[0],
    }),
    replayActions: [
      {
        label: "Repeat same question",
        href: `/interview?mode=${seed.scorecard.mode}&practiceStyle=${seed.practiceStyle}&difficulty=${seed.difficulty}&questionId=${seed.questionId}`,
        description: "Run the exact same prompt again and compare the next answer against this report.",
      },
      {
        label: "Rotate similar question",
        href: `/interview?mode=${seed.scorecard.mode}&practiceStyle=${seed.practiceStyle}&difficulty=${seed.difficulty}`,
        description: "Stay in the same track but move to a neighboring question family.",
      },
    ],
    practicePlan: generatePracticePlan({
      targetRole: seed.targetRole,
      scorecard: seed.scorecard,
      summary,
      focusAreas: seed.focusAreas,
    }),
  };
}

function createScorecard(
  mode: Scorecard["mode"],
  overallScore: number,
  dimensions: Scorecard["dimensions"],
): Scorecard {
  return {
    mode,
    overallScore,
    rubricVersion: getModeRubricVersion(mode),
    dimensions,
  };
}

const report042 = makeReport({
  id: "report-042",
  title: "Live interview report: payments platform",
  sessionDate: "March 19, 2026",
  candidate: "Aung Paing",
  targetRole: "Mid-level software engineer",
  promptVersion: "report-rubric-v2",
  practiceStyle: "live",
  difficulty: "challenging",
  companyStyle: "stripe",
  questionId: "project-payments-scale",
  questionFamily: "payments-ownership",
  scorecard: createScorecard("project", 83, [
    { key: "credibility", label: "Credibility", score: 82, evidenceSummary: "The queue migration details sound firsthand." },
    { key: "scope", label: "Scope", score: 79, evidenceSummary: "The answer names ownership, but the team boundary could be tighter." },
    { key: "decision-quality", label: "Decision quality", score: 86, evidenceSummary: "The candidate explains why Kafka fit the retry problem." },
    { key: "technical-depth", label: "Technical depth", score: 88, evidenceSummary: "Rollback and backpressure concerns are grounded in real implementation detail." },
    { key: "impact", label: "Impact", score: 80, evidenceSummary: "The answer hints at reliability gains and should quantify them earlier." },
  ]),
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
  focusAreas: ["scope", "impact"],
});

const report041 = makeReport({
  id: "report-041",
  title: "Live interview report: caching strategy",
  sessionDate: "March 18, 2026",
  candidate: "Aung Paing",
  targetRole: "Backend engineer",
  promptVersion: "report-rubric-v2",
  practiceStyle: "live",
  difficulty: "challenging",
  companyStyle: "general",
  questionId: "system-design-profile-cache",
  questionFamily: "cache-consistency",
  scorecard: createScorecard("system-design", 76, [
    { key: "requirements", label: "Requirements", score: 72, evidenceSummary: "The candidate starts with cache behavior, not workload assumptions." },
    { key: "architecture", label: "Architecture", score: 81, evidenceSummary: "The main design path is coherent and easy to follow." },
    { key: "api-data-model", label: "API and data model", score: 74, evidenceSummary: "The invalidation contract is present but not explicit enough." },
    { key: "scalability", label: "Scalability", score: 79, evidenceSummary: "The answer mentions consistency pressure and staleness." },
    { key: "reliability", label: "Reliability", score: 71, evidenceSummary: "The failure path still needs clearer degraded behavior." },
    { key: "trade-offs", label: "Trade-offs", score: 77, evidenceSummary: "TTL versus event-driven invalidation is compared directly." },
  ]),
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
  focusAreas: ["requirements", "reliability"],
});

const report040 = makeReport({
  id: "report-040",
  title: "Guided drill report: launch retrospective",
  sessionDate: "March 17, 2026",
  candidate: "Aung Paing",
  targetRole: "Mid-level software engineer",
  promptVersion: "report-rubric-v2",
  practiceStyle: "guided",
  difficulty: "standard",
  companyStyle: "amazon",
  questionId: "behavioral-launch-regression",
  questionFamily: "launch-recovery",
  scorecard: createScorecard("behavioral", 68, [
    { key: "structure", label: "Structure", score: 71, evidenceSummary: "The answer has a basic sequence but not a clean STAR spine." },
    { key: "ownership", label: "Ownership", score: 63, evidenceSummary: "The story still uses 'we' when the interviewer needs direct ownership." },
    { key: "impact", label: "Impact", score: 66, evidenceSummary: "The result is acknowledged but not quantified." },
    { key: "communication", label: "Communication", score: 74, evidenceSummary: "The delivery is calm and understandable." },
    { key: "adaptability", label: "Adaptability", score: 64, evidenceSummary: "The follow-up answer recognizes the missing proof too late." },
  ]),
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
  focusAreas: ["ownership", "impact"],
});

export const REPORTS = [report042, report041, report040] as const;

export const FEATURED_REPORT = REPORTS[0];

export const REPORT_OVERVIEWS: readonly ReportOverview[] = REPORTS.map((report) => ({
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
}));

export function getReportById(reportId: string) {
  return REPORTS.find((report) => report.id === reportId);
}

export function getReportOverviewById(reportId: string) {
  return REPORT_OVERVIEWS.find((report) => report.id === reportId);
}

export const REPORT_PROMPT_FIXTURES = REPORT_PROMPT_FIXTURES_DATA;
export const REPORT_EVAL_CASES = REPORT_EVAL_CASES_DATA;
