import "server-only";

import { INTERVIEW_SEED } from "@/db/seed";
import type {
  FeedbackReportRow,
  InterviewMode,
  InterviewSessionRow,
  JobTargetRow,
  PracticePlanRow,
  ProfileRow,
  PromptVersionRow,
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
  reportsById: Map<string, DemoReportRecord>;
  reportIdBySessionId: Map<string, string>;
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
    reportsById: new Map(),
    reportIdBySessionId: new Map(),
    nextSessionNumber: 1,
    clockTick: 1,
  };
}

class DemoRuntime {
  private readonly state = createInitialState();

  getUser() {
    return DEMO_USER;
  }

  private advanceTime() {
    const timestamp = nextTimestamp(this.state.clockTick);
    this.state.clockTick += 1;
    return timestamp;
  }

  private findReportBySessionId(sessionId: string) {
    const reportId = this.state.reportIdBySessionId.get(sessionId);

    if (!reportId) {
      return null;
    }

    return this.state.reportsById.get(reportId) ?? null;
  }

  async loadOnboardingDraftForUser(userId: string) {
    void userId;
    return clone(this.state.draft);
  }

  async saveOnboardingDraftForUser(input: {
    userId: string;
    email: string | null;
    draft: OnboardingDraft;
    file: File | null;
  }) {
    const now = this.advanceTime();
    const draft = clone(input.draft);

    this.state.draft = draft;
    this.state.profile = buildProfile(input.email, draft, now);
    this.state.targetRole = buildTargetRole(draft, now);
    this.state.jobTarget = buildJobTarget(draft, this.state.targetRole.id, now);
    this.state.resumeAsset = buildResumeAsset(input.userId, draft, input.file, now);

    return {
      profile: clone(this.state.profile),
      targetRole: clone(this.state.targetRole),
      jobTarget: clone(this.state.jobTarget),
      resumeAsset: this.state.resumeAsset ? clone(this.state.resumeAsset) : null,
    };
  }

  createInterviewRepository(): InterviewDataRepository {
    const state = this.state;
    const listRubricDimensions = async () => clone(INTERVIEW_SEED.rubricDimensions);
    const listQuestionBank = async (mode?: InterviewMode) =>
      clone(buildQuestionPreview(mode));
    const listTargetRoles = async (userId: string) =>
      userId === DEMO_USER.id ? [clone(state.targetRole)] : [];
    const listWorkspaceSessions = async (userId: string) => {
      if (userId !== DEMO_USER.id) {
        return [];
      }

      return [...state.sessions]
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
        .map((session) => clone(session));
    };
    const getWorkspaceSnapshot = async (userId: string) => {
      const [rubrics, questions, targetRoles, sessions] = await Promise.all([
        listRubricDimensions(),
        listQuestionBank(),
        listTargetRoles(userId),
        listWorkspaceSessions(userId),
      ]);

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
    const state = this.state;
    const advanceTime = () => this.advanceTime();

    return {
      async getTargetRoleById(userId: string, targetRoleId: string) {
        if (userId !== DEMO_USER.id || state.targetRole.id !== targetRoleId) {
          return null;
        }

        return clone(state.targetRole);
      },
      async createSession(row) {
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

        const timestamp = advanceTime();
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

        return clone(session);
      },
      async getSession(userId: string, sessionId: string) {
        const session = state.sessions.find(
          (candidate) => candidate.id === sessionId && candidate.userId === userId,
        );

        return session ? clone(session) : null;
      },
      async listTranscriptTurns(sessionId: string) {
        const turns = state.transcriptTurnsBySessionId.get(sessionId) ?? [];

        return clone(
          [...turns].sort(
            (left, right) =>
              left.sequenceIndex - right.sequenceIndex ||
              left.seconds - right.seconds ||
              left.createdAt.getTime() - right.createdAt.getTime(),
          ),
        );
      },
      async appendTranscriptTurns(input) {
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

        const createdAt = advanceTime();
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

        return clone(session);
      },
      async completeSession(input: CompleteInterviewSessionInput) {
        const session = state.sessions.find(
          (candidate) => candidate.id === input.sessionId && candidate.userId === input.userId,
        );

        if (!session) {
          throw new SessionServiceError("Session not found.", "not_found", 404);
        }

        if (session.status === "completed") {
          return clone(session);
        }

        const endedAt = input.endedAt ?? advanceTime();
        session.status = "completed";
        session.endedAt = endedAt;
        session.overallScore = input.overallScore ?? session.overallScore ?? null;
        session.updatedAt = endedAt;

        return clone(session);
      },
    };
  }

  createReportStore(): ReportStore {
    const state = this.state;
    const advanceTime = () => this.advanceTime();
    const findReportBySessionId = (sessionId: string) =>
      this.findReportBySessionId(sessionId);

    return {
      async listReportOverviews(userId: string) {
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
      async getReportById(userId: string, reportId: string) {
        if (userId !== DEMO_USER.id) {
          return null;
        }

        const record = state.reportsById.get(reportId);
        return record ? clone(record.report) : null;
      },
      async loadGenerationContext(userId: string, sessionId: string) {
        if (userId !== DEMO_USER.id) {
          return null;
        }

        const session = state.sessions.find((candidate) => candidate.id === sessionId);

        if (!session) {
          return null;
        }

        const reportRecord = findReportBySessionId(session.id);
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
      async saveGeneratedReport(userId: string, context: ReportGenerationContext, report) {
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
        const createdAt = existing?.reportRow.createdAt ?? advanceTime();
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

        return clone(report);
      },
    };
  }

  createProgressStore(): ProgressStore {
    const state = this.state;

    return {
      async listProgressSessions(userId: string) {
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
