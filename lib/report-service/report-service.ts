import "server-only";

import { randomUUID } from "node:crypto";
import { format } from "date-fns";
import type {
  FeedbackReportRow,
  InterviewSessionRow,
  JobTargetRow,
  PracticePlanRow,
  ProfileRow,
  PromptVersionRow,
  ReportGenerationJobRow,
  ReportGenerationStatus,
  TargetRoleRow,
  TranscriptTurnRow,
} from "@/db/schema";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";
import {
  createReportEvaluatorForRuntime,
  type ReportEvaluation,
  type ReportEvaluator,
} from "@/lib/openai/report-evaluator";
import type { TranscriptTurn } from "@/lib/types/interview";

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
  getReportGenerationJobBySessionId?(
    userId: string,
    sessionId: string,
  ): Promise<ReportGenerationJobRow | null>;
  enqueueReportGenerationJob?(
    userId: string,
    sessionId: string,
  ): Promise<ReportGenerationJobRow>;
  claimReportGenerationJob?(input: {
    userId: string;
    sessionId: string;
    reportJobId?: string;
    attemptCount: number;
  }): Promise<ReportGenerationJobRow | null>;
  completeReportGenerationJob?(
    userId: string,
    sessionId: string,
    reportId: string,
  ): Promise<ReportGenerationJobRow>;
  failReportGenerationJob?(
    userId: string,
    sessionId: string,
    errorMessage: string,
  ): Promise<ReportGenerationJobRow>;
}

export type ReportServiceErrorCode =
  | "not_found"
  | "invalid_state"
  | "unavailable";

export type GeneratedReportStatus = "created" | "updated";

export interface GeneratedReportResult {
  report: InterviewReport;
  status: GeneratedReportStatus;
}

export interface ReportGenerationEventPayload {
  sessionId: string;
  userId: string;
  reportJobId?: string;
}

export interface ReportGenerationState {
  jobId: string;
  status: ReportGenerationStatus;
  reportId?: string;
  error?: string;
}

export interface ProcessQueuedReportInput {
  userId: string;
  sessionId: string;
  reportJobId?: string;
  attemptCount: number;
  maxAttempts?: number;
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

export interface ReportServiceOptions {
  evaluator?: ReportEvaluator;
  publishReportGenerationRequestedEvent?: (
    payload: ReportGenerationEventPayload,
  ) => Promise<void>;
  backgroundProcessingAvailable?: boolean;
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

function buildReportFromEvaluation(
  context: ReportGenerationContext,
  evaluation: ReportEvaluation,
): InterviewReport {
  return {
    id: context.report?.id ?? randomUUID(),
    title: context.session.title,
    sessionDate: formatSessionDate(context.session.endedAt ?? context.session.updatedAt),
    candidate: context.profile?.fullName ?? "Candidate",
    targetRole: context.targetRole?.title ?? "Target role",
    promptVersion: context.promptVersion?.label ?? "Generated prompt",
    scorecard: evaluation.scorecard,
    summary: evaluation.summary,
    strengths: [...evaluation.summary.strengths],
    growthAreas: [...evaluation.summary.growthAreas],
    transcript: toTranscriptTurns(context.transcript),
    citations: [...evaluation.citations],
    rewrites: [...evaluation.rewrites],
    practicePlan: {
      title: evaluation.practicePlan.title,
      focus: evaluation.practicePlan.focus,
      steps: evaluation.practicePlan.steps.map((step) => ({ ...step })),
    },
  };
}

function toInvalidStateError(message: string) {
  return new ReportServiceError(message, "invalid_state", 409);
}

function toNotFoundError() {
  return new ReportServiceError("Session not found.", "not_found", 404);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Report generation failed.";
}

function toReportGenerationState(job: ReportGenerationJobRow): ReportGenerationState {
  return {
    jobId: job.id,
    status: job.status,
    reportId: job.reportId ?? undefined,
    error: job.errorMessage ?? undefined,
  };
}

function requireJobStore(store: ReportStore) {
  if (
    !store.getReportGenerationJobBySessionId ||
    !store.enqueueReportGenerationJob ||
    !store.claimReportGenerationJob ||
    !store.completeReportGenerationJob ||
    !store.failReportGenerationJob
  ) {
    throw new Error("Report job store methods are not configured.");
  }

  return {
    getReportGenerationJobBySessionId: store.getReportGenerationJobBySessionId,
    enqueueReportGenerationJob: store.enqueueReportGenerationJob,
    claimReportGenerationJob: store.claimReportGenerationJob,
    completeReportGenerationJob: store.completeReportGenerationJob,
    failReportGenerationJob: store.failReportGenerationJob,
  };
}

export function createReportService(
  store: ReportStore,
  options: ReportServiceOptions = {},
) {
  let evaluator: ReportEvaluator | null = options.evaluator ?? null;
  const getJobStore = () => requireJobStore(store);
  const getEvaluator = () => {
    evaluator ??= createReportEvaluatorForRuntime();
    return evaluator;
  };
  const generateAndStoreReport = async (
    userId: string,
    sessionId: string,
  ): Promise<GeneratedReportResult> => {
    const context = await store.loadGenerationContext(userId, sessionId);

    if (!context) {
      throw toNotFoundError();
    }

    if (context.session.status !== "completed") {
      throw toInvalidStateError(
        "Reports can only be generated after the session is completed.",
      );
    }

    const evaluation = await getEvaluator().evaluate(context);
    const report = buildReportFromEvaluation(context, evaluation);
    await store.saveGeneratedReport(userId, context, report);

    return {
      report,
      status: context.report ? "updated" : "created",
    };
  };

  return {
    listReportOverviews(userId: string) {
      return store.listReportOverviews(userId);
    },

    getReportById(userId: string, reportId: string) {
      return store.getReportById(userId, reportId);
    },

    async getReportGenerationState(
      userId: string,
      sessionId: string,
    ): Promise<ReportGenerationState> {
      const context = await store.loadGenerationContext(userId, sessionId);

      if (!context) {
        throw toNotFoundError();
      }

      if (context.session.status !== "completed") {
        throw toInvalidStateError(
          "Reports can only be generated after the session is completed.",
        );
      }

      const jobStore = getJobStore();

      if (context.report) {
        const completedJob = await jobStore.completeReportGenerationJob(
          userId,
          sessionId,
          context.report.id,
        );
        return toReportGenerationState(completedJob);
      }

      const job = await jobStore.getReportGenerationJobBySessionId(userId, sessionId);

      if (!job) {
        throw new ReportServiceError(
          "Report generation has not been queued for this session.",
          "not_found",
          404,
        );
      }

      return toReportGenerationState(job);
    },

    async requestReportGeneration(
      userId: string,
      sessionId: string,
    ): Promise<ReportGenerationState> {
      const context = await store.loadGenerationContext(userId, sessionId);

      if (!context) {
        throw toNotFoundError();
      }

      if (context.session.status !== "completed") {
        throw toInvalidStateError(
          "Reports can only be generated after the session is completed.",
        );
      }

      const jobStore = getJobStore();

      if (context.report) {
        const completedJob = await jobStore.completeReportGenerationJob(
          userId,
          sessionId,
          context.report.id,
        );
        return toReportGenerationState(completedJob);
      }

      if (
        !options.backgroundProcessingAvailable ||
        !options.publishReportGenerationRequestedEvent
      ) {
        throw new ReportServiceError(
          "Report generation is unavailable until Inngest and OpenAI are configured.",
          "unavailable",
          503,
        );
      }

      const existingJob = await jobStore.getReportGenerationJobBySessionId(userId, sessionId);

      if (existingJob?.status === "running") {
        return toReportGenerationState(existingJob);
      }

      const queuedJob =
        existingJob?.status === "queued"
          ? existingJob
          : await jobStore.enqueueReportGenerationJob(userId, sessionId);

      await options.publishReportGenerationRequestedEvent({
        userId,
        sessionId,
        reportJobId: queuedJob.id,
      });

      return toReportGenerationState(
        existingJob?.status === "queued" ? existingJob : queuedJob,
      );
    },

    generateAndStoreReport,

    async processQueuedReportGeneration(
      input: ProcessQueuedReportInput,
    ): Promise<ReportGenerationState | null> {
      const jobStore = getJobStore();
      const claimedJob = await jobStore.claimReportGenerationJob({
        userId: input.userId,
        sessionId: input.sessionId,
        reportJobId: input.reportJobId,
        attemptCount: input.attemptCount,
      });

      if (!claimedJob) {
        const existingJob = await jobStore.getReportGenerationJobBySessionId(
          input.userId,
          input.sessionId,
        );

        if (existingJob?.status === "completed") {
          return toReportGenerationState(existingJob);
        }

        return null;
      }

      try {
        const result = await generateAndStoreReport(input.userId, input.sessionId);
        const completedJob = await jobStore.completeReportGenerationJob(
          input.userId,
          input.sessionId,
          result.report.id,
        );

        return toReportGenerationState(completedJob);
      } catch (error) {
        const isLastAttempt =
          typeof input.maxAttempts === "number"
            ? input.attemptCount >= input.maxAttempts
            : false;

        if (isLastAttempt) {
          await jobStore.failReportGenerationJob(
            input.userId,
            input.sessionId,
            getErrorMessage(error),
          );
        }

        throw error;
      }
    },
  };
}

export type ReportService = ReturnType<typeof createReportService>;
