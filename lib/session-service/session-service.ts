import type {
  InterviewSessionRow,
  NewInterviewSessionRow,
  TranscriptSpeaker,
  TargetRoleRow,
  TranscriptTurnRow,
} from "@/db/schema";
import type { InterviewMode } from "@/lib/types/interview";

export interface InterviewSessionStore {
  getTargetRoleById(userId: string, targetRoleId: string): Promise<TargetRoleRow | null>;
  createSession(row: NewInterviewSessionRow): Promise<InterviewSessionRow>;
  getSession(userId: string, sessionId: string): Promise<InterviewSessionRow | null>;
  listTranscriptTurns(sessionId: string): Promise<readonly TranscriptTurnRow[]>;
  appendTranscriptTurns(input: AppendTranscriptTurnsInput): Promise<InterviewSessionRow>;
  completeSession(input: CompleteInterviewSessionInput): Promise<InterviewSessionRow>;
}

export interface InterviewSessionView {
  session: InterviewSessionRow;
  transcriptTurns: readonly TranscriptTurnRow[];
}

export interface CreateInterviewSessionInput {
  userId: string;
  targetRoleId: string;
  mode: InterviewMode;
  title: string;
  durationSeconds?: number;
}

export interface AppendTranscriptTurnsInput {
  userId: string;
  sessionId: string;
  turns: readonly {
    speaker: TranscriptSpeaker;
    body: string;
    seconds: number;
    confidence?: number;
  }[];
}

export interface CompleteInterviewSessionInput {
  userId: string;
  sessionId: string;
  overallScore?: number;
  endedAt?: Date;
}

export type SessionServiceErrorCode = "not_found" | "invalid_state";

export class SessionServiceError extends Error {
  constructor(
    message: string,
    public readonly code: SessionServiceErrorCode,
    public readonly status: number,
  ) {
    super(message);
    this.name = "SessionServiceError";
  }
}

function sortTranscriptTurns(turns: readonly TranscriptTurnRow[]) {
  return [...turns].sort(
    (left, right) =>
      left.sequenceIndex - right.sequenceIndex ||
      left.seconds - right.seconds ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  );
}

function toSessionView(
  session: InterviewSessionRow,
  transcriptTurns: readonly TranscriptTurnRow[],
): InterviewSessionView {
  return {
    session,
    transcriptTurns: sortTranscriptTurns(transcriptTurns),
  };
}

export function createInterviewSessionService(store: InterviewSessionStore) {
  return {
    async createSession(input: CreateInterviewSessionInput): Promise<InterviewSessionView> {
      const session = await store.createSession({
        userId: input.userId,
        targetRoleId: input.targetRoleId,
        mode: input.mode,
        status: "draft",
        title: input.title,
        overallScore: null,
        durationSeconds: input.durationSeconds ?? 18 * 60,
        startedAt: null,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return toSessionView(session, []);
    },

    async getSession(input: {
      userId: string;
      sessionId: string;
    }): Promise<InterviewSessionView | null> {
      const session = await store.getSession(input.userId, input.sessionId);

      if (!session) {
        return null;
      }

      const transcriptTurns = await store.listTranscriptTurns(session.id);
      return toSessionView(session, transcriptTurns);
    },

    async appendTranscriptTurns(
      input: AppendTranscriptTurnsInput,
    ): Promise<InterviewSessionView> {
      const updatedSession = await store.appendTranscriptTurns(input);
      const transcriptTurns = await store.listTranscriptTurns(updatedSession.id);

      return toSessionView(updatedSession, transcriptTurns);
    },

    async completeSession(
      input: CompleteInterviewSessionInput,
    ): Promise<InterviewSessionView> {
      const updatedSession = await store.completeSession(input);
      const transcriptTurns = await store.listTranscriptTurns(updatedSession.id);

      return toSessionView(updatedSession, transcriptTurns);
    },
  };
}
