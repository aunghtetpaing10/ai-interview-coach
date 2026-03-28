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

const MAX_REPORT_EVALUATION_TRANSCRIPT_TURNS = 24;
const MAX_REPORT_EVALUATION_TRANSCRIPT_CHARS = 12_000;
const MAX_REPORT_EVALUATION_CONTEXT_CHARS = 6_000;

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

type ReportEvaluationContextSectionKey =
  | "profile"
  | "targetRole"
  | "jobTarget"
  | "promptVersion";

interface ReportEvaluationContextSection {
  key: ReportEvaluationContextSectionKey;
  text: string;
}

interface ReportEvaluationContextTruncationSection {
  key: ReportEvaluationContextSectionKey;
  originalCharCount: number;
  retainedCharCount: number;
  truncated: boolean;
}

interface ReportEvaluationTranscriptTruncation {
  maxTurnCount: number;
  maxCharCount: number;
  originalTurnCount: number;
  retainedTurnCount: number;
  originalCharCount: number;
  retainedCharCount: number;
  droppedTurnCount: number;
  droppedCharCount: number;
  keptOpeningTurnId: string | null;
  keptTurnIds: string[];
  openingPromptTruncated: boolean;
}

interface ReportEvaluationContextTruncation {
  maxCharCount: number;
  originalCharCount: number;
  retainedCharCount: number;
  sectionCount: number;
  sections: ReportEvaluationContextTruncationSection[];
}

interface ReportEvaluationModelPayload {
  session: {
    id: string;
    title: string;
    mode: ReportGenerationContext["session"]["mode"];
    overallScore: ReportGenerationContext["session"]["overallScore"];
    durationSeconds: number;
  };
  context: {
    sections: ReportEvaluationContextSection[];
  };
  transcript: Array<{
    id: string;
    speaker: TranscriptTurn["speaker"];
    text: string;
    seconds: number;
    confidence: number;
  }>;
  truncation: {
    transcript: ReportEvaluationTranscriptTruncation;
    context: ReportEvaluationContextTruncation;
  };
}

function normalizeScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildTranscriptTurns<T extends { id: string; speaker: TranscriptTurn["speaker"]; text: string; timestampSeconds: number }>(
  turns: readonly T[],
): T[] {
  return turns.map((turn) => ({ ...turn }));
}

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return {
      text: value,
      charCount: value.length,
      truncated: false,
    };
  }

  if (maxChars <= 0) {
    return {
      text: "",
      charCount: 0,
      truncated: true,
    };
  }

  if (maxChars <= 3) {
    return {
      text: ".".repeat(maxChars),
      charCount: maxChars,
      truncated: true,
    };
  }

  return {
    text: `${value.slice(0, maxChars - 3)}...`,
    charCount: maxChars,
    truncated: true,
  };
}

function buildEvaluationContextSections(context: ReportGenerationContext): ReportEvaluationContextSection[] {
  const sections: ReportEvaluationContextSection[] = [];

  if (context.profile) {
    sections.push({
      key: "profile",
      text: [
        "Profile",
        `Name: ${context.profile.fullName}`,
        `Headline: ${context.profile.headline}`,
        `Target role: ${context.profile.targetRole}`,
      ].join("\n"),
    });
  }

  if (context.targetRole) {
    sections.push({
      key: "targetRole",
      text: [
        "Target role",
        `Title: ${context.targetRole.title}`,
        `Company type: ${context.targetRole.companyType}`,
        `Level: ${context.targetRole.level}`,
        `Focus areas: ${(context.targetRole.focusAreas ?? []).join(", ") || "None listed"}`,
      ].join("\n"),
    });
  }

  if (context.jobTarget) {
    sections.push({
      key: "jobTarget",
      text: [
        "Job target",
        `Company: ${context.jobTarget.companyName}`,
        `Title: ${context.jobTarget.jobTitle}`,
        `URL: ${context.jobTarget.jobUrl}`,
        `Description: ${context.jobTarget.jobDescription}`,
      ].join("\n"),
    });
  }

  if (context.promptVersion) {
    sections.push({
      key: "promptVersion",
      text: [
        "Prompt version",
        `Label: ${context.promptVersion.label}`,
        `Model: ${context.promptVersion.model}`,
        `Notes: ${context.promptVersion.notes ?? "None"}`,
      ].join("\n"),
    });
  }

  return sections;
}

function buildBudgetedContextSections(sections: readonly ReportEvaluationContextSection[]) {
  const budgetedSections: ReportEvaluationContextSection[] = [];
  const truncationSections: ReportEvaluationContextTruncationSection[] = [];
  let remainingChars = MAX_REPORT_EVALUATION_CONTEXT_CHARS;
  let originalCharCount = 0;
  let retainedCharCount = 0;

  for (const section of sections) {
    originalCharCount += section.text.length;

    if (remainingChars <= 0) {
      truncationSections.push({
        key: section.key,
        originalCharCount: section.text.length,
        retainedCharCount: 0,
        truncated: true,
      });
      continue;
    }

    const budgetedSection = truncateText(section.text, remainingChars);

    budgetedSections.push({
      key: section.key,
      text: budgetedSection.text,
    });
    truncationSections.push({
      key: section.key,
      originalCharCount: section.text.length,
      retainedCharCount: budgetedSection.charCount,
      truncated: budgetedSection.truncated,
    });
    remainingChars -= budgetedSection.charCount;
    retainedCharCount += budgetedSection.charCount;
  }

  return {
    sections: budgetedSections,
    truncation: {
      maxCharCount: MAX_REPORT_EVALUATION_CONTEXT_CHARS,
      originalCharCount,
      retainedCharCount,
      sectionCount: budgetedSections.length,
      sections: truncationSections,
    },
  };
}

function buildBudgetedTranscriptTurns<T extends { id: string; speaker: TranscriptTurn["speaker"]; text: string; timestampSeconds: number }>(
  turns: readonly T[],
) {
  if (turns.length === 0) {
    return {
      turns: [] as T[],
      truncation: {
        maxTurnCount: MAX_REPORT_EVALUATION_TRANSCRIPT_TURNS,
        maxCharCount: MAX_REPORT_EVALUATION_TRANSCRIPT_CHARS,
        originalTurnCount: 0,
        retainedTurnCount: 0,
        originalCharCount: 0,
        retainedCharCount: 0,
        droppedTurnCount: 0,
        droppedCharCount: 0,
        keptOpeningTurnId: null,
        keptTurnIds: [] as string[],
        openingPromptTruncated: false,
      },
    };
  }

  const openingTurn = turns[0];
  const tailTurns = turns.slice(1);
  const maxTailTurns = Math.max(0, MAX_REPORT_EVALUATION_TRANSCRIPT_TURNS - 1);
  let retainedTailCount = Math.min(tailTurns.length, maxTailTurns);

  while (retainedTailCount > 0) {
    const candidate = [openingTurn, ...tailTurns.slice(-retainedTailCount)];
    const candidateCharCount = candidate.reduce((sum, turn) => sum + turn.text.length, 0);

    if (candidateCharCount <= MAX_REPORT_EVALUATION_TRANSCRIPT_CHARS) {
      break;
    }

    retainedTailCount -= 1;
  }

  const retainedTailTurns = retainedTailCount > 0 ? tailTurns.slice(-retainedTailCount) : [];
  const selectedTurns = [openingTurn, ...retainedTailTurns];
  const originalCharCount = turns.reduce((sum, turn) => sum + turn.text.length, 0);
  const openingPromptTruncated = openingTurn.text.length > MAX_REPORT_EVALUATION_TRANSCRIPT_CHARS;

  const budgetedOpeningTurn = openingPromptTruncated
    ? {
        ...openingTurn,
        text: truncateText(
          openingTurn.text,
          Math.max(
            0,
            MAX_REPORT_EVALUATION_TRANSCRIPT_CHARS -
              retainedTailTurns.reduce((sum, turn) => sum + turn.text.length, 0),
          ),
        ).text,
      }
    : openingTurn;

  const budgetedTurns = [budgetedOpeningTurn, ...selectedTurns.slice(1)];
  const budgetedCharCount = budgetedTurns.reduce((sum, turn) => sum + turn.text.length, 0);

  return {
    turns: budgetedTurns,
    truncation: {
      maxTurnCount: MAX_REPORT_EVALUATION_TRANSCRIPT_TURNS,
      maxCharCount: MAX_REPORT_EVALUATION_TRANSCRIPT_CHARS,
      originalTurnCount: turns.length,
      retainedTurnCount: budgetedTurns.length,
      originalCharCount,
      retainedCharCount: budgetedCharCount,
      droppedTurnCount: turns.length - budgetedTurns.length,
      droppedCharCount: originalCharCount - budgetedCharCount,
      keptOpeningTurnId: budgetedTurns[0]?.id ?? null,
      keptTurnIds: budgetedTurns.map((turn) => turn.id),
      openingPromptTruncated,
    },
  };
}

function buildReportEvaluationPayload(context: ReportGenerationContext): ReportEvaluationModelPayload {
  const transcript = buildTranscriptTurns(
    context.transcript.map((turn) => ({
      id: turn.id,
      speaker: turn.speaker,
      text: turn.body,
      timestampSeconds: turn.seconds,
      confidence: turn.confidence,
    })),
  );
  const budgetedTranscript = buildBudgetedTranscriptTurns(transcript);
  const budgetedContext = buildBudgetedContextSections(buildEvaluationContextSections(context));

  return {
    session: {
      id: context.session.id,
      title: context.session.title,
      mode: context.session.mode,
      overallScore: context.session.overallScore,
      durationSeconds: context.session.durationSeconds,
    },
    context: {
      sections: budgetedContext.sections,
    },
    transcript: budgetedTranscript.turns.map((turn) => ({
      id: turn.id,
      speaker: turn.speaker,
      text: turn.text,
      seconds: turn.timestampSeconds,
      confidence: turn.confidence,
    })),
    truncation: {
      transcript: budgetedTranscript.truncation,
      context: budgetedContext.truncation,
    },
  };
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

function createOpenAIClient(apiKey: string) {
  const openAIClientFactory = OpenAI as unknown as {
    new (options: { apiKey: string }): OpenAI;
    (options: { apiKey: string }): OpenAI;
  };

  try {
    return new openAIClientFactory({ apiKey });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (!errorMessage.toLowerCase().includes("not a constructor")) {
      throw error;
    }

    return openAIClientFactory({ apiKey });
  }
}

export function createOpenAIResponsesReportEvaluator(
  config: OpenAIResponsesReportEvaluatorConfig,
): ReportEvaluator {
  const client = createOpenAIClient(config.apiKey);

  return {
    async evaluate(context: ReportGenerationContext) {
      const payload = buildReportEvaluationPayload(context);
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
            content: JSON.stringify(payload, null, 2),
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
