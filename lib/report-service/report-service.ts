import "server-only";

import { randomUUID } from "node:crypto";
import { format } from "date-fns";
import {
  generatePracticePlan,
  rewriteAnswerDraft,
  summarizeScorecard,
  buildCitationBlocks,
} from "@/lib/reporting/reporting";
import type {
  AnswerRewrite,
  CitationSignal,
  InterviewReport,
  ReportOverview,
} from "@/lib/reporting/types";
import type { TranscriptTurn } from "@/lib/types/interview";
import type {
  FeedbackReportRow,
  JobTargetRow,
  InterviewSessionRow,
  PracticePlanRow,
  ProfileRow,
  PromptVersionRow,
  TargetRoleRow,
  TranscriptTurnRow,
} from "@/db/schema";
import type { Scorecard } from "@/lib/types/interview";

export interface ReportGenerationContext {
  session: InterviewSessionRow;
  profile: ProfileRow | null;
  targetRole: TargetRoleRow | null;
  jobTarget: JobTargetRow | null;
  promptVersion: PromptVersionRow | null;
  transcript: readonly TranscriptTurnRow[];
  report: FeedbackReportRow | null;
  practicePlan: PracticePlanRow | null;
}

export interface ReportStore {
  listReportOverviews(userId: string): Promise<readonly ReportOverview[]>;
  getReportById(userId: string, reportId: string): Promise<InterviewReport | null>;
  loadGenerationContext(
    userId: string,
    sessionId: string,
  ): Promise<ReportGenerationContext | null>;
  saveGeneratedReport(
    userId: string,
    context: ReportGenerationContext,
    report: InterviewReport,
  ): Promise<InterviewReport>;
}

export type ReportServiceErrorCode = "not_found" | "invalid_state";

export type GeneratedReportStatus = "created" | "updated";

export interface GeneratedReportResult {
  report: InterviewReport;
  status: GeneratedReportStatus;
}

export class ReportServiceError extends Error {
  constructor(
    message: string,
    public readonly code: ReportServiceErrorCode,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ReportServiceError";
  }
}

function formatSessionDate(value: Date | null | undefined) {
  return format(value ?? new Date(), "MMMM d, yyyy");
}

function toTranscriptTurns(turns: readonly TranscriptTurnRow[]): TranscriptTurn[] {
  return turns.map((turn) => ({
    id: turn.id,
    speaker: turn.speaker,
    text: turn.body,
    timestampSeconds: turn.seconds,
  }));
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildGeneratedScorecard(
  session: InterviewSessionRow,
  transcript: readonly TranscriptTurnRow[],
): Scorecard {
  const candidateTurnCount = transcript.filter((turn) => turn.speaker === "candidate").length;
  const baseScore = clampScore(
    session.overallScore ?? 68 + candidateTurnCount * 2 + (session.mode === "system-design" ? 4 : 0),
  );

  return {
    mode: session.mode,
    overallScore: baseScore,
    competencies: {
      clarity: clampScore(baseScore + 1),
      ownership: clampScore(baseScore - 4),
      "technical-depth": clampScore(
        baseScore + (session.mode === "system-design" ? 6 : session.mode === "project" ? 4 : 2),
      ),
      communication: clampScore(baseScore - 1),
      "systems-thinking": clampScore(baseScore - 2),
    },
  };
}

function buildCitationSignals(
  transcript: ReadonlyArray<TranscriptTurn>,
  scorecardSummary: ReturnType<typeof summarizeScorecard>,
) {
  const candidateTurns = transcript.filter((turn) => turn.speaker === "candidate");
  const interviewerTurns = transcript.filter((turn) => turn.speaker === "interviewer");
  const signals: CitationSignal[] = [];

  if (candidateTurns[0]) {
    signals.push({
      turnId: candidateTurns[0].id,
      emphasis: "strength",
      insight: "The answer names ownership and gives a concrete action.",
    });
  }

  if (candidateTurns.at(-1) && candidateTurns.at(-1)?.id !== candidateTurns[0]?.id) {
    signals.push({
      turnId: candidateTurns.at(-1)!.id,
      emphasis: scorecardSummary.band === "ready" ? "strength" : "gap",
      insight:
        scorecardSummary.band === "ready"
          ? "The follow-up answer stays concrete and measurable."
          : "The answer still needs a stronger result statement.",
    });
  }

  if (interviewerTurns.at(-1)) {
    signals.push({
      turnId: interviewerTurns.at(-1)!.id,
      emphasis: "probe",
      insight: "This is the follow-up probe that should be answered with tradeoffs or evidence.",
    });
  }

  return signals.slice(0, 3);
}

function buildRewrites(
  transcript: ReadonlyArray<TranscriptTurn>,
  summary: ReturnType<typeof summarizeScorecard>,
) {
  const candidateTurns = transcript.filter((turn) => turn.speaker === "candidate");
  const firstTurn = candidateTurns[0];
  const secondTurn = candidateTurns[1];
  const weaknessLabel = summary.growthAreas[0] ?? "the answer leaves the outcome vague";
  const rewrites: AnswerRewrite[] = [];

  if (firstTurn) {
    rewrites.push(
      rewriteAnswerDraft({
        prompt: "Lead the interview answer with ownership",
        draft: firstTurn.text,
        evidence: firstTurn.text,
        weakness: `it under-explains ${weaknessLabel.toLowerCase()}`,
      }),
    );
  }

  if (secondTurn) {
    rewrites.push(
      rewriteAnswerDraft({
        prompt: "Tighten the follow-up answer",
        draft: secondTurn.text,
        evidence: secondTurn.text,
        weakness: `it does not close the loop on ${weaknessLabel.toLowerCase()}`,
      }),
    );
  }

  if (rewrites.length === 0) {
    rewrites.push(
      rewriteAnswerDraft({
        prompt: "Recover the answer spine",
        draft: summary.headline,
        evidence: summary.strengths[0] ?? summary.headline,
        weakness: `it does not name the outcome clearly enough`,
      }),
    );
  }

  return rewrites;
}

function buildGeneratedReport(context: ReportGenerationContext): InterviewReport {
  const transcript = toTranscriptTurns(context.transcript);
  const scorecard = buildGeneratedScorecard(context.session, context.transcript);
  const summary = summarizeScorecard(scorecard);
  const practicePlan = generatePracticePlan({
    targetRole: context.targetRole?.title ?? "Interview candidate",
    scorecard,
    summary,
    focusAreas: summary.growthAreas,
  });
  const reportId = context.report?.id ?? randomUUID();
  const citations = buildCitationBlocks(transcript, buildCitationSignals(transcript, summary));
  const rewrites = buildRewrites(transcript, summary);

  return {
    id: reportId,
    title: context.session.title,
    sessionDate: formatSessionDate(context.session.endedAt ?? context.session.updatedAt),
    candidate: context.profile?.fullName ?? "Candidate",
    targetRole: context.targetRole?.title ?? "Target role",
    promptVersion: context.promptVersion?.label ?? "Generated prompt",
    scorecard,
    summary,
    strengths: summary.strengths,
    growthAreas: summary.growthAreas,
    transcript,
    citations,
    rewrites,
    practicePlan,
  };
}

export function createReportService(store: ReportStore) {
  return {
    listReportOverviews(userId: string) {
      return store.listReportOverviews(userId);
    },

    getReportById(userId: string, reportId: string) {
      return store.getReportById(userId, reportId);
    },

    async generateAndStoreReport(
      userId: string,
      sessionId: string,
    ): Promise<GeneratedReportResult> {
      const context = await store.loadGenerationContext(userId, sessionId);

      if (!context) {
        throw new ReportServiceError("Session not found.", "not_found", 404);
      }

      if (context.session.status !== "completed") {
        throw new ReportServiceError(
          "Reports can only be generated after the session is completed.",
          "invalid_state",
          409,
        );
      }

      const report = buildGeneratedReport(context);
      await store.saveGeneratedReport(userId, context, report);

      return {
        report,
        status: context.report ? "updated" : "created",
      };
    },
  };
}

export type ReportService = ReturnType<typeof createReportService>;
