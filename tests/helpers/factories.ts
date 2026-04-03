import type {
  CompanyStyle,
  InterviewMode,
  InterviewSessionRow,
  QuestionBankRow,
} from "@/db/schema";
import {
  getInterviewModeLabel,
  getModeDimensionTemplates,
  getModeRubricVersion,
} from "@/lib/domain/interview";
import { buildArtifactSections, generatePracticePlan, summarizeScorecard } from "@/lib/reporting/reporting";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";
import type {
  InterviewDifficulty,
  PracticeStyle,
  Scorecard,
  TranscriptTurn,
} from "@/lib/types/interview";

export function makeScorecard(
  mode: InterviewMode = "project",
  options: {
    overallScore?: number;
    dimensionScores?: Partial<Record<string, number>>;
  } = {},
): Scorecard {
  const overallScore = options.overallScore ?? 84;

  return {
    mode,
    overallScore,
    rubricVersion: getModeRubricVersion(mode),
    dimensions: getModeDimensionTemplates(mode).map((dimension, index) => ({
      key: dimension.key,
      label: dimension.label,
      score:
        options.dimensionScores?.[dimension.key] ??
        Math.max(0, Math.min(100, overallScore + (index < 2 ? 2 - index : index === 2 ? 0 : -index))),
      evidenceSummary: `${dimension.label} evidence is present in the transcript.`,
    })),
  };
}

export function makeInterviewSessionRow(
  overrides: Partial<InterviewSessionRow> = {},
): InterviewSessionRow {
  return {
    id: overrides.id ?? "session-1",
    userId: overrides.userId ?? "user-1",
    targetRoleId: overrides.targetRoleId ?? "target-1",
    mode: overrides.mode ?? "behavioral",
    practiceStyle: overrides.practiceStyle ?? "live",
    difficulty: overrides.difficulty ?? "challenging",
    companyStyle: overrides.companyStyle ?? null,
    questionId: overrides.questionId ?? null,
    status: overrides.status ?? "draft",
    title: overrides.title ?? "Interview",
    overallScore: overrides.overallScore ?? null,
    durationSeconds: overrides.durationSeconds ?? 18 * 60,
    nextTranscriptSequenceIndex: overrides.nextTranscriptSequenceIndex ?? 0,
    startedAt: overrides.startedAt ?? null,
    endedAt: overrides.endedAt ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-03-18T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-03-18T10:15:00.000Z"),
  };
}

export function makeQuestionBankRow(
  overrides: Partial<QuestionBankRow> = {},
): QuestionBankRow {
  const mode = overrides.mode ?? "behavioral";

  return {
    id: overrides.id ?? "question-1",
    mode,
    title: overrides.title ?? `${getInterviewModeLabel(mode)} prompt`,
    prompt: overrides.prompt ?? "Tell me about a time you handled a difficult problem.",
    followUps: overrides.followUps ?? ["What changed because of your decision?"],
    questionFamily: overrides.questionFamily ?? "core-signal",
    difficulty: overrides.difficulty ?? "challenging",
    companyTags: overrides.companyTags ?? ["general"],
    interviewerGoal: overrides.interviewerGoal ?? "Probe how clearly the candidate frames the problem.",
    followUpPolicy: overrides.followUpPolicy ?? "Ask one skeptical follow-up and one evidence follow-up.",
    coachingOutline:
      overrides.coachingOutline ?? ["Lead with context.", "Move to action.", "Close on outcome."],
    rubricKeys: overrides.rubricKeys ?? ["communication"],
    sourceTag: overrides.sourceTag ?? "seed",
    orderIndex: overrides.orderIndex ?? 1,
  };
}

export function makeRealtimeInput(
  overrides: Partial<{
    candidateName: string;
    targetRole: string;
    mode: InterviewMode;
    practiceStyle: PracticeStyle;
    difficulty: InterviewDifficulty;
    companyStyle: CompanyStyle | null;
    questionId: string;
    questionTitle: string;
    stageIndex: number;
    stageLabel: string;
    focus: string;
    interviewerGoal: string;
    followUpPolicy: string;
    openingPrompt: string;
  }> = {},
) {
  return {
    candidateName: overrides.candidateName ?? "Aung",
    targetRole: overrides.targetRole ?? "Platform engineer",
    mode: overrides.mode ?? "system-design",
    practiceStyle: overrides.practiceStyle ?? "live",
    difficulty: overrides.difficulty ?? "challenging",
    companyStyle: overrides.companyStyle ?? null,
    questionId: overrides.questionId ?? "question-1",
    questionTitle: overrides.questionTitle ?? "Design a notification service",
    stageIndex: overrides.stageIndex ?? 0,
    stageLabel: overrides.stageLabel ?? "Requirements",
    focus: overrides.focus ?? "capacity and failure domains",
    interviewerGoal: overrides.interviewerGoal ?? "Surface tradeoffs before diving into components.",
    followUpPolicy: overrides.followUpPolicy ?? "Challenge vague assumptions but do not reveal solutions.",
    openingPrompt: overrides.openingPrompt ?? "Design a notification service.",
  };
}

export function makeTranscriptTurn(
  overrides: Partial<TranscriptTurn> = {},
): TranscriptTurn {
  return {
    id: overrides.id ?? "turn-1",
    speaker: overrides.speaker ?? "candidate",
    text: overrides.text ?? "I owned the retry policy and moved the queue onto Kafka.",
    timestampSeconds: overrides.timestampSeconds ?? 29,
  };
}

export function makeReportOverview(
  overrides: Partial<ReportOverview> & {
    scorecard?: Scorecard;
  } = {},
): ReportOverview {
  const scorecard = overrides.scorecard ?? makeScorecard("project");
  const summary = overrides.summary ?? summarizeScorecard(scorecard);

  return {
    id: overrides.id ?? "report-1",
    title: overrides.title ?? "Queue scaling drill",
    sessionDate: overrides.sessionDate ?? "March 19, 2026",
    candidate: overrides.candidate ?? "Aung Htet Paing",
    targetRole: overrides.targetRole ?? "Platform engineer",
    promptVersion: overrides.promptVersion ?? "report-rubric-v2",
    scorecard,
    summary,
    strengths: overrides.strengths ?? summary.strengths,
    growthAreas: overrides.growthAreas ?? summary.growthAreas,
  };
}

export function makeInterviewReport(
  overrides: Partial<InterviewReport> & {
    scorecard?: Scorecard;
  } = {},
): InterviewReport {
  const overview = makeReportOverview(overrides);
  const transcript = overrides.transcript ?? [makeTranscriptTurn()];

  return {
    ...overview,
    transcript,
    citations: overrides.citations ?? [],
    rewrites: overrides.rewrites ?? [],
    practiceStyle: overrides.practiceStyle ?? "live",
    difficulty: overrides.difficulty ?? "challenging",
    companyStyle: overrides.companyStyle ?? null,
    questionId: overrides.questionId ?? "question-1",
    questionFamily: overrides.questionFamily ?? "core-signal",
    artifactSections:
      overrides.artifactSections ??
      buildArtifactSections({
        mode: overview.scorecard.mode,
        summary: overview.summary,
        transcript,
        strongestLine: overview.summary.strengths[0],
      }),
    replayActions: overrides.replayActions ?? [
      {
        label: "Repeat same question",
        href: `/interview?mode=${overview.scorecard.mode}&practiceStyle=live&difficulty=challenging&questionId=question-1`,
        description: "Run the same prompt again.",
      },
      {
        label: "Rotate similar question",
        href: `/interview?mode=${overview.scorecard.mode}&practiceStyle=live&difficulty=challenging`,
        description: "Move to a neighboring prompt family.",
      },
    ],
    practicePlan:
      overrides.practicePlan ??
      generatePracticePlan({
        targetRole: overview.targetRole,
        scorecard: overview.scorecard,
        summary: overview.summary,
        focusAreas: overview.growthAreas,
      }),
  };
}
