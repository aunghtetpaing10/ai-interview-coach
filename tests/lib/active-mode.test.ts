import { describe, expect, it } from "vitest";
import { deriveActiveMode } from "@/lib/data/active-mode";
import { makeInterviewSessionRow } from "@/tests/helpers/factories";

function buildSession(
  overrides: Parameters<typeof makeInterviewSessionRow>[0],
) {
  return makeInterviewSessionRow(overrides);
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
