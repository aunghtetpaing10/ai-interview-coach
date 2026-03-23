import { describe, expect, it } from "vitest";
import type {
  InterviewSessionRow,
  NewInterviewSessionRow,
  TargetRoleRow,
  TranscriptTurnRow,
} from "@/db/schema";
import {
  createInterviewSessionService,
  SessionServiceError,
  type InterviewSessionStore,
} from "@/lib/session-service/session-service";

function buildStore() {
  const targetRole: TargetRoleRow = {
    id: "target-role-1",
    userId: "user-1",
    title: "Platform engineer",
    companyType: "startup",
    level: "mid-level",
    focusAreas: ["systems-thinking", "technical-depth"],
    active: true,
    createdAt: new Date("2026-03-19T00:00:00.000Z"),
  };

  const sessions = new Map<string, InterviewSessionRow>();
  const turns = new Map<string, TranscriptTurnRow[]>();

  const store: InterviewSessionStore = {
    async getTargetRoleById(userId, targetRoleId) {
      return userId === targetRole.userId && targetRole.id === targetRoleId
        ? targetRole
        : null;
    },
    async createSession(row: NewInterviewSessionRow) {
      const session: InterviewSessionRow = {
        id: "session-1",
        userId: row.userId,
        targetRoleId: row.targetRoleId,
        mode: row.mode,
        status: row.status ?? "draft",
        title: row.title,
        overallScore: row.overallScore ?? null,
        durationSeconds: row.durationSeconds ?? 18 * 60,
        startedAt: row.startedAt ?? null,
        endedAt: row.endedAt ?? null,
        createdAt: row.createdAt ?? new Date("2026-03-19T00:00:00.000Z"),
        updatedAt: row.updatedAt ?? new Date("2026-03-19T00:00:00.000Z"),
      };

      sessions.set(session.id, session);
      turns.set(session.id, []);

      return session;
    },
    async getSession(userId, sessionId) {
      const session = sessions.get(sessionId);
      if (!session || session.userId !== userId) {
        return null;
      }

      return session;
    },
    async listTranscriptTurns(sessionId) {
      return [...(turns.get(sessionId) ?? [])];
    },
    async appendTranscriptTurns(input) {
      const session = sessions.get(input.sessionId);
      if (!session || session.userId !== input.userId) {
        throw new SessionServiceError("Session not found.", "not_found", 404);
      }

      if (session.status === "completed") {
        throw new SessionServiceError(
          "Completed sessions cannot accept new turns.",
          "invalid_state",
          409,
        );
      }

      const current = turns.get(input.sessionId) ?? [];
      const createdAt = new Date("2026-03-19T00:00:00.000Z");
      const appended = input.turns.map((row, index) => ({
        id: `turn-${current.length + index + 1}`,
        sessionId: input.sessionId,
        speaker: row.speaker,
        body: row.body,
        seconds: row.seconds,
        sequenceIndex: current.length + index,
        confidence: row.confidence ?? 100,
        createdAt,
      }));

      turns.set(input.sessionId, [...current, ...appended]);

      const updated = {
        ...session,
        status: "active" as const,
        startedAt: session.startedAt ?? createdAt,
        updatedAt: createdAt,
      };
      sessions.set(input.sessionId, updated);

      return updated;
    },
    async completeSession(input) {
      const session = sessions.get(input.sessionId);
      if (!session) {
        throw new SessionServiceError("Session not found.", "not_found", 404);
      }

      if (session.userId !== input.userId) {
        throw new SessionServiceError("Session not found.", "not_found", 404);
      }

      if (session.status === "completed") {
        return session;
      }

      const endedAt = input.endedAt ?? new Date("2026-03-19T00:18:00.000Z");
      const updated = {
        ...session,
        status: "completed" as const,
        endedAt,
        overallScore: input.overallScore ?? session.overallScore ?? null,
        updatedAt: endedAt,
      } satisfies InterviewSessionRow;

      sessions.set(input.sessionId, updated);
      return updated;
    },
  };

  return { store, targetRole, sessions, turns };
}

describe("createInterviewSessionService", () => {
  it("creates a draft session and returns an empty transcript", async () => {
    const { store } = buildStore();
    const service = createInterviewSessionService(store);

    const result = await service.createSession({
      userId: "user-1",
      targetRoleId: "target-role-1",
      mode: "system-design",
      title: "Platform interview",
      durationSeconds: 1200,
    });

    expect(result.session.status).toBe("draft");
    expect(result.session.title).toBe("Platform interview");
    expect(result.transcriptTurns).toEqual([]);
  });

  it("returns persisted sessions with transcript turns in sequence order", async () => {
    const { store } = buildStore();
    const service = createInterviewSessionService(store);
    await service.createSession({
      userId: "user-1",
      targetRoleId: "target-role-1",
      mode: "system-design",
      title: "Platform interview",
    });

    await service.appendTranscriptTurns({
      userId: "user-1",
      sessionId: "session-1",
      turns: [
        { speaker: "interviewer", body: "Design a cache.", seconds: 8 },
        { speaker: "candidate", body: "I would start with TTLs.", seconds: 26 },
      ],
    });

    const result = await service.getSession({
      userId: "user-1",
      sessionId: "session-1",
    });

    expect(result?.session.status).toBe("active");
    expect(result?.transcriptTurns.map((turn) => turn.body)).toEqual([
      "Design a cache.",
      "I would start with TTLs.",
    ]);
  });

  it("marks a session complete and stores the final score", async () => {
    const { store } = buildStore();
    const service = createInterviewSessionService(store);
    await service.createSession({
      userId: "user-1",
      targetRoleId: "target-role-1",
      mode: "system-design",
      title: "Platform interview",
    });

    const result = await service.completeSession({
      userId: "user-1",
      sessionId: "session-1",
      overallScore: 86,
      endedAt: new Date("2026-03-19T00:18:00.000Z"),
    });

    expect(result.session.status).toBe("completed");
    expect(result.session.overallScore).toBe(86);
    expect(result.session.endedAt).toEqual(
      new Date("2026-03-19T00:18:00.000Z"),
    );
  });

  it("rejects transcript appends after completion", async () => {
    const { store } = buildStore();
    const service = createInterviewSessionService(store);
    await service.createSession({
      userId: "user-1",
      targetRoleId: "target-role-1",
      mode: "system-design",
      title: "Platform interview",
    });
    await service.completeSession({
      userId: "user-1",
      sessionId: "session-1",
    });

    await expect(
      service.appendTranscriptTurns({
        userId: "user-1",
        sessionId: "session-1",
        turns: [{ speaker: "candidate", body: "Too late", seconds: 42 }],
      }),
    ).rejects.toMatchObject({
      code: "invalid_state",
      status: 409,
    });
  });
});
