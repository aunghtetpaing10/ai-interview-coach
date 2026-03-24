import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { INTERVIEW_SEED } from "@/db/seed";
import type {
  FeedbackReportRow,
  InterviewMode,
  InterviewSessionRow,
  JobTargetRow,
  PracticePlanRow,
  ProfileRow,
  PromptVersionRow,
  ReportGenerationJobRow,
  ResumeAssetRow,
  TargetRoleRow,
  TranscriptTurnRow,
} from "@/db/schema";
import type { WorkspaceUser } from "@/lib/auth/session";
import { deriveActiveMode } from "@/lib/data/active-mode";
import type { InterviewDataRepository, WorkspaceSnapshot } from "@/lib/data/repository";
import { createDemoOnboardingDraft } from "@/lib/intake/summary";
import type { OnboardingDraft } from "@/lib/intake/types";
import type { ProgressSession } from "@/lib/analytics/progress";
import type { ProgressStore } from "@/lib/progress-service/progress-service";
import type {
  ReportGenerationContext,
  ReportStore,
} from "@/lib/report-service/report-service";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";
import type {
  CompleteInterviewSessionInput,
  InterviewSessionStore,
} from "@/lib/session-service/session-service";
import { SessionServiceError } from "@/lib/session-service/session-service";

const DEMO_USER: WorkspaceUser = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "aung.htet.paing@example.com",
  source: "demo",
};

const DEMO_BASE_TIME = new Date("2026-03-19T09:00:00.000Z");
const DEMO_PROMPT_VERSION: PromptVersionRow | null = (() => {
  const latestPromptVersion = INTERVIEW_SEED.promptVersions.at(-1);

  return latestPromptVersion
    ? {
        ...latestPromptVersion,
        publishedAt: nextTimestamp(0),
      }
    : null;
})();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nextTimestamp(minutes: number) {
  return new Date(DEMO_BASE_TIME.getTime() + minutes * 60_000);
}

function normalizeFileName(value: string) {
  return value.trim() || "resume.txt";
}

function buildDemoFullName(email: string | null) {
  return email ? "Aung Htet Paing" : "Interview Coach Candidate";
}

function buildProfile(email: string | null, draft: OnboardingDraft, now: Date): ProfileRow {
  return {
    id: "demo-profile-1",
    userId: DEMO_USER.id,
    fullName: buildDemoFullName(email),
    headline: `${draft.seniority} ${draft.roleTitle}`.trim(),
    targetRole: draft.roleTitle,
    createdAt: now,
    updatedAt: now,
  };
}

function buildTargetRole(draft: OnboardingDraft, now: Date): TargetRoleRow {
  return {
    id: "demo-target-role-1",
    userId: DEMO_USER.id,
    title: draft.roleTitle,
    companyType: draft.companyType,
    level: draft.seniority,
    focusAreas: [...draft.focusAreas],
    active: true,
    createdAt: now,
  };
}

function buildJobTarget(
  draft: OnboardingDraft,
  targetRoleId: string,
  now: Date,
): JobTargetRow {
  return {
    id: "demo-job-target-1",
    userId: DEMO_USER.id,
    targetRoleId,
    companyName: draft.companyName,
    jobTitle: draft.jobTitle,
    jobUrl: draft.jobUrl,
    jobDescription: draft.jobDescription,
    createdAt: now,
    updatedAt: now,
  };
}

function buildResumeAsset(
  userId: string,
  draft: OnboardingDraft,
  file: File | null,
  now: Date,
): ResumeAssetRow | null {
  if (draft.resumePreview.source === "none") {
    return null;
  }

  const fileName = normalizeFileName(file?.name ?? draft.resumePreview.fileName);

  return {
    id: "demo-resume-1",
    userId,
    fileName,
    storagePath: `demo/${userId}/${fileName}`,
    mimeType: file?.type || "text/plain",
    summary: draft.resumeNotes || draft.resumePreview.summary,
    uploadedAt: now,
  };
}

function buildQuestionPreview(mode?: InterviewMode) {
  return mode
    ? INTERVIEW_SEED.questionBank.filter((question) => question.mode === mode)
    : INTERVIEW_SEED.questionBank;
}

type DemoReportRecord = {
  reportRow: FeedbackReportRow;
  report: InterviewReport;
  practicePlan: PracticePlanRow;
};

type DemoWorkspaceState = {
  draft: OnboardingDraft;
  profile: ProfileRow;
  targetRole: TargetRoleRow;
  jobTarget: JobTargetRow;
  resumeAsset: ResumeAssetRow | null;
  sessions: InterviewSessionRow[];
  transcriptTurnsBySessionId: Map<string, TranscriptTurnRow[]>;
  reportJobsBySessionId: Map<string, ReportGenerationJobRow>;
  reportsById: Map<string, DemoReportRecord>;
  reportIdBySessionId: Map<string, string>;
  nextSessionNumber: number;
  clockTick: number;
};

type SerializedDemoWorkspaceState = {
  draft: OnboardingDraft;
  profile: Omit<ProfileRow, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  };
  targetRole: Omit<TargetRoleRow, "createdAt"> & {
    createdAt: string;
  };
  jobTarget: Omit<JobTargetRow, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  };
  resumeAsset: (Omit<ResumeAssetRow, "uploadedAt"> & {
    uploadedAt: string;
  }) | null;
  sessions: Array<
    Omit<
      InterviewSessionRow,
      "createdAt" | "updatedAt" | "startedAt" | "endedAt"
    > & {
      createdAt: string;
      updatedAt: string;
      startedAt: string | null;
      endedAt: string | null;
    }
  >;
  transcriptTurnsBySessionId: Array<
    [
      string,
      Array<
        Omit<TranscriptTurnRow, "createdAt"> & {
          createdAt: string;
        }
      >,
    ]
  >;
  reportJobsBySessionId: Array<
    [
      string,
      Omit<
        ReportGenerationJobRow,
        "queuedAt" | "startedAt" | "finishedAt" | "createdAt" | "updatedAt"
      > & {
        queuedAt: string;
        startedAt: string | null;
        finishedAt: string | null;
        createdAt: string;
        updatedAt: string;
      },
    ]
  >;
  reportsById: Array<
    [
      string,
      {
        reportRow: Omit<FeedbackReportRow, "createdAt"> & {
          createdAt: string;
        };
        report: InterviewReport;
        practicePlan: Omit<PracticePlanRow, "createdAt"> & {
          createdAt: string;
        };
      },
    ]
  >;
  reportIdBySessionId: Array<[string, string]>;
  nextSessionNumber: number;
  clockTick: number;
};

function createInitialState(): DemoWorkspaceState {
  const draft = createDemoOnboardingDraft();
  const now = nextTimestamp(0);

  return {
    draft,
    profile: buildProfile(DEMO_USER.email, draft, now),
    targetRole: buildTargetRole(draft, now),
    jobTarget: buildJobTarget(draft, "demo-target-role-1", now),
    resumeAsset: buildResumeAsset(DEMO_USER.id, draft, null, now),
    sessions: [],
    transcriptTurnsBySessionId: new Map(),
    reportJobsBySessionId: new Map(),
    reportsById: new Map(),
    reportIdBySessionId: new Map(),
    nextSessionNumber: 1,
    clockTick: 1,
  };
}

function getDemoRuntimeStatePath() {
  return process.env.E2E_DEMO_STATE_PATH ?? join(".next", "cache", "e2e-demo-runtime.json");
}

function serializeSession(session: InterviewSessionRow) {
  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
  };
}

function deserializeSession(
  session: SerializedDemoWorkspaceState["sessions"][number],
): InterviewSessionRow {
  return {
    ...session,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
    startedAt: session.startedAt ? new Date(session.startedAt) : null,
    endedAt: session.endedAt ? new Date(session.endedAt) : null,
  };
}

function serializeTranscriptTurn(turn: TranscriptTurnRow) {
  return {
    ...turn,
    createdAt: turn.createdAt.toISOString(),
  };
}

function deserializeTranscriptTurn(
  turn: SerializedDemoWorkspaceState["transcriptTurnsBySessionId"][number][1][number],
): TranscriptTurnRow {
  return {
    ...turn,
    createdAt: new Date(turn.createdAt),
  };
}

function serializeReportGenerationJob(job: ReportGenerationJobRow) {
  return {
    ...job,
    queuedAt: job.queuedAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function deserializeReportGenerationJob(
  job: SerializedDemoWorkspaceState["reportJobsBySessionId"][number][1],
): ReportGenerationJobRow {
  return {
    ...job,
    queuedAt: new Date(job.queuedAt),
    startedAt: job.startedAt ? new Date(job.startedAt) : null,
    finishedAt: job.finishedAt ? new Date(job.finishedAt) : null,
    createdAt: new Date(job.createdAt),
    updatedAt: new Date(job.updatedAt),
  };
}

function serializeProfile(profile: ProfileRow) {
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function deserializeProfile(profile: SerializedDemoWorkspaceState["profile"]): ProfileRow {
  return {
    ...profile,
    createdAt: new Date(profile.createdAt),
    updatedAt: new Date(profile.updatedAt),
  };
}

function serializeTargetRole(targetRole: TargetRoleRow) {
  return {
    ...targetRole,
    createdAt: targetRole.createdAt.toISOString(),
  };
}

function deserializeTargetRole(
  targetRole: SerializedDemoWorkspaceState["targetRole"],
): TargetRoleRow {
  return {
    ...targetRole,
    createdAt: new Date(targetRole.createdAt),
  };
}

function serializeJobTarget(jobTarget: JobTargetRow) {
  return {
    ...jobTarget,
    createdAt: jobTarget.createdAt.toISOString(),
    updatedAt: jobTarget.updatedAt.toISOString(),
  };
}

function deserializeJobTarget(
  jobTarget: SerializedDemoWorkspaceState["jobTarget"],
): JobTargetRow {
  return {
    ...jobTarget,
    createdAt: new Date(jobTarget.createdAt),
    updatedAt: new Date(jobTarget.updatedAt),
  };
}

function serializeResumeAsset(resumeAsset: ResumeAssetRow | null) {
  if (!resumeAsset) {
    return null;
  }

  return {
    ...resumeAsset,
    uploadedAt: resumeAsset.uploadedAt.toISOString(),
  };
}

function deserializeResumeAsset(
  resumeAsset: SerializedDemoWorkspaceState["resumeAsset"],
): ResumeAssetRow | null {
  if (!resumeAsset) {
    return null;
  }

  return {
    ...resumeAsset,
    uploadedAt: new Date(resumeAsset.uploadedAt),
  };
}

function serializeReportRow(reportRow: FeedbackReportRow) {
  return {
    ...reportRow,
    createdAt: reportRow.createdAt.toISOString(),
  };
}

function deserializeReportRow(
  reportRow: SerializedDemoWorkspaceState["reportsById"][number][1]["reportRow"],
): FeedbackReportRow {
  return {
    ...reportRow,
    createdAt: new Date(reportRow.createdAt),
  };
}

function serializePracticePlan(practicePlan: PracticePlanRow) {
  return {
    ...practicePlan,
    createdAt: practicePlan.createdAt.toISOString(),
  };
}

function deserializePracticePlan(
  practicePlan: SerializedDemoWorkspaceState["reportsById"][number][1]["practicePlan"],
): PracticePlanRow {
  return {
    ...practicePlan,
    createdAt: new Date(practicePlan.createdAt),
  };
}

function serializeState(state: DemoWorkspaceState): SerializedDemoWorkspaceState {
  return {
    draft: clone(state.draft),
    profile: serializeProfile(state.profile),
    targetRole: serializeTargetRole(state.targetRole),
    jobTarget: serializeJobTarget(state.jobTarget),
    resumeAsset: serializeResumeAsset(state.resumeAsset),
    sessions: state.sessions.map(serializeSession),
    transcriptTurnsBySessionId: [...state.transcriptTurnsBySessionId.entries()].map(
      ([sessionId, turns]) => [sessionId, turns.map(serializeTranscriptTurn)],
    ),
    reportJobsBySessionId: [...state.reportJobsBySessionId.entries()].map(
      ([sessionId, job]) => [sessionId, serializeReportGenerationJob(job)],
    ),
    reportsById: [...state.reportsById.entries()].map(([reportId, record]) => [
      reportId,
      {
        reportRow: serializeReportRow(record.reportRow),
        report: clone(record.report),
        practicePlan: serializePracticePlan(record.practicePlan),
      },
    ]),
    reportIdBySessionId: [...state.reportIdBySessionId.entries()],
    nextSessionNumber: state.nextSessionNumber,
    clockTick: state.clockTick,
  };
}

function deserializeState(state: SerializedDemoWorkspaceState): DemoWorkspaceState {
  return {
    draft: clone(state.draft),
    profile: deserializeProfile(state.profile),
    targetRole: deserializeTargetRole(state.targetRole),
    jobTarget: deserializeJobTarget(state.jobTarget),
    resumeAsset: deserializeResumeAsset(state.resumeAsset),
    sessions: state.sessions.map(deserializeSession),
    transcriptTurnsBySessionId: new Map(
      state.transcriptTurnsBySessionId.map(([sessionId, turns]) => [
        sessionId,
        turns.map(deserializeTranscriptTurn),
      ]),
    ),
    reportJobsBySessionId: new Map(
      state.reportJobsBySessionId.map(([sessionId, job]) => [
        sessionId,
        deserializeReportGenerationJob(job),
      ]),
    ),
    reportsById: new Map(
      state.reportsById.map(([reportId, record]) => [
        reportId,
        {
          reportRow: deserializeReportRow(record.reportRow),
          report: clone(record.report),
          practicePlan: deserializePracticePlan(record.practicePlan),
        },
      ]),
    ),
    reportIdBySessionId: new Map(state.reportIdBySessionId),
    nextSessionNumber: state.nextSessionNumber,
    clockTick: state.clockTick,
  };
}

class DemoRuntime {
  getUser() {
    return DEMO_USER;
  }

  private readState() {
    const statePath = getDemoRuntimeStatePath();

    try {
      return deserializeState(
        JSON.parse(readFileSync(statePath, "utf8")) as SerializedDemoWorkspaceState,
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        const initialState = createInitialState();
        this.writeState(initialState);
        return initialState;
      }

      throw error;
    }
  }

  private writeState(state: DemoWorkspaceState) {
    const statePath = getDemoRuntimeStatePath();

    mkdirSync(dirname(statePath), { recursive: true });
    writeFileSync(statePath, JSON.stringify(serializeState(state)), "utf8");
  }

  private advanceTime(state: DemoWorkspaceState) {
    const timestamp = nextTimestamp(state.clockTick);
    state.clockTick += 1;
    return timestamp;
  }

  private findReportBySessionId(state: DemoWorkspaceState, sessionId: string) {
    const reportId = state.reportIdBySessionId.get(sessionId);

    if (!reportId) {
      return null;
    }

    return state.reportsById.get(reportId) ?? null;
  }

  async loadOnboardingDraftForUser(userId: string) {
    void userId;

    return clone(this.readState().draft);
  }

  async saveOnboardingDraftForUser(input: {
    userId: string;
    email: string | null;
    draft: OnboardingDraft;
    file: File | null;
  }) {
    const state = this.readState();
    const now = this.advanceTime(state);
    const draft = clone(input.draft);

    state.draft = draft;
    state.profile = buildProfile(input.email, draft, now);
    state.targetRole = buildTargetRole(draft, now);
    state.jobTarget = buildJobTarget(draft, state.targetRole.id, now);
    state.resumeAsset = buildResumeAsset(input.userId, draft, input.file, now);
    this.writeState(state);

    return {
      profile: clone(state.profile),
      targetRole: clone(state.targetRole),
      jobTarget: clone(state.jobTarget),
      resumeAsset: state.resumeAsset ? clone(state.resumeAsset) : null,
    };
  }

  createInterviewRepository(): InterviewDataRepository {
    const listRubricDimensions = async () => clone(INTERVIEW_SEED.rubricDimensions);
    const listQuestionBank = async (mode?: InterviewMode) =>
      clone(buildQuestionPreview(mode));
    const listTargetRoles = async (userId: string) =>
      userId === DEMO_USER.id ? [clone(this.readState().targetRole)] : [];
    const listWorkspaceSessions = async (userId: string) => {
      const state = this.readState();

      if (userId !== DEMO_USER.id) {
        return [];
      }

      return [...state.sessions]
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
        .map((session) => clone(session));
    };
    const getWorkspaceSnapshot = async (userId: string) => {
      const state = this.readState();
      const rubrics = clone(INTERVIEW_SEED.rubricDimensions);
      const questions = clone(buildQuestionPreview());
      const targetRoles = userId === DEMO_USER.id ? [clone(state.targetRole)] : [];
      const sessions =
        userId === DEMO_USER.id
          ? [...state.sessions]
              .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
              .map((session) => clone(session))
          : [];

      return {
        profile: userId === DEMO_USER.id ? clone(state.profile) : null,
        targetRole: targetRoles.find((targetRole) => targetRole.active) ?? targetRoles[0] ?? null,
        jobTarget: userId === DEMO_USER.id ? clone(state.jobTarget) : null,
        resumeAsset: userId === DEMO_USER.id && state.resumeAsset ? clone(state.resumeAsset) : null,
        activeMode: deriveActiveMode(sessions),
        questionCount: questions.length,
        rubricCount: rubrics.length,
        recentSessionCount: sessions.length,
        questionPreview: questions.slice(0, 3),
      } satisfies WorkspaceSnapshot;
    };

    return {
      listRubricDimensions,
      listQuestionBank,
      listTargetRoles,
      listWorkspaceSessions,
      getWorkspaceSnapshot,
    };
  }

  createInterviewSessionStore(): InterviewSessionStore {
    return {
      getTargetRoleById: async (userId: string, targetRoleId: string) => {
        const state = this.readState();

        if (userId !== DEMO_USER.id || state.targetRole.id !== targetRoleId) {
          return null;
        }

        return clone(state.targetRole);
      },
      createSession: async (row) => {
        const state = this.readState();
        const existing = state.sessions.find(
          (session) =>
            session.userId === row.userId &&
            session.targetRoleId === row.targetRoleId &&
            session.mode === row.mode &&
            session.status !== "completed" &&
            session.status !== "archived",
        );

        if (existing) {
          return clone(existing);
        }

        const timestamp = this.advanceTime(state);
        const status: InterviewSessionRow["status"] = row.status ?? "draft";
        const overallScore: InterviewSessionRow["overallScore"] = row.overallScore ?? null;
        const durationSeconds: InterviewSessionRow["durationSeconds"] =
          row.durationSeconds ?? 18 * 60;
        const startedAt: InterviewSessionRow["startedAt"] = row.startedAt ?? null;
        const endedAt: InterviewSessionRow["endedAt"] = row.endedAt ?? null;
        const session: InterviewSessionRow = {
          id: `demo-session-${state.nextSessionNumber}`,
          userId: row.userId,
          targetRoleId: row.targetRoleId,
          mode: row.mode,
          status,
          title: row.title,
          overallScore,
          durationSeconds,
          startedAt,
          endedAt,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        state.nextSessionNumber += 1;
        state.sessions.unshift(session);
        state.transcriptTurnsBySessionId.set(session.id, []);
        this.writeState(state);

        return clone(session);
      },
      getSession: async (userId: string, sessionId: string) => {
        const state = this.readState();
        const session = state.sessions.find(
          (candidate) => candidate.id === sessionId && candidate.userId === userId,
        );

        return session ? clone(session) : null;
      },
      listTranscriptTurns: async (sessionId: string) => {
        const turns = this.readState().transcriptTurnsBySessionId.get(sessionId) ?? [];

        return clone(
          [...turns].sort(
            (left, right) =>
              left.sequenceIndex - right.sequenceIndex ||
              left.seconds - right.seconds ||
              left.createdAt.getTime() - right.createdAt.getTime(),
          ),
        );
      },
      appendTranscriptTurns: async (input) => {
        const state = this.readState();
        const session = state.sessions.find(
          (candidate) => candidate.id === input.sessionId && candidate.userId === input.userId,
        );

        if (!session) {
          throw new SessionServiceError("Session not found.", "not_found", 404);
        }

        if (session.status === "completed") {
          throw new SessionServiceError(
            "Completed sessions cannot accept new turns.",
            "invalid_state",
            409,
          );
        }

        const createdAt = this.advanceTime(state);
        const currentTurns = state.transcriptTurnsBySessionId.get(session.id) ?? [];
        const nextSequenceIndex =
          currentTurns.length === 0
            ? 0
            : Math.max(...currentTurns.map((turn) => turn.sequenceIndex)) + 1;
        const appendedTurns = input.turns.map((turn, index) => ({
          id: `demo-turn-${session.id}-${nextSequenceIndex + index}`,
          sessionId: session.id,
          speaker: turn.speaker,
          body: turn.body.trim(),
          seconds: turn.seconds,
          sequenceIndex: nextSequenceIndex + index,
          confidence: turn.confidence ?? 100,
          createdAt,
        }));

        state.transcriptTurnsBySessionId.set(session.id, [...currentTurns, ...appendedTurns]);
        session.status = "active";
        session.startedAt = session.startedAt ?? createdAt;
        session.updatedAt = createdAt;
        this.writeState(state);

        return clone(session);
      },
      completeSession: async (input: CompleteInterviewSessionInput) => {
        const state = this.readState();
        const session = state.sessions.find(
          (candidate) => candidate.id === input.sessionId && candidate.userId === input.userId,
        );

        if (!session) {
          throw new SessionServiceError("Session not found.", "not_found", 404);
        }

        if (session.status === "completed") {
          return clone(session);
        }

        const endedAt = input.endedAt ?? this.advanceTime(state);
        session.status = "completed";
        session.endedAt = endedAt;
        session.overallScore = input.overallScore ?? session.overallScore ?? null;
        session.updatedAt = endedAt;
        this.writeState(state);

        return clone(session);
      },
    };
  }

  createReportStore(): ReportStore {
    return {
      listReportOverviews: async (userId: string) => {
        const state = this.readState();

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
        const state = this.readState();

        if (userId !== DEMO_USER.id) {
          return null;
        }

        const record = state.reportsById.get(reportId);
        return record ? clone(record.report) : null;
      },
      loadGenerationContext: async (userId: string, sessionId: string) => {
        const state = this.readState();

        if (userId !== DEMO_USER.id) {
          return null;
        }

        const session = state.sessions.find((candidate) => candidate.id === sessionId);

        if (!session) {
          return null;
        }

        const reportRecord = this.findReportBySessionId(state, session.id);
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
        const state = this.readState();

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
        const createdAt = existing?.reportRow.createdAt ?? this.advanceTime(state);
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
        this.writeState(state);

        return clone(report);
      },
      getReportGenerationJobBySessionId: async (userId: string, sessionId: string) => {
        const state = this.readState();

        if (userId !== DEMO_USER.id) {
          return null;
        }

        const job = state.reportJobsBySessionId.get(sessionId);
        return job ? clone(job) : null;
      },
      enqueueReportGenerationJob: async (userId: string, sessionId: string) => {
        const state = this.readState();

        if (userId !== DEMO_USER.id) {
          throw new Error("Session not found while queueing report generation.");
        }

        const session = state.sessions.find((candidate) => candidate.id === sessionId);

        if (!session) {
          throw new Error("Session not found while queueing report generation.");
        }

        const now = this.advanceTime(state);
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
        this.writeState(state);

        return clone(job);
      },
      claimReportGenerationJob: async (input) => {
        const state = this.readState();

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

        const now = this.advanceTime(state);
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
        this.writeState(state);

        return clone(updatedJob);
      },
      completeReportGenerationJob: async (
        userId: string,
        sessionId: string,
        reportId: string,
      ) => {
        const state = this.readState();

        if (userId !== DEMO_USER.id) {
          throw new Error("Session not found while completing report generation.");
        }

        const session = state.sessions.find((candidate) => candidate.id === sessionId);

        if (!session) {
          throw new Error("Session not found while completing report generation.");
        }

        const now = this.advanceTime(state);
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
        this.writeState(state);

        return clone(completedJob);
      },
      failReportGenerationJob: async (
        userId: string,
        sessionId: string,
        errorMessage: string,
      ) => {
        const state = this.readState();

        if (userId !== DEMO_USER.id) {
          throw new Error("Session not found while failing report generation.");
        }

        const session = state.sessions.find((candidate) => candidate.id === sessionId);

        if (!session) {
          throw new Error("Session not found while failing report generation.");
        }

        const now = this.advanceTime(state);
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
        this.writeState(state);

        return clone(failedJob);
      },
    };
  }

  createProgressStore(): ProgressStore {
    return {
      listProgressSessions: async (userId: string) => {
        const state = this.readState();

        if (userId !== DEMO_USER.id) {
          return [];
        }

        const sessions = state.sessions
          .filter((session) => session.status === "completed")
          .map<ProgressSession>((session) => {
            const reportId = state.reportIdBySessionId.get(session.id);
            const reportRecord = reportId ? state.reportsById.get(reportId) ?? null : null;
            const transcript = state.transcriptTurnsBySessionId.get(session.id) ?? [];
            const summary = reportRecord?.report.summary;

            return {
              id: session.id,
              completedAt: (session.endedAt ?? session.updatedAt).toISOString(),
              track: session.mode,
              score: reportRecord?.report.scorecard.overallScore ?? session.overallScore ?? 0,
              durationMinutes: Math.max(1, Math.round(session.durationSeconds / 60)),
              followUps: Math.max(0, transcript.length - 1),
              focus: summary?.growthAreas[0] ?? session.title,
              note: summary?.headline ?? session.title,
            };
          });

        return sessions.sort(
          (left, right) =>
            new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime(),
        );
      },
    };
  }
}

const demoRuntime = new DemoRuntime();

export function getDemoWorkspaceUser() {
  return demoRuntime.getUser();
}

export function loadDemoOnboardingDraftForUser(userId: string) {
  return demoRuntime.loadOnboardingDraftForUser(userId);
}

export function saveDemoOnboardingDraftForUser(input: {
  userId: string;
  email: string | null;
  draft: OnboardingDraft;
  file: File | null;
}) {
  return demoRuntime.saveOnboardingDraftForUser(input);
}

export function createDemoInterviewRepository() {
  return demoRuntime.createInterviewRepository();
}

export function createDemoInterviewSessionStore() {
  return demoRuntime.createInterviewSessionStore();
}

export function createDemoReportStore() {
  return demoRuntime.createReportStore();
}

export function createDemoProgressStore() {
  return demoRuntime.createProgressStore();
}
