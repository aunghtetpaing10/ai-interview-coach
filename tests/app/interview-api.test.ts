import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  InterviewSessionRow,
  NewInterviewSessionRow,
  TargetRoleRow,
  TranscriptTurnRow,
} from "@/db/schema";

const getWorkspaceUserMock = vi.hoisted(() => vi.fn());
const createDatabaseInterviewSessionStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceUser: getWorkspaceUserMock,
}));

vi.mock("@/lib/session-service/database-store", () => ({
  createDatabaseInterviewSessionStore: createDatabaseInterviewSessionStoreMock,
}));

import { GET as getSessionRoute } from "@/app/api/interview/sessions/[sessionId]/route";
import { POST as appendTurnsRoute } from "@/app/api/interview/sessions/[sessionId]/turns/route";
import { POST as completeSessionRoute } from "@/app/api/interview/sessions/[sessionId]/complete/route";
import { POST as createSessionRoute } from "@/app/api/interview/sessions/route";

function buildStore() {
  const targetRole: TargetRoleRow = {
    id: "target-role-1",
    userId: "user-1",
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
    async appendTranscriptTurns(sessionId: string, rows: readonly { speaker: TranscriptTurnRow["speaker"]; body: string; seconds: number; confidence?: number; sequenceIndex?: number; }[]) {
      const current = turns.get(sessionId) ?? [];
      const appended = rows.map((row, index) => ({
        id: `turn-${current.length + index + 1}`,
        sessionId,
        speaker: row.speaker,
        body: row.body,
        seconds: row.seconds,
        sequenceIndex: row.sequenceIndex ?? current.length + index,
        confidence: row.confidence ?? 100,
        createdAt: new Date("2026-03-19T00:00:00.000Z"),
      }));
      turns.set(sessionId, [...current, ...appended]);
      return appended;
    },
    async updateSession(sessionId: string, patch: Partial<InterviewSessionRow>) {
      const session = sessions.get(sessionId);
      if (!session) {
        throw new Error("missing session");
      }

      const updated = { ...session, ...patch } as InterviewSessionRow;
      sessions.set(sessionId, updated);
      return updated;
    },
  };

  return { targetRole, store };
}

describe("interview api routes", () => {
  beforeEach(() => {
    getWorkspaceUserMock.mockReset();
    createDatabaseInterviewSessionStoreMock.mockReset();
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
    createDatabaseInterviewSessionStoreMock.mockReturnValue(store);

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
});
