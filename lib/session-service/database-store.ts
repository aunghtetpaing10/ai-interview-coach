import "server-only";

import { and, asc, eq } from "drizzle-orm";
import type {
  InterviewSessionRow,
  NewInterviewSessionRow,
  NewTranscriptTurnRow,
  TargetRoleRow,
  TranscriptTurnRow,
} from "@/db/schema";
import {
  interviewSessions,
  targetRoles,
  transcriptTurns,
} from "@/db/schema";
import { getDb } from "@/lib/db/client";
import type { InterviewSessionStore } from "@/lib/session-service/session-service";

export type DatabaseInterviewSessionStore = InterviewSessionStore;

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
      sessionId: string,
      rows: readonly NewTranscriptTurnRow[],
    ): Promise<readonly TranscriptTurnRow[]> {
      if (rows.length === 0) {
        return [];
      }

      return db.insert(transcriptTurns).values([...rows]).returning();
    },

    async updateSession(
      sessionId: string,
      patch: Partial<InterviewSessionRow>,
    ): Promise<InterviewSessionRow> {
      const [session] = await db
        .update(interviewSessions)
        .set({
          ...patch,
          updatedAt: patch.updatedAt ?? new Date(),
        })
        .where(eq(interviewSessions.id, sessionId))
        .returning();

      if (!session) {
        throw new Error("Failed to update session.");
      }

      return session;
    },
  };
}
