import { describe, expect, it } from "vitest";
import {
  averageProgressScore,
  buildProgressDashboardSnapshot,
  buildProgressTimeline,
  computePracticeStreak,
  computeProgressMomentum,
  PROGRESS_SESSIONS,
  sortProgressSessions,
} from "@/lib/analytics/progress";

describe("progress helpers", () => {
  it("sorts sessions chronologically", () => {
    const reversed = [...PROGRESS_SESSIONS].reverse();
    const sorted = sortProgressSessions(reversed);

    expect(sorted[0].id).toBe("session-01");
    expect(sorted.at(-1)?.id).toBe("session-09");
  });

  it("computes aggregate metrics for the dashboard", () => {
    expect(averageProgressScore(PROGRESS_SESSIONS)).toBe(76);
    expect(computeProgressMomentum(PROGRESS_SESSIONS)).toBe(7);
    expect(computePracticeStreak(PROGRESS_SESSIONS)).toBe(5);
  });

  it("builds timeline points and a snapshot", () => {
    const timeline = buildProgressTimeline(PROGRESS_SESSIONS);
    const snapshot = buildProgressDashboardSnapshot(PROGRESS_SESSIONS);

    expect(timeline[0]).toEqual(
      expect.objectContaining({
        label: "Mar 1",
        score: 64,
        followUps: 4,
        track: "behavioral",
      }),
    );
    expect(snapshot.readinessBand).toBe("improving");
    expect(snapshot.weakestTrack.track).toBe("behavioral");
    expect(snapshot.strongestTrack.track).toBe("system-design");
    expect(snapshot.latestSession.id).toBe("session-09");
  });
});
