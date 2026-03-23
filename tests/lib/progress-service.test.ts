import { describe, expect, it, vi } from "vitest";
import { buildProgressDashboardSnapshot } from "@/lib/analytics/progress";
import { createProgressService } from "@/lib/progress-service/progress-service";

vi.mock("server-only", () => ({}));

describe("progress service", () => {
  it("lists progress sessions directly from the store", async () => {
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
    const store = {
      listProgressSessions: vi.fn().mockResolvedValue(sessions),
    };

    const service = createProgressService(store);

    await expect(service.listProgressSessions("user_1")).resolves.toEqual(sessions);
    expect(store.listProgressSessions).toHaveBeenCalledWith("user_1");
  });

  it("returns a progress snapshot from persisted sessions", async () => {
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
      {
        id: "session-2",
        completedAt: "2026-03-03T18:15:00.000Z",
        track: "project" as const,
        score: 82,
        durationMinutes: 23,
        followUps: 6,
        focus: "metrics and scope",
        note: "The project story now shows scope, constraints, and measurable outcomes.",
      },
    ];

    const store = {
      listProgressSessions: vi.fn().mockResolvedValue(sessions),
    };

    const service = createProgressService(store);
    const snapshot = await service.getProgressSnapshot("user_1");

    expect(snapshot).toEqual(buildProgressDashboardSnapshot(sessions));
    expect(store.listProgressSessions).toHaveBeenCalledWith("user_1");
  });

  it("returns null when there are no completed sessions", async () => {
    const store = {
      listProgressSessions: vi.fn().mockResolvedValue([]),
    };

    const service = createProgressService(store);
    const snapshot = await service.getProgressSnapshot("user_1");

    expect(snapshot).toBeNull();
  });
});
