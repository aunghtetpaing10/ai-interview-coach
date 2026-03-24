import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getEnv, isE2EDemoMode } from "@/lib/env";
import { buildCitationBlocks, generatePracticePlan, rewriteAnswerDraft, summarizeScorecard } from "@/lib/reporting/reporting";
import type {
  AnswerRewrite,
  ScorecardSummary,
} from "@/lib/reporting/types";
import type { ReportGenerationContext } from "@/lib/report-service/report-service";
import type { Scorecard } from "@/lib/types/interview";
import type { TranscriptTurn } from "@/lib/types/interview";

const scoreBandSchema = z.enum(["ready", "strong", "steady", "watch"]);

const scorecardSchema = z.object({
  mode: z.enum(["behavioral", "resume", "project", "system-design"]),
  overallScore: z.number().int().min(0).max(100),
  competencies: z.object({
    clarity: z.number().int().min(0).max(100),
    ownership: z.number().int().min(0).max(100),
    "technical-depth": z.number().int().min(0).max(100),
    communication: z.number().int().min(0).max(100),
    "systems-thinking": z.number().int().min(0).max(100),
  }),
});

const scorecardSummarySchema = z.object({
  score: z.number().int().min(0).max(100),
  band: scoreBandSchema,
  headline: z.string().min(1),
  strengths: z.array(z.string().min(1)).default([]),
  growthAreas: z.array(z.string().min(1)).default([]),
});

const citationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  speaker: z.enum(["interviewer", "candidate"]),
  timestamp: z.string().min(1),
  quote: z.string().min(1),
  insight: z.string().min(1),
  emphasis: z.enum(["strength", "gap", "probe"]),
});

const answerRewriteSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  stronger: z.string().min(1),
  whyItWorks: z.string().min(1),
  evidence: z.string().min(1),
});

const practicePlanSchema = z.object({
  title: z.string().min(1),
  focus: z.string().min(1),
  steps: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      minutes: z.number().int().min(1),
      drill: z.string().min(1),
      outcome: z.string().min(1),
    }),
  ),
});

export const reportEvaluationSchema = z.object({
  scorecard: scorecardSchema,
  summary: scorecardSummarySchema,
  citations: z.array(citationSchema),
  rewrites: z.array(answerRewriteSchema),
  practicePlan: practicePlanSchema,
});

export type ReportEvaluation = z.infer<typeof reportEvaluationSchema>;

export interface ReportEvaluator {
  evaluate(context: ReportGenerationContext): Promise<ReportEvaluation>;
}

export interface OpenAIResponsesReportEvaluatorConfig {
  apiKey: string;
  model: string;
}

function normalizeScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildTranscriptTurns(turns: readonly TranscriptTurn[]): TranscriptTurn[] {
  return turns.map((turn) => ({ ...turn }));
}

function buildGeneratedScorecard(
  session: ReportGenerationContext["session"],
  transcript: ReadonlyArray<TranscriptTurn>,
): Scorecard {
  const candidateTurnCount = transcript.filter((turn) => turn.speaker === "candidate").length;
  const baseScore = normalizeScore(
    session.overallScore ?? 68 + candidateTurnCount * 2 + (session.mode === "system-design" ? 4 : 0),
  );

  return {
    mode: session.mode,
    overallScore: baseScore,
    competencies: {
      clarity: normalizeScore(baseScore + 1),
      ownership: normalizeScore(baseScore - 4),
      "technical-depth": normalizeScore(
        baseScore + (session.mode === "system-design" ? 6 : session.mode === "project" ? 4 : 2),
      ),
      communication: normalizeScore(baseScore - 1),
      "systems-thinking": normalizeScore(baseScore - 2),
    },
  };
}

function buildCitationSignals(
  transcript: ReadonlyArray<TranscriptTurn>,
  scorecardSummary: ScorecardSummary,
) {
  const candidateTurns = transcript.filter((turn) => turn.speaker === "candidate");
  const interviewerTurns = transcript.filter((turn) => turn.speaker === "interviewer");
  const signals: Array<{ turnId: string; emphasis: "strength" | "gap" | "probe"; insight: string }> =
    [];

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
  summary: ScorecardSummary,
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

function evaluateDeterministically(context: ReportGenerationContext): ReportEvaluation {
  const transcript = buildTranscriptTurns(
    context.transcript.map((turn) => ({
      id: turn.id,
      speaker: turn.speaker,
      text: turn.body,
      timestampSeconds: turn.seconds,
    })),
  );
  const scorecard = buildGeneratedScorecard(context.session, transcript);
  const summary = summarizeScorecard(scorecard);
  const practicePlan = generatePracticePlan({
    targetRole: context.targetRole?.title ?? "Interview candidate",
    scorecard,
    summary,
    focusAreas: summary.growthAreas,
  });

  return {
    scorecard,
    summary,
    citations: buildCitationBlocks(transcript, buildCitationSignals(transcript, summary)),
    rewrites: buildRewrites(transcript, summary),
    practicePlan,
  };
}

export function createDeterministicReportEvaluator(): ReportEvaluator {
  return {
    async evaluate(context: ReportGenerationContext) {
      return evaluateDeterministically(context);
    },
  };
}

export function createOpenAIResponsesReportEvaluator(
  config: OpenAIResponsesReportEvaluatorConfig,
): ReportEvaluator {
  const client = new OpenAI({
    apiKey: config.apiKey,
  });

  return {
    async evaluate(context: ReportGenerationContext) {
      const response = await client.responses.parse({
        model: config.model,
        input: [
          {
            role: "system",
            content:
              "You evaluate interview performance. Return concise, grounded analysis as strict JSON only.",
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                session: {
                  id: context.session.id,
                  title: context.session.title,
                  mode: context.session.mode,
                  overallScore: context.session.overallScore,
                  durationSeconds: context.session.durationSeconds,
                },
                profile: context.profile
                  ? {
                      fullName: context.profile.fullName,
                      headline: context.profile.headline,
                      targetRole: context.profile.targetRole,
                    }
                  : null,
                targetRole: context.targetRole
                  ? {
                      title: context.targetRole.title,
                      companyType: context.targetRole.companyType,
                      level: context.targetRole.level,
                      focusAreas: context.targetRole.focusAreas ?? [],
                    }
                  : null,
                transcript: context.transcript.map((turn) => ({
                  id: turn.id,
                  speaker: turn.speaker,
                  text: turn.body,
                  seconds: turn.seconds,
                  confidence: turn.confidence,
                })),
                promptVersion: context.promptVersion
                  ? {
                      label: context.promptVersion.label,
                      model: context.promptVersion.model,
                      notes: context.promptVersion.notes,
                    }
                  : null,
              },
              null,
              2,
            ),
          },
        ],
        text: {
          format: zodTextFormat(reportEvaluationSchema, "report_evaluation"),
        },
      });

      if (!response.output_parsed) {
        throw new Error("OpenAI Responses did not return a parsed report evaluation.");
      }

      return response.output_parsed;
    },
  };
}

export function createReportEvaluatorForRuntime(): ReportEvaluator {
  const env = getEnv();

  if (isE2EDemoMode() || env.NODE_ENV === "test") {
    return createDeterministicReportEvaluator();
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for report generation.");
  }

  return createOpenAIResponsesReportEvaluator({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_RESPONSES_MODEL,
  });
}
