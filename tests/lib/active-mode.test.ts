import { describe, expect, it } from "vitest";
import type { InterviewSessionRow } from "@/db/schema";
import { deriveActiveMode } from "@/lib/data/active-mode";

function buildSession(
  overrides: Partial<InterviewSessionRow>,
): InterviewSessionRow {
  return {
    id: overrides.id ?? "session-1",
    userId: overrides.userId ?? "user-1",
    targetRoleId: overrides.targetRoleId ?? "target-1",
    mode: overrides.mode ?? "behavioral",
    status: overrides.status ?? "draft",
    title: overrides.title ?? "Interview",
    overallScore: overrides.overallScore ?? null,
    durationSeconds: overrides.durationSeconds ?? 18 * 60,
    startedAt: overrides.startedAt ?? null,
    endedAt: overrides.endedAt ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-03-18T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-03-18T10:15:00.000Z"),
  };
}

describe("deriveActiveMode", () => {
  it("defaults to behavioral when no sessions exist", () => {
    expect(deriveActiveMode([])).toBe("behavioral");
  });

  it("uses the most recently updated non-archived session mode", () => {
    const mode = deriveActiveMode([
      buildSession({
        id: "session-1",
        mode: "resume",
        status: "completed",
        updatedAt: new Date("2026-03-18T10:15:00.000Z"),
      }),
      buildSession({
        id: "session-2",
        mode: "project",
        status: "active",
        updatedAt: new Date("2026-03-18T10:25:00.000Z"),
      }),
    ]);

    expect(mode).toBe("project");
  });

  it("ignores archived sessions when deriving the active mode", () => {
    const mode = deriveActiveMode([
      buildSession({
        id: "session-1",
        mode: "system-design",
        status: "archived",
        updatedAt: new Date("2026-03-18T10:30:00.000Z"),
      }),
      buildSession({
        id: "session-2",
        mode: "behavioral",
        status: "completed",
        updatedAt: new Date("2026-03-18T10:15:00.000Z"),
      }),
    ]);

    expect(mode).toBe("behavioral");
  });
});
