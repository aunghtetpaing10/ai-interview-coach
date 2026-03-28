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
  findReusableSession(input: {
    userId: string;
    targetRoleId: string;
    mode: InterviewMode;
  }): Promise<InterviewSessionRow | null>;
  createSession(row: NewInterviewSessionRow): Promise<InterviewSessionRow>;
  getSession(userId: string, sessionId: string): Promise<InterviewSessionRow | null>;
  listTranscriptTurns(sessionId: string): Promise<readonly TranscriptTurnRow[]>;
  appendTranscriptTurns(input: AppendTranscriptTurnsInput): Promise<AppendTranscriptTurnsAck>;
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

export interface BootstrapInterviewSessionInput extends CreateInterviewSessionInput {
  openingPrompt: string;
  openingPromptSeconds?: number;
}

export interface AppendTranscriptTurnsInput {
  userId: string;
  sessionId: string;
  batchId?: string;
  baseSequenceIndex?: number;
  turns: readonly {
    speaker: TranscriptSpeaker;
    body: string;
    seconds: number;
    confidence?: number;
  }[];
}

export interface AppendTranscriptTurnsAck {
  session: InterviewSessionRow;
  batchId: string;
  replayed: boolean;
  firstSequenceIndex: number;
  nextSequenceIndex: number;
  appendedTurns: number;
}

export interface CompleteInterviewSessionInput {
  userId: string;
  sessionId: string;
  overallScore?: number;
  endedAt?: Date;
}

export type SessionServiceErrorCode =
  | "not_found"
  | "invalid_state"
  | "idempotency_conflict"
  | "stale_sequence";

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
        nextTranscriptSequenceIndex: 0,
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

    async bootstrapSession(
      input: BootstrapInterviewSessionInput,
    ): Promise<InterviewSessionView> {
      const existingSession = await store.findReusableSession({
        userId: input.userId,
        targetRoleId: input.targetRoleId,
        mode: input.mode,
      });
      const session =
        existingSession ??
        (await store.createSession({
          userId: input.userId,
          targetRoleId: input.targetRoleId,
          mode: input.mode,
          status: "draft",
          title: input.title,
          overallScore: null,
          durationSeconds: input.durationSeconds ?? 18 * 60,
          nextTranscriptSequenceIndex: 0,
          startedAt: null,
          endedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      const transcriptTurns = await store.listTranscriptTurns(session.id);

      if (transcriptTurns.length === 0) {
        await store.appendTranscriptTurns({
          userId: input.userId,
          sessionId: session.id,
          batchId: `bootstrap:${session.id}`,
          baseSequenceIndex: session.nextTranscriptSequenceIndex,
          turns: [
            {
              speaker: "interviewer",
              body: input.openingPrompt,
              seconds: input.openingPromptSeconds ?? 8,
            },
          ],
        });
      }

      const hydratedSession =
        (await store.getSession(input.userId, session.id)) ?? session;
      const hydratedTranscriptTurns = await store.listTranscriptTurns(hydratedSession.id);

      return toSessionView(hydratedSession, hydratedTranscriptTurns);
    },

    async appendTranscriptTurns(
      input: AppendTranscriptTurnsInput,
    ): Promise<InterviewSessionView> {
      await store.appendTranscriptTurns(input);
      const session = await store.getSession(input.userId, input.sessionId);

      if (!session) {
        throw new SessionServiceError("Session not found.", "not_found", 404);
      }

      const transcriptTurns = await store.listTranscriptTurns(session.id);
      return toSessionView(session, transcriptTurns);
    },

    async appendTranscriptTurnsWithAck(
      input: AppendTranscriptTurnsInput,
    ): Promise<AppendTranscriptTurnsAck> {
      const result = (await store.appendTranscriptTurns(input)) as
        | AppendTranscriptTurnsAck
        | InterviewSessionRow;

      if ("session" in result) {
        return result;
      }

      const fallbackFirstSequenceIndex =
        input.baseSequenceIndex ??
        Math.max(
          0,
          (result.nextTranscriptSequenceIndex ?? input.turns.length) -
            input.turns.length,
        );
      const fallbackNextSequenceIndex =
        result.nextTranscriptSequenceIndex ??
        fallbackFirstSequenceIndex + input.turns.length;

      return {
        session: result,
        batchId: input.batchId ?? "legacy",
        replayed: false,
        firstSequenceIndex: fallbackFirstSequenceIndex,
        nextSequenceIndex: fallbackNextSequenceIndex,
        appendedTurns: input.turns.length,
      };
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
