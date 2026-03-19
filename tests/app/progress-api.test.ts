import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildProgressDashboardSnapshot } from "@/lib/analytics/progress";

const getWorkspaceUserMock = vi.hoisted(() => vi.fn());
const createPostgresProgressStoreMock = vi.hoisted(() => vi.fn());
const createProgressServiceMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceUser: getWorkspaceUserMock,
}));

vi.mock("@/lib/progress-service/database-store", () => ({
  createPostgresProgressStore: createPostgresProgressStoreMock,
}));

vi.mock("@/lib/progress-service/progress-service", () => ({
  createProgressService: createProgressServiceMock,
}));

import { GET as getProgressRoute } from "@/app/api/progress/route";

describe("progress api route", () => {
  beforeEach(() => {
    getWorkspaceUserMock.mockReset();
    createPostgresProgressStoreMock.mockReset();
    createProgressServiceMock.mockReset();
  });

  it("returns a 401 when no authenticated user is present", async () => {
    getWorkspaceUserMock.mockResolvedValue(null);

    const response = await getProgressRoute();

    expect(response.status).toBe(401);
  });

  it("returns the dashboard snapshot for the signed-in user", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user_1",
      email: "candidate@example.com",
      source: "supabase",
    });

    const sessions = [
      {
        id: "session-1",
        completedAt: "2026-03-01T18:15:00.000Z",
        track: "behavioral" as const,
        score: 64,
        durationMinutes: 18,
        followUps: 4,
        focus: "ownership clarity",
        note: "Good structure, but the impact statement still needs a measurable outcome.",
      },
    ];

    createProgressServiceMock.mockReturnValue({
      listProgressSessions: vi.fn().mockResolvedValue(sessions),
      getProgressSnapshot: vi.fn().mockResolvedValue(
        buildProgressDashboardSnapshot(sessions),
      ),
    });

    const response = await getProgressRoute();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessions,
      snapshot: buildProgressDashboardSnapshot(sessions),
    });
  });
});
