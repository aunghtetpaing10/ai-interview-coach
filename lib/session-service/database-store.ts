import "server-only";

import { createHash } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import type {
  InterviewSessionRow,
  NewInterviewSessionRow,
  TargetRoleRow,
  TranscriptTurnRow,
} from "@/db/schema";
import {
  interviewSessions,
  targetRoles,
  transcriptAppendBatches,
  transcriptTurns,
} from "@/db/schema";
import { getDb } from "@/lib/db/client";
import {
  type AppendTranscriptTurnsAck,
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

    async findReusableSession(input): Promise<InterviewSessionRow | null> {
      const sessions = await db
        .select()
        .from(interviewSessions)
        .where(
          and(
            eq(interviewSessions.userId, input.userId),
            eq(interviewSessions.targetRoleId, input.targetRoleId),
            eq(interviewSessions.mode, input.mode),
            eq(interviewSessions.practiceStyle, input.practiceStyle ?? "live"),
            eq(interviewSessions.difficulty, input.difficulty ?? "standard"),
          ),
        )
        .orderBy(desc(interviewSessions.updatedAt))
        .limit(10);

      return (
        sessions.find(
          (session) =>
            session.status !== "completed" &&
            session.status !== "archived" &&
            (input.companyStyle ?? null) === (session.companyStyle ?? null) &&
            (input.questionId ?? null) === (session.questionId ?? null),
        ) ?? null
      );
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
    ): Promise<AppendTranscriptTurnsAck> {
      const createdAt = new Date();
      const batchId =
        input.batchId ??
        `legacy:${createdAt.getTime()}:${Math.random().toString(16).slice(2)}`;

      return db.transaction(async (tx) => {
        const session = await lockSessionRow(tx, input.userId, input.sessionId);

        if (!session) {
          throw toSessionNotFoundError();
        }

        if (session.status === "completed") {
          throw toCompletedSessionError();
        }

        const normalizedTurns = input.turns.map((turn) => ({
          speaker: turn.speaker,
          body: turn.body.trim(),
          seconds: turn.seconds,
          confidence: turn.confidence ?? 100,
        }));
        const requestHash = createHash("sha256")
          .update(JSON.stringify(normalizedTurns))
          .digest("hex");
        const [existingBatch] = await tx
          .select()
          .from(transcriptAppendBatches)
          .where(
            and(
              eq(transcriptAppendBatches.sessionId, session.id),
              eq(transcriptAppendBatches.batchId, batchId),
            ),
          )
          .for("update")
          .limit(1);

        if (existingBatch) {
          if (existingBatch.requestHash !== requestHash) {
            throw new SessionServiceError(
              "The same batch id was reused with different transcript turns.",
              "idempotency_conflict",
              409,
            );
          }

          return {
            session,
            batchId,
            replayed: true,
            firstSequenceIndex: existingBatch.firstSequenceIndex,
            nextSequenceIndex: existingBatch.lastSequenceIndex + 1,
            appendedTurns: existingBatch.turnCount,
          };
        }

        const baseSequenceIndex =
          input.baseSequenceIndex ?? session.nextTranscriptSequenceIndex;
        if (baseSequenceIndex !== session.nextTranscriptSequenceIndex) {
          throw new SessionServiceError(
            "Transcript sequence is out of date. Refresh and retry.",
            "stale_sequence",
            409,
          );
        }

        const firstSequenceIndex = session.nextTranscriptSequenceIndex;
        const rows = normalizedTurns.map((turn, index) => ({
          sessionId: session.id,
          speaker: turn.speaker,
          body: turn.body,
          seconds: turn.seconds,
          sequenceIndex: firstSequenceIndex + index,
          confidence: turn.confidence,
          createdAt,
        }));

        await tx.insert(transcriptTurns).values(rows);
        await tx.insert(transcriptAppendBatches).values({
          sessionId: session.id,
          batchId,
          requestHash,
          turnCount: rows.length,
          firstSequenceIndex,
          lastSequenceIndex: firstSequenceIndex + rows.length - 1,
          createdAt,
        });

        const [updatedSession] = await tx
          .update(interviewSessions)
          .set({
            status: "active",
            startedAt: session.startedAt ?? createdAt,
            nextTranscriptSequenceIndex: firstSequenceIndex + rows.length,
            updatedAt: createdAt,
          })
          .where(eq(interviewSessions.id, session.id))
          .returning();

        if (!updatedSession) {
          throw new Error("Failed to update session.");
        }

        return {
          session: updatedSession,
          batchId,
          replayed: false,
          firstSequenceIndex,
          nextSequenceIndex: firstSequenceIndex + rows.length,
          appendedTurns: rows.length,
        };
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
