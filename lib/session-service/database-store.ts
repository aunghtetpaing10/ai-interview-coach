import "server-only";

import { and, asc, eq } from "drizzle-orm";
import type {
  InterviewSessionRow,
  NewInterviewSessionRow,
  TargetRoleRow,
  TranscriptTurnRow,
} from "@/db/schema";
import {
  interviewSessions,
  targetRoles,
  transcriptTurns,
} from "@/db/schema";
import { getDb } from "@/lib/db/client";
import {
  SessionServiceError,
  type AppendTranscriptTurnsInput,
  type CompleteInterviewSessionInput,
  type InterviewSessionStore,
} from "@/lib/session-service/session-service";

export type DatabaseInterviewSessionStore = InterviewSessionStore;

type DbMutationClient = Pick<ReturnType<typeof getDb>, "select" | "insert" | "update">;

function toSessionNotFoundError() {
  return new SessionServiceError("Session not found.", "not_found", 404);
}

function toCompletedSessionError() {
  return new SessionServiceError(
    "Completed sessions cannot accept new turns.",
    "invalid_state",
    409,
  );
}

export function createDatabaseInterviewSessionStore(): DatabaseInterviewSessionStore {
  const db = getDb();

  return {
    async getTargetRoleById(
      userId: string,
      targetRoleId: string,
    ): Promise<TargetRoleRow | null> {
      const [row] = await db
        .select()
        .from(targetRoles)
        .where(and(eq(targetRoles.userId, userId), eq(targetRoles.id, targetRoleId)))
        .limit(1);

      return row ?? null;
    },

    async createSession(row: NewInterviewSessionRow): Promise<InterviewSessionRow> {
      const [session] = await db
        .insert(interviewSessions)
        .values(row)
        .returning();

      if (!session) {
        throw new Error("Failed to create session.");
      }

      return session;
    },

    async getSession(userId: string, sessionId: string): Promise<InterviewSessionRow | null> {
      const [session] = await db
        .select()
        .from(interviewSessions)
        .where(and(eq(interviewSessions.userId, userId), eq(interviewSessions.id, sessionId)))
        .limit(1);

      return session ?? null;
    },

    async listTranscriptTurns(sessionId: string): Promise<readonly TranscriptTurnRow[]> {
      return db
        .select()
        .from(transcriptTurns)
        .where(eq(transcriptTurns.sessionId, sessionId))
        .orderBy(asc(transcriptTurns.sequenceIndex), asc(transcriptTurns.createdAt));
    },

    async appendTranscriptTurns(
      input: AppendTranscriptTurnsInput,
    ): Promise<InterviewSessionRow> {
      const createdAt = new Date();

      return db.transaction(async (tx) => {
        const session = await lockSessionRow(tx, input.userId, input.sessionId);

        if (!session) {
          throw toSessionNotFoundError();
        }

        if (session.status === "completed") {
          throw toCompletedSessionError();
        }

        const existingTurns = await tx
          .select()
          .from(transcriptTurns)
          .where(eq(transcriptTurns.sessionId, session.id))
          .orderBy(asc(transcriptTurns.sequenceIndex), asc(transcriptTurns.createdAt));
        const nextSequenceIndex =
          existingTurns.length === 0
            ? 0
            : Math.max(...existingTurns.map((turn) => turn.sequenceIndex)) + 1;

        const rows = input.turns.map((turn, index) => ({
          sessionId: session.id,
          speaker: turn.speaker,
          body: turn.body.trim(),
          seconds: turn.seconds,
          sequenceIndex: nextSequenceIndex + index,
          confidence: turn.confidence ?? 100,
          createdAt,
        }));

        await tx.insert(transcriptTurns).values(rows);

        const [updatedSession] = await tx
          .update(interviewSessions)
          .set({
            status: "active",
            startedAt: session.startedAt ?? createdAt,
            updatedAt: createdAt,
          })
          .where(eq(interviewSessions.id, session.id))
          .returning();

        if (!updatedSession) {
          throw new Error("Failed to update session.");
        }

        return updatedSession;
      });
    },

    async completeSession(
      input: CompleteInterviewSessionInput,
    ): Promise<InterviewSessionRow> {
      return db.transaction(async (tx) => {
        const session = await lockSessionRow(tx, input.userId, input.sessionId);

        if (!session) {
          throw toSessionNotFoundError();
        }

        if (session.status === "completed") {
          return session;
        }

        const endedAt = input.endedAt ?? new Date();
        const [updatedSession] = await tx
          .update(interviewSessions)
          .set({
            status: "completed",
            endedAt,
            overallScore: input.overallScore ?? session.overallScore ?? null,
            updatedAt: endedAt,
          })
          .where(eq(interviewSessions.id, session.id))
          .returning();

        if (!updatedSession) {
          throw new Error("Failed to update session.");
        }

        return updatedSession;
      });
    },
  };
}

async function lockSessionRow(
  db: DbMutationClient,
  userId: string,
  sessionId: string,
) {
  const [session] = await db
    .select()
    .from(interviewSessions)
    .where(and(eq(interviewSessions.userId, userId), eq(interviewSessions.id, sessionId)))
    .for("update")
    .limit(1);

  return session ?? null;
}
