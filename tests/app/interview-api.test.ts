import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  InterviewSessionRow,
  NewInterviewSessionRow,
  TargetRoleRow,
  TranscriptTurnRow,
} from "@/db/schema";
import { SessionServiceError } from "@/lib/session-service/session-service";
import { makeInterviewSessionRow } from "@/tests/helpers/factories";

const getWorkspaceUserMock = vi.hoisted(() => vi.fn());
const createWorkspaceInterviewSessionStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceUser: getWorkspaceUserMock,
}));

vi.mock("@/lib/workspace/runtime", () => ({
  createWorkspaceInterviewSessionStore: createWorkspaceInterviewSessionStoreMock,
}));

import { GET as getSessionRoute } from "@/app/api/interview/sessions/[sessionId]/route";
import { POST as appendTurnsRoute } from "@/app/api/interview/sessions/[sessionId]/turns/route";
import { POST as completeSessionRoute } from "@/app/api/interview/sessions/[sessionId]/complete/route";
import { POST as createSessionRoute } from "@/app/api/interview/sessions/route";

function buildStore(userId = "user-1") {
  const targetRole: TargetRoleRow = {
    id: "target-role-1",
    userId,
    title: "Platform engineer",
    companyType: "startup",
    level: "mid-level",
    focusAreas: ["systems-thinking"],
    active: true,
    createdAt: new Date("2026-03-19T00:00:00.000Z"),
  };

  const sessions = new Map<string, InterviewSessionRow>();
  const turns = new Map<string, TranscriptTurnRow[]>();

  const store = {
    async getTargetRoleById(userId: string, targetRoleId: string) {
      return userId === targetRole.userId && targetRole.id === targetRoleId
        ? targetRole
        : null;
    },
    async createSession(row: NewInterviewSessionRow) {
      const session: InterviewSessionRow = makeInterviewSessionRow({
        id: "session-1",
        userId: row.userId,
        targetRoleId: row.targetRoleId,
        mode: row.mode,
        practiceStyle: row.practiceStyle ?? "live",
        difficulty: row.difficulty ?? "challenging",
        companyStyle: row.companyStyle ?? null,
        questionId: row.questionId ?? null,
        status: row.status ?? "draft",
        title: row.title,
        overallScore: row.overallScore ?? null,
        durationSeconds: row.durationSeconds ?? 18 * 60,
        startedAt: row.startedAt ?? null,
        endedAt: row.endedAt ?? null,
        createdAt: row.createdAt ?? new Date("2026-03-19T00:00:00.000Z"),
        updatedAt: row.updatedAt ?? new Date("2026-03-19T00:00:00.000Z"),
      });

      sessions.set(session.id, session);
      turns.set(session.id, []);
      return session;
    },
    async getSession(userId: string, sessionId: string) {
      const session = sessions.get(sessionId);
      if (!session || session.userId !== userId) {
        return null;
      }
      return session;
    },
    async listTranscriptTurns(sessionId: string) {
      return [...(turns.get(sessionId) ?? [])];
    },
    async appendTranscriptTurns(input: {
      userId: string;
      sessionId: string;
      turns: readonly {
        speaker: TranscriptTurnRow["speaker"];
        body: string;
        seconds: number;
        confidence?: number;
      }[];
    }) {
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
    async completeSession(input: {
      userId: string;
      sessionId: string;
      overallScore?: number;
      endedAt?: Date;
    }) {
      const session = sessions.get(input.sessionId);
      if (!session || session.userId !== input.userId) {
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

  return { targetRole, store };
}

describe("interview api routes", () => {
  beforeEach(() => {
    getWorkspaceUserMock.mockReset();
    createWorkspaceInterviewSessionStoreMock.mockReset();
  });

  it("rejects unauthenticated session creation", async () => {
    getWorkspaceUserMock.mockResolvedValue(null);

    const response = await createSessionRoute(
      new Request("http://localhost/api/interview/sessions", {
        method: "POST",
        body: JSON.stringify({
          mode: "system-design",
          targetRoleId: "target-role-1",
          title: "Platform interview",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("creates, appends turns, retrieves, and completes a session", async () => {
    const { store } = buildStore();
    getWorkspaceUserMock.mockResolvedValue({
      id: "user-1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createWorkspaceInterviewSessionStoreMock.mockReturnValue(store);

    const createResponse = await createSessionRoute(
      new Request("http://localhost/api/interview/sessions", {
        method: "POST",
        body: JSON.stringify({
          mode: "system-design",
          targetRoleId: "target-role-1",
          title: "Platform interview",
          durationSeconds: 1200,
        }),
      }),
    );

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.session.title).toBe("Platform interview");
    expect(created.session.status).toBe("draft");

    const turnsResponse = await appendTurnsRoute(
      new Request(
        "http://localhost/api/interview/sessions/session-1/turns",
        {
          method: "POST",
          body: JSON.stringify({
            turns: [
              {
                speaker: "interviewer",
                body: "Design a cache.",
                seconds: 8,
              },
              {
                speaker: "candidate",
                body: "I would start with TTLs.",
                seconds: 26,
              },
            ],
          }),
        },
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(turnsResponse.status).toBe(200);
    const appended = await turnsResponse.json();
    expect(appended.session.status).toBe("active");
    expect(appended.transcriptTurns).toHaveLength(2);

    const getResponse = await getSessionRoute(new Request("http://localhost/api/interview/sessions/session-1"), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(getResponse.status).toBe(200);
    const fetched = await getResponse.json();
    expect(fetched.transcriptTurns).toHaveLength(2);

    const completeResponse = await completeSessionRoute(
      new Request(
        "http://localhost/api/interview/sessions/session-1/complete",
        {
          method: "POST",
          body: JSON.stringify({
            overallScore: 86,
          }),
        },
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(completeResponse.status).toBe(200);
    const completed = await completeResponse.json();
    expect(completed.session.status).toBe("completed");
    expect(completed.session.overallScore).toBe(86);
  });

  it("rejects invalid session creation payloads with field errors", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user-1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createWorkspaceInterviewSessionStoreMock.mockReturnValue({
      getTargetRoleById: vi.fn(),
      createSession: vi.fn(),
      getSession: vi.fn(),
      listTranscriptTurns: vi.fn(),
      appendTranscriptTurns: vi.fn(),
      completeSession: vi.fn(),
    });

    const response = await createSessionRoute(
      new Request("http://localhost/api/interview/sessions", {
        method: "POST",
        body: JSON.stringify({
          mode: "invalid-mode",
          targetRoleId: "target-role-1",
          title: "Platform interview",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid session request.",
      fieldErrors: {
        mode: expect.any(Array),
      },
    });
  });

  it("rejects invalid turn payloads with field errors", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user-1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createWorkspaceInterviewSessionStoreMock.mockReturnValue(buildStore().store);

    const response = await appendTurnsRoute(
      new Request(
        "http://localhost/api/interview/sessions/session-1/turns",
        {
          method: "POST",
          body: JSON.stringify({
            turns: [
              {
                speaker: "candidate",
                body: "Too short",
                seconds: -1,
                confidence: 110,
              },
            ],
          }),
        },
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid transcript turns.",
      fieldErrors: {
        turns: expect.any(Array),
      },
    });
  });

  it("rejects unauthenticated transcript append requests", async () => {
    getWorkspaceUserMock.mockResolvedValue(null);

    const response = await appendTurnsRoute(
      new Request(
        "http://localhost/api/interview/sessions/session-1/turns",
        {
          method: "POST",
          body: JSON.stringify({
            batchId: "batch-1",
            baseSequenceIndex: 0,
            turns: [
              {
                speaker: "candidate",
                body: "Here is my follow-up answer with clear ownership and impact details.",
                seconds: 12,
              },
            ],
          }),
        },
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
  });

  it("returns service error details when appending to an unknown session", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user-1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createWorkspaceInterviewSessionStoreMock.mockReturnValue(buildStore().store);

    const response = await appendTurnsRoute(
      new Request(
        "http://localhost/api/interview/sessions/missing/turns",
        {
          method: "POST",
          body: JSON.stringify({
            batchId: "batch-2",
            baseSequenceIndex: 0,
            turns: [
              {
                speaker: "candidate",
                body: "I tracked ownership and outcomes across the project lifecycle.",
                seconds: 32,
              },
            ],
          }),
        },
      ),
      { params: Promise.resolve({ sessionId: "missing" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Session not found.",
      code: "not_found",
    });
  });

  it("rejects invalid completion payloads with field errors", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user-1",
      email: "candidate@example.com",
      source: "supabase",
    });
    createWorkspaceInterviewSessionStoreMock.mockReturnValue(buildStore().store);

    const response = await completeSessionRoute(
      new Request(
        "http://localhost/api/interview/sessions/session-1/complete",
        {
          method: "POST",
          body: JSON.stringify({
            overallScore: 101,
          }),
        },
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid completion request.",
      fieldErrors: {
        overallScore: expect.any(Array),
      },
    });
  });

  it("creates a draft session for a demo workspace user", async () => {
    const { store } = buildStore("demo-user");
    getWorkspaceUserMock.mockResolvedValue({
      id: "demo-user",
      email: "candidate@example.com",
      source: "demo",
    });
    createWorkspaceInterviewSessionStoreMock.mockReturnValue(store);

    const response = await createSessionRoute(
      new Request("http://localhost/api/interview/sessions", {
        method: "POST",
        body: JSON.stringify({
          mode: "system-design",
          targetRoleId: "target-role-1",
          title: "Platform interview",
          durationSeconds: 1200,
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        session: expect.objectContaining({
          status: "draft",
        }),
      }),
    );
  });
});
