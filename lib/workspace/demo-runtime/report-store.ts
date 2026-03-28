import "server-only";

import type {
  FeedbackReportRow,
  PracticePlanRow,
  ReportArtifactEnvelope,
  ReportGenerationJobRow,
} from "@/db/schema";
import type { ReportGenerationContext, ReportJobStore, ReportStore } from "@/lib/report-service/report-service";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";
import { clone, demoRuntime, DEMO_PROMPT_VERSION, DEMO_USER } from "./state";

function toReportArtifactEnvelope(report: InterviewReport): ReportArtifactEnvelope {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: "runtime",
    report,
  };
}

export function createDemoReportStore(): ReportStore & ReportJobStore {
  return {
    listReportOverviews: async (userId: string) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id) {
        return [];
      }

      return [...state.reportsById.values()]
        .sort(
          (left, right) =>
            right.reportRow.createdAt.getTime() - left.reportRow.createdAt.getTime(),
        )
        .map(({ report }) => ({
          id: report.id,
          title: report.title,
          sessionDate: report.sessionDate,
          candidate: report.candidate,
          targetRole: report.targetRole,
          promptVersion: report.promptVersion,
          scorecard: clone(report.scorecard),
          summary: clone(report.summary),
          strengths: [...report.strengths],
          growthAreas: [...report.growthAreas],
        })) satisfies ReportOverview[];
    },
    getReportById: async (userId: string, reportId: string) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id) {
        return null;
      }

      const record = state.reportsById.get(reportId);
      return record ? clone(record.report) : null;
    },
    loadGenerationContext: async (userId: string, sessionId: string) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id) {
        return null;
      }

      const session = state.sessions.find((candidate) => candidate.id === sessionId);

      if (!session) {
        return null;
      }

      const reportRecord = demoRuntime.findReportBySessionId(state, session.id);
      const transcript = state.transcriptTurnsBySessionId.get(session.id) ?? [];

      return {
        session: clone(session),
        profile: clone(state.profile),
        targetRole: clone(state.targetRole),
        jobTarget: clone(state.jobTarget),
        promptVersion: clone(DEMO_PROMPT_VERSION),
        transcript: clone(transcript),
        report: reportRecord ? clone(reportRecord.reportRow) : null,
        practicePlan: reportRecord ? clone(reportRecord.practicePlan) : null,
      } satisfies ReportGenerationContext;
    },
    saveGeneratedReport: async (
      userId: string,
      context: ReportGenerationContext,
      report,
    ) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id) {
        throw new Error("Session not found while saving the generated report.");
      }

      const session = state.sessions.find((candidate) => candidate.id === context.session.id);

      if (!session) {
        throw new Error("Session not found while saving the generated report.");
      }

      const existingReportId = state.reportIdBySessionId.get(session.id);
      const existing = existingReportId ? state.reportsById.get(existingReportId) ?? null : null;
      const reportId = existing?.reportRow.id ?? `demo-report-${session.id}`;
      const createdAt = existing?.reportRow.createdAt ?? demoRuntime.advanceTime(state);
      const practicePlanId = existing?.practicePlan.id ?? `demo-practice-plan-${session.id}`;
      const planSteps = report.practicePlan.steps.map((step) => ({
        title: step.title,
        description: `${step.drill} ${step.outcome}`.trim(),
        length: `${step.minutes} min`,
      }));

      report.id = reportId;

      const reportRow: FeedbackReportRow = {
        id: reportId,
        sessionId: session.id,
        promptVersionId: context.promptVersion?.id ?? null,
        summary: report.summary.headline,
        scorecard: report.scorecard,
        strengths: [...report.strengths],
        gaps: [...report.growthAreas],
        citations: [...report.citations],
        rewrites: [...report.rewrites],
        artifact: toReportArtifactEnvelope(clone(report)),
        createdAt,
      };
      const practicePlan: PracticePlanRow = {
        id: practicePlanId,
        sessionId: session.id,
        title: report.practicePlan.title,
        focus: report.practicePlan.focus,
        steps: planSteps,
        createdAt,
      };

      state.reportsById.set(reportId, {
        reportRow,
        report: clone(report),
        practicePlan,
      });
      state.reportIdBySessionId.set(session.id, reportId);
      demoRuntime.writeState(state);

      return clone(report);
    },
    getReportGenerationJobBySessionId: async (userId: string, sessionId: string) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id) {
        return null;
      }

      const job = state.reportJobsBySessionId.get(sessionId);
      return job ? clone(job) : null;
    },
    enqueueReportGenerationJob: async (userId: string, sessionId: string) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id) {
        throw new Error("Session not found while queueing report generation.");
      }

      const session = state.sessions.find((candidate) => candidate.id === sessionId);

      if (!session) {
        throw new Error("Session not found while queueing report generation.");
      }

      const now = demoRuntime.advanceTime(state);
      const existingJob = state.reportJobsBySessionId.get(sessionId);
      const job: ReportGenerationJobRow = {
        id: existingJob?.id ?? `demo-report-job-${sessionId}`,
        sessionId,
        userId,
        status: "queued",
        reportId: null,
        errorMessage: null,
        attemptCount: 0,
        queuedAt: now,
        startedAt: null,
        finishedAt: null,
        createdAt: existingJob?.createdAt ?? now,
        updatedAt: now,
      };

      state.reportJobsBySessionId.set(sessionId, job);
      demoRuntime.writeState(state);

      return clone(job);
    },
    claimReportGenerationJob: async (input) => {
      const state = demoRuntime.readState();

      if (input.userId !== DEMO_USER.id) {
        return null;
      }

      const session = state.sessions.find((candidate) => candidate.id === input.sessionId);

      if (!session) {
        return null;
      }

      const job = state.reportJobsBySessionId.get(input.sessionId);

      if (!job) {
        return null;
      }

      if (input.reportJobId && job.id !== input.reportJobId) {
        return null;
      }

      if (job.status === "completed" || job.status === "failed") {
        return null;
      }

      if (job.status === "running" && job.attemptCount >= input.attemptCount) {
        return null;
      }

      const now = demoRuntime.advanceTime(state);
      const updatedJob: ReportGenerationJobRow = {
        ...job,
        status: "running",
        attemptCount: input.attemptCount,
        startedAt: job.startedAt ?? now,
        finishedAt: null,
        errorMessage: null,
        updatedAt: now,
      };

      state.reportJobsBySessionId.set(input.sessionId, updatedJob);
      demoRuntime.writeState(state);

      return clone(updatedJob);
    },
    completeReportGenerationJob: async (
      userId: string,
      sessionId: string,
      reportId: string,
    ) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id) {
        throw new Error("Session not found while completing report generation.");
      }

      const session = state.sessions.find((candidate) => candidate.id === sessionId);

      if (!session) {
        throw new Error("Session not found while completing report generation.");
      }

      const now = demoRuntime.advanceTime(state);
      const existingJob = state.reportJobsBySessionId.get(sessionId);
      const completedJob: ReportGenerationJobRow = {
        id: existingJob?.id ?? `demo-report-job-${sessionId}`,
        sessionId,
        userId,
        status: "completed",
        reportId,
        errorMessage: null,
        attemptCount: existingJob?.attemptCount ?? 0,
        queuedAt: existingJob?.queuedAt ?? now,
        startedAt: existingJob?.startedAt ?? now,
        finishedAt: now,
        createdAt: existingJob?.createdAt ?? now,
        updatedAt: now,
      };

      state.reportJobsBySessionId.set(sessionId, completedJob);
      demoRuntime.writeState(state);

      return clone(completedJob);
    },
    failReportGenerationJob: async (
      userId: string,
      sessionId: string,
      errorMessage: string,
    ) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id) {
        throw new Error("Session not found while failing report generation.");
      }

      const session = state.sessions.find((candidate) => candidate.id === sessionId);

      if (!session) {
        throw new Error("Session not found while failing report generation.");
      }

      const now = demoRuntime.advanceTime(state);
      const existingJob = state.reportJobsBySessionId.get(sessionId);
      const failedJob: ReportGenerationJobRow = {
        id: existingJob?.id ?? `demo-report-job-${sessionId}`,
        sessionId,
        userId,
        status: "failed",
        reportId: existingJob?.reportId ?? null,
        errorMessage,
        attemptCount: existingJob?.attemptCount ?? 0,
        queuedAt: existingJob?.queuedAt ?? now,
        startedAt: existingJob?.startedAt ?? now,
        finishedAt: now,
        createdAt: existingJob?.createdAt ?? now,
        updatedAt: now,
      };

      state.reportJobsBySessionId.set(sessionId, failedJob);
      demoRuntime.writeState(state);

      return clone(failedJob);
    },
  };
}
