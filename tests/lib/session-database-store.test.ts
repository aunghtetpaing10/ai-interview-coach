import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  interviewSessions,
  transcriptAppendBatches,
  transcriptTurns,
  type TranscriptTurnRow,
} from "@/db/schema";
import { createDatabaseInterviewSessionStore } from "@/lib/session-service/database-store";

const getDbMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("server-only", () => ({}));

function buildDbMock({ conflictSequenceIndex }: { conflictSequenceIndex?: number } = {}) {
  const state = {
    session: {
      id: "session-1",
      userId: "user-1",
      targetRoleId: "target-1",
      mode: "project" as const,
      status: "draft" as const,
      title: "Queue scaling drill",
      overallScore: null,
      durationSeconds: 18 * 60,
      nextTranscriptSequenceIndex: 1,
      startedAt: null,
      endedAt: null,
      createdAt: new Date("2026-03-19T00:00:00.000Z"),
      updatedAt: new Date("2026-03-19T00:00:00.000Z"),
    },
    transcriptTurns: [
      {
        id: "turn-1",
        sessionId: "session-1",
        speaker: "interviewer" as const,
        body: "Tell me about the queue.",
        seconds: 12,
        sequenceIndex: 0,
        confidence: 100,
        createdAt: new Date("2026-03-19T00:00:12.000Z"),
      },
    ] as TranscriptTurnRow[],
  };

  let selectedTable: unknown = null;

  const selectBuilder = {
    from(table: unknown) {
      selectedTable = table;
      return this;
    },
    where() {
      return this;
    },
    limit() {
      return this;
    },
    orderBy() {
      return this;
    },
    for() {
      return this;
    },
    then(onFulfilled: (value: unknown[]) => unknown, onRejected?: (reason: unknown) => unknown) {
      const value =
        selectedTable === interviewSessions
          ? [state.session]
          : selectedTable === transcriptTurns
            ? [...state.transcriptTurns]
            : [];

      return Promise.resolve(value).then(onFulfilled, onRejected);
    },
  };

  const tx = {
    select() {
      return selectBuilder;
    },
    insert(table: unknown) {
      return {
        values(rows: readonly Record<string, unknown>[] | Record<string, unknown>) {
          let executed = false;

          const executeInsert = () => {
            if (executed) {
              return [];
            }

            executed = true;
            if (table === transcriptAppendBatches) {
              return [rows];
            }

            if (table !== transcriptTurns || !Array.isArray(rows)) {
              return [];
            }

            if (
              conflictSequenceIndex !== undefined &&
              rows.some((row) => row.sequenceIndex === conflictSequenceIndex)
            ) {
              throw new Error("duplicate key value violates unique constraint");
            }

            const inserted = rows.map((row, index) => ({
              id: `turn-${state.transcriptTurns.length + index + 1}`,
              sessionId: row.sessionId as string,
              speaker: row.speaker as TranscriptTurnRow["speaker"],
              body: row.body as string,
              seconds: row.seconds as number,
              sequenceIndex: row.sequenceIndex as number,
              confidence: row.confidence as number,
              createdAt: row.createdAt as Date,
            })) satisfies TranscriptTurnRow[];

            state.transcriptTurns = [...state.transcriptTurns, ...inserted];
            return inserted;
          };

          return {
            returning() {
              return executeInsert();
            },
            then(onFulfilled: (value: unknown[]) => unknown, onRejected?: (reason: unknown) => unknown) {
              return Promise.resolve()
                .then(() => executeInsert())
                .then(onFulfilled, onRejected);
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(patch: Record<string, unknown>) {
          return {
            where() {
              return {
                returning() {
                  if (table !== interviewSessions) {
                    return [];
                  }

                  state.session = {
                    ...state.session,
                    ...patch,
                  };

                  return [state.session];
                },
              };
            },
          };
        },
      };
    },
  };

  const db = {
    transaction: vi.fn((callback: (transactionClient: typeof tx) => Promise<unknown>) =>
      callback(tx)
    ),
  };

  return { db, state };
}

describe("database interview session store", () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it("locks the session row and appends transcript turns in one transaction", async () => {
    const { db, state } = buildDbMock();
    getDbMock.mockReturnValue(db);

    const store = createDatabaseInterviewSessionStore();
    const session = await store.appendTranscriptTurns({
      userId: "user-1",
      sessionId: "session-1",
      turns: [
        { speaker: "interviewer", body: "Design the queue.", seconds: 18 },
        { speaker: "candidate", body: "Start with backpressure.", seconds: 35 },
      ],
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(session.session.status).toBe("active");
    expect(session.session.startedAt).toBeInstanceOf(Date);
    expect(session.session.startedAt).toEqual(state.session.startedAt);
    expect(state.transcriptTurns).toHaveLength(3);
    expect(state.transcriptTurns.slice(-2).map((turn) => turn.sequenceIndex)).toEqual([1, 2]);
  });

  it("propagates duplicate sequence constraint errors cleanly", async () => {
    const { db } = buildDbMock({ conflictSequenceIndex: 1 });
    getDbMock.mockReturnValue(db);

    const store = createDatabaseInterviewSessionStore();

    await expect(
      store.appendTranscriptTurns({
        userId: "user-1",
        sessionId: "session-1",
        turns: [{ speaker: "candidate", body: "I would shard it.", seconds: 29 }],
      }),
    ).rejects.toThrow(/unique constraint/i);
  });

  it("completes a session inside a transaction", async () => {
    const { db, state } = buildDbMock();
    getDbMock.mockReturnValue(db);

    const store = createDatabaseInterviewSessionStore();
    const session = await store.completeSession({
      userId: "user-1",
      sessionId: "session-1",
      overallScore: 88,
      endedAt: new Date("2026-03-19T00:18:00.000Z"),
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(session.status).toBe("completed");
    expect(session.overallScore).toBe(88);
    expect(state.session.status).toBe("completed");
  });
});
