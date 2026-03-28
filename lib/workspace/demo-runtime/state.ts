import "server-only";

import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { INTERVIEW_SEED } from "@/db/seed";
import type {
  FeedbackReportRow,
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
import { createDemoOnboardingDraft } from "@/lib/intake/summary";
import type { OnboardingDraft } from "@/lib/intake/types";
import type { InterviewReport } from "@/lib/reporting/types";

export const DEMO_USER: WorkspaceUser = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "aung.htet.paing@example.com",
  source: "demo",
};

export const DEMO_BASE_TIME = new Date("2026-03-19T09:00:00.000Z");
const DEMO_RUNTIME_STATE_VERSION = 1;
export const DEMO_PROMPT_VERSION: PromptVersionRow | null = (() => {
  const latestPromptVersion = INTERVIEW_SEED.promptVersions.at(-1);

  return latestPromptVersion
    ? {
        ...latestPromptVersion,
        publishedAt: nextTimestamp(0),
      }
    : null;
})();

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function nextTimestamp(minutes: number) {
  return new Date(DEMO_BASE_TIME.getTime() + minutes * 60_000);
}

function normalizeFileName(value: string) {
  return value.trim() || "resume.txt";
}

function buildDemoFullName(email: string | null) {
  return email ? "Aung Htet Paing" : "Interview Coach Candidate";
}

export function buildProfile(email: string | null, draft: OnboardingDraft, now: Date): ProfileRow {
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

export function buildTargetRole(draft: OnboardingDraft, now: Date): TargetRoleRow {
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

export function buildJobTarget(
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

export function buildResumeAsset(
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

export type DemoReportRecord = {
  reportRow: FeedbackReportRow;
  report: InterviewReport;
  practicePlan: PracticePlanRow;
};

export type DemoWorkspaceState = {
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

export type SerializedDemoWorkspaceState = {
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

type SerializedDemoWorkspaceStateEnvelopeV1 = {
  version: 1;
  state: SerializedDemoWorkspaceState;
};

type DemoRuntimeStateFile = SerializedDemoWorkspaceStateEnvelopeV1 | SerializedDemoWorkspaceState;

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

let inMemoryState = createInitialState();
let persistedState: DemoWorkspaceState | null = null;
let persistedStatePath: string | null = null;

function getDemoRuntimeStatePath() {
  const statePath = process.env.E2E_DEMO_STATE_PATH?.trim();

  return statePath ? statePath : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getInitialSerializedState(): SerializedDemoWorkspaceState {
  return serializeState(createInitialState());
}

function normalizeIsoString(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeNullableIsoString(value: unknown, fallback: string | null) {
  if (value === null) {
    return null;
  }

  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeSerializedState(value: unknown): SerializedDemoWorkspaceState {
  const defaults = getInitialSerializedState();
  const source = isRecord(value) ? value : {};
  const profileSource = isRecord(source.profile) ? source.profile : null;
  const targetRoleSource = isRecord(source.targetRole) ? source.targetRole : null;
  const jobTargetSource = isRecord(source.jobTarget) ? source.jobTarget : null;
  const resumeAssetSource = isRecord(source.resumeAsset) ? source.resumeAsset : null;
  const sessionDefaults = defaults.sessions[0] ?? {
    id: "",
    userId: "",
    targetRoleId: "",
    mode: "behavioral",
    status: "draft",
    title: "",
    overallScore: null,
    durationSeconds: 0,
    nextTranscriptSequenceIndex: 0,
    startedAt: null,
    endedAt: null,
    createdAt: defaults.profile.createdAt,
    updatedAt: defaults.profile.updatedAt,
  };

  return {
    draft: clone((isRecord(source.draft) ? source.draft : defaults.draft) as OnboardingDraft),
    profile: {
      ...defaults.profile,
      ...(profileSource ?? {}),
      createdAt: normalizeIsoString(profileSource?.createdAt, defaults.profile.createdAt),
      updatedAt: normalizeIsoString(profileSource?.updatedAt, defaults.profile.updatedAt),
    },
    targetRole: {
      ...defaults.targetRole,
      ...(targetRoleSource ?? {}),
      createdAt: normalizeIsoString(targetRoleSource?.createdAt, defaults.targetRole.createdAt),
    },
    jobTarget: {
      ...defaults.jobTarget,
      ...(jobTargetSource ?? {}),
      createdAt: normalizeIsoString(jobTargetSource?.createdAt, defaults.jobTarget.createdAt),
      updatedAt: normalizeIsoString(jobTargetSource?.updatedAt, defaults.jobTarget.updatedAt),
    },
    resumeAsset:
      source.resumeAsset === null
        ? null
        : resumeAssetSource
          ? {
              id:
                typeof resumeAssetSource.id === "string"
                  ? resumeAssetSource.id
                  : defaults.resumeAsset?.id ?? "demo-resume-1",
              userId:
                typeof resumeAssetSource.userId === "string"
                  ? resumeAssetSource.userId
                  : defaults.resumeAsset?.userId ?? DEMO_USER.id,
              fileName:
                typeof resumeAssetSource.fileName === "string"
                  ? resumeAssetSource.fileName
                  : defaults.resumeAsset?.fileName ?? "resume.txt",
              storagePath:
                typeof resumeAssetSource.storagePath === "string"
                  ? resumeAssetSource.storagePath
                  : defaults.resumeAsset?.storagePath ?? `demo/${DEMO_USER.id}/resume.txt`,
              mimeType:
                typeof resumeAssetSource.mimeType === "string"
                  ? resumeAssetSource.mimeType
                  : defaults.resumeAsset?.mimeType ?? "text/plain",
              summary:
                typeof resumeAssetSource.summary === "string"
                  ? resumeAssetSource.summary
                  : defaults.resumeAsset?.summary ?? "",
              uploadedAt: normalizeIsoString(
                resumeAssetSource.uploadedAt,
                defaults.resumeAsset?.uploadedAt ?? defaults.profile.createdAt,
              ),
            }
          : defaults.resumeAsset,
    sessions: Array.isArray(source.sessions)
      ? source.sessions.map((session) => ({
          ...sessionDefaults,
          ...(isRecord(session) ? session : {}),
          createdAt: normalizeIsoString(
            isRecord(session) ? session.createdAt : undefined,
            defaults.profile.createdAt,
          ),
          updatedAt: normalizeIsoString(
            isRecord(session) ? session.updatedAt : undefined,
            defaults.profile.updatedAt,
          ),
          startedAt: normalizeNullableIsoString(
            isRecord(session) ? session.startedAt : undefined,
            null,
          ),
          endedAt: normalizeNullableIsoString(isRecord(session) ? session.endedAt : undefined, null),
        }))
      : defaults.sessions,
    transcriptTurnsBySessionId: Array.isArray(source.transcriptTurnsBySessionId)
      ? source.transcriptTurnsBySessionId
      : defaults.transcriptTurnsBySessionId,
    reportJobsBySessionId: Array.isArray(source.reportJobsBySessionId)
      ? source.reportJobsBySessionId
      : defaults.reportJobsBySessionId,
    reportsById: Array.isArray(source.reportsById) ? source.reportsById : defaults.reportsById,
    reportIdBySessionId: Array.isArray(source.reportIdBySessionId)
      ? source.reportIdBySessionId
      : defaults.reportIdBySessionId,
    nextSessionNumber:
      typeof source.nextSessionNumber === "number" && Number.isFinite(source.nextSessionNumber)
        ? source.nextSessionNumber
        : defaults.nextSessionNumber,
    clockTick:
      typeof source.clockTick === "number" && Number.isFinite(source.clockTick)
        ? source.clockTick
        : defaults.clockTick,
  };
}

function normalizeDemoRuntimeStateFile(value: unknown): SerializedDemoWorkspaceState {
  if (isRecord(value) && "version" in value && "state" in value) {
    return normalizeSerializedState(value.state);
  }

  return normalizeSerializedState(value);
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

export function serializeState(state: DemoWorkspaceState): SerializedDemoWorkspaceState {
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

function serializeStateFile(state: DemoWorkspaceState): SerializedDemoWorkspaceStateEnvelopeV1 {
  return {
    version: DEMO_RUNTIME_STATE_VERSION,
    state: serializeState(state),
  };
}

function loadStateFromFile(statePath: string): DemoWorkspaceState | null {
  try {
    return deserializeState(normalizeDemoRuntimeStateFile(JSON.parse(readFileSync(statePath, "utf8"))));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}

export function deserializeState(state: SerializedDemoWorkspaceState): DemoWorkspaceState {
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

export class DemoRuntime {
  getUser() {
    return DEMO_USER;
  }

  readState() {
    const statePath = getDemoRuntimeStatePath();

    if (!statePath) {
      return inMemoryState;
    }

    if (persistedState && persistedStatePath === statePath) {
      return persistedState;
    }

    persistedState = loadStateFromFile(statePath) ?? createInitialState();
    persistedStatePath = statePath;

    return persistedState;
  }

  writeState(state: DemoWorkspaceState) {
    const statePath = getDemoRuntimeStatePath();

    if (!statePath) {
      inMemoryState = state;
      return;
    }

    persistedState = state;
    persistedStatePath = statePath;
    mkdirSync(dirname(statePath), { recursive: true });
    const tempPath = join(
      dirname(statePath),
      `${basename(statePath)}.${process.pid}.${Date.now()}.tmp`,
    );

    try {
      writeFileSync(tempPath, JSON.stringify(serializeStateFile(state)), "utf8");
      renameSync(tempPath, statePath);
    } catch (error) {
      try {
        unlinkSync(tempPath);
      } catch {
        // Ignore cleanup failures.
      }

      throw error;
    }
  }

  advanceTime(state: DemoWorkspaceState) {
    const timestamp = nextTimestamp(state.clockTick);
    state.clockTick += 1;
    return timestamp;
  }

  findReportBySessionId(state: DemoWorkspaceState, sessionId: string) {
    const reportId = state.reportIdBySessionId.get(sessionId);

    if (!reportId) {
      return null;
    }

    return state.reportsById.get(reportId) ?? null;
  }
}

export const demoRuntime = new DemoRuntime();

export function getDemoWorkspaceUser() {
  return demoRuntime.getUser();
}
