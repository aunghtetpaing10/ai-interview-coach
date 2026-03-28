import "server-only";

import { createHash } from "node:crypto";
import type { InterviewSessionRow } from "@/db/schema";
import {
  SessionServiceError,
  type AppendTranscriptTurnsAck,
  type CompleteInterviewSessionInput,
  type InterviewSessionStore,
} from "@/lib/session-service/session-service";
import { clone, demoRuntime, DEMO_USER } from "./state";

export function createDemoInterviewSessionStore(): InterviewSessionStore {
  const appendBatchesBySessionId = new Map<
    string,
    Map<
      string,
      {
        requestHash: string;
        firstSequenceIndex: number;
        nextSequenceIndex: number;
        turnCount: number;
      }
    >
  >();

  return {
    getTargetRoleById: async (userId: string, targetRoleId: string) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id || state.targetRole.id !== targetRoleId) {
        return null;
      }

      return clone(state.targetRole);
    },
    findReusableSession: async (input) => {
      const state = demoRuntime.readState();
      const reusableSession = state.sessions.find(
        (session) =>
          session.userId === input.userId &&
          session.targetRoleId === input.targetRoleId &&
          session.mode === input.mode &&
          session.status !== "completed" &&
          session.status !== "archived",
      );

      return reusableSession ? clone(reusableSession) : null;
    },
    createSession: async (row) => {
      const state = demoRuntime.readState();
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

      const timestamp = demoRuntime.advanceTime(state);
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
        nextTranscriptSequenceIndex: row.nextTranscriptSequenceIndex ?? 0,
        startedAt,
        endedAt,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.nextSessionNumber += 1;
      state.sessions.unshift(session);
      state.transcriptTurnsBySessionId.set(session.id, []);
      appendBatchesBySessionId.set(session.id, new Map());
      demoRuntime.writeState(state);

      return clone(session);
    },
    getSession: async (userId: string, sessionId: string) => {
      const state = demoRuntime.readState();
      const session = state.sessions.find(
        (candidate) => candidate.id === sessionId && candidate.userId === userId,
      );

      return session ? clone(session) : null;
    },
    listTranscriptTurns: async (sessionId: string) => {
      const turns = demoRuntime.readState().transcriptTurnsBySessionId.get(sessionId) ?? [];

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
      const state = demoRuntime.readState();
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

      const createdAt = demoRuntime.advanceTime(state);
      const batchId =
        input.batchId ??
        `legacy:${createdAt.getTime()}:${Math.random().toString(16).slice(2)}`;
      const normalizedTurns = input.turns.map((turn) => ({
        speaker: turn.speaker,
        body: turn.body.trim(),
        seconds: turn.seconds,
        confidence: turn.confidence ?? 100,
      }));
      const requestHash = createHash("sha256")
        .update(JSON.stringify(normalizedTurns))
        .digest("hex");
      const sessionBatchMap =
        appendBatchesBySessionId.get(session.id) ?? new Map();
      appendBatchesBySessionId.set(session.id, sessionBatchMap);
      const existingBatch = sessionBatchMap.get(batchId);

      if (existingBatch) {
        if (existingBatch.requestHash !== requestHash) {
          throw new SessionServiceError(
            "The same batch id was reused with different transcript turns.",
            "idempotency_conflict",
            409,
          );
        }

        const replayAck: AppendTranscriptTurnsAck = {
          session: clone(session),
          batchId,
          replayed: true,
          firstSequenceIndex: existingBatch.firstSequenceIndex,
          nextSequenceIndex: existingBatch.nextSequenceIndex,
          appendedTurns: existingBatch.turnCount,
        };

        return replayAck;
      }

      const nextSequenceIndex = session.nextTranscriptSequenceIndex ?? 0;
      const baseSequenceIndex = input.baseSequenceIndex ?? nextSequenceIndex;
      if (baseSequenceIndex !== nextSequenceIndex) {
        throw new SessionServiceError(
          "Transcript sequence is out of date. Refresh and retry.",
          "stale_sequence",
          409,
        );
      }

      const currentTurns = state.transcriptTurnsBySessionId.get(session.id) ?? [];
      const appendedTurns = normalizedTurns.map((turn, index) => ({
        id: `demo-turn-${session.id}-${nextSequenceIndex + index}`,
        sessionId: session.id,
        speaker: turn.speaker,
        body: turn.body,
        seconds: turn.seconds,
        sequenceIndex: nextSequenceIndex + index,
        confidence: turn.confidence,
        createdAt,
      }));

      state.transcriptTurnsBySessionId.set(session.id, [...currentTurns, ...appendedTurns]);
      session.status = "active";
      session.startedAt = session.startedAt ?? createdAt;
      session.nextTranscriptSequenceIndex = nextSequenceIndex + appendedTurns.length;
      session.updatedAt = createdAt;
      sessionBatchMap.set(batchId, {
        requestHash,
        firstSequenceIndex: nextSequenceIndex,
        nextSequenceIndex: nextSequenceIndex + appendedTurns.length,
        turnCount: appendedTurns.length,
      });
      demoRuntime.writeState(state);

      return {
        session: clone(session),
        batchId,
        replayed: false,
        firstSequenceIndex: nextSequenceIndex,
        nextSequenceIndex: nextSequenceIndex + appendedTurns.length,
        appendedTurns: appendedTurns.length,
      } satisfies AppendTranscriptTurnsAck;
    },
    completeSession: async (input: CompleteInterviewSessionInput) => {
      const state = demoRuntime.readState();
      const session = state.sessions.find(
        (candidate) => candidate.id === input.sessionId && candidate.userId === input.userId,
      );

      if (!session) {
        throw new SessionServiceError("Session not found.", "not_found", 404);
      }

      if (session.status === "completed") {
        return clone(session);
      }

      const endedAt = input.endedAt ?? demoRuntime.advanceTime(state);
      session.status = "completed";
      session.endedAt = endedAt;
      session.overallScore = input.overallScore ?? session.overallScore ?? null;
      session.updatedAt = endedAt;
      demoRuntime.writeState(state);

      return clone(session);
    },
  };
}
