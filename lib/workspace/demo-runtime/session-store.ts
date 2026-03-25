import "server-only";

import type { InterviewSessionRow } from "@/db/schema";
import { SessionServiceError, type CompleteInterviewSessionInput, type InterviewSessionStore } from "@/lib/session-service/session-service";
import { clone, demoRuntime, DEMO_USER } from "./state";

export function createDemoInterviewSessionStore(): InterviewSessionStore {
  return {
    getTargetRoleById: async (userId: string, targetRoleId: string) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id || state.targetRole.id !== targetRoleId) {
        return null;
      }

      return clone(state.targetRole);
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
        startedAt,
        endedAt,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.nextSessionNumber += 1;
      state.sessions.unshift(session);
      state.transcriptTurnsBySessionId.set(session.id, []);
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
      demoRuntime.writeState(state);

      return clone(session);
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
