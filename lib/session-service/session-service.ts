import type {
  InterviewSessionRow,
  NewInterviewSessionRow,
  NewTranscriptTurnRow,
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
  appendTranscriptTurns(
    sessionId: string,
    rows: readonly NewTranscriptTurnRow[],
  ): Promise<readonly TranscriptTurnRow[]>;
  updateSession(
    sessionId: string,
    patch: Partial<InterviewSessionRow>,
  ): Promise<InterviewSessionRow>;
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

function getNextSequenceIndex(turns: readonly TranscriptTurnRow[]) {
  if (turns.length === 0) {
    return 0;
  }

  return Math.max(...turns.map((turn) => turn.sequenceIndex)) + 1;
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
      const session = await store.getSession(input.userId, input.sessionId);

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

      const existingTurns = await store.listTranscriptTurns(session.id);
      const nextSequenceIndex = getNextSequenceIndex(existingTurns);
      const createdAt = new Date();
      const rows = input.turns.map((turn, index) => ({
        sessionId: session.id,
        speaker: turn.speaker,
        body: turn.body.trim(),
        seconds: turn.seconds,
        sequenceIndex: nextSequenceIndex + index,
        confidence: turn.confidence ?? 100,
        createdAt,
      }));

      await store.appendTranscriptTurns(session.id, rows);

      const updatedSession = await store.updateSession(session.id, {
        status: "active",
        startedAt: session.startedAt ?? createdAt,
        updatedAt: createdAt,
      });
      const transcriptTurns = await store.listTranscriptTurns(session.id);

      return toSessionView(updatedSession, transcriptTurns);
    },

    async completeSession(
      input: CompleteInterviewSessionInput,
    ): Promise<InterviewSessionView> {
      const session = await store.getSession(input.userId, input.sessionId);

      if (!session) {
        throw new SessionServiceError("Session not found.", "not_found", 404);
      }

      if (session.status === "completed") {
        const transcriptTurns = await store.listTranscriptTurns(session.id);
        return toSessionView(session, transcriptTurns);
      }

      const endedAt = input.endedAt ?? new Date();
      const updatedSession = await store.updateSession(session.id, {
        status: "completed",
        endedAt,
        overallScore: input.overallScore ?? session.overallScore ?? null,
        updatedAt: endedAt,
      });
      const transcriptTurns = await store.listTranscriptTurns(session.id);

      return toSessionView(updatedSession, transcriptTurns);
    },
  };
}
