import { describe, expect, it } from "vitest";
import {
  buildCompetencyTrend,
  deriveReadinessState,
  getInterviewModeLabel,
  normalizeScore,
} from "@/lib/domain/interview";

describe("interview domain helpers", () => {
  it("normalizes scores into a valid percentage range", () => {
    expect(normalizeScore(105)).toBe(100);
    expect(normalizeScore(-4)).toBe(0);
    expect(normalizeScore(84.44)).toBe(84.4);
  });

  it("derives readiness bands", () => {
    expect(deriveReadinessState(90)).toBe("ready");
    expect(deriveReadinessState(75)).toBe("improving");
    expect(deriveReadinessState(64)).toBe("training");
  });

  it("returns human-readable interview labels", () => {
    expect(getInterviewModeLabel("system-design")).toBe("System design");
  });

  it("aggregates competency trends across scorecards", () => {
    const trend = buildCompetencyTrend([
      {
        mode: "behavioral",
        overallScore: 82,
        competencies: {
          clarity: 80,
          ownership: 70,
          "technical-depth": 78,
          communication: 88,
          "systems-thinking": 76,
        },
      },
      {
        mode: "resume",
        overallScore: 84,
        competencies: {
          clarity: 90,
          ownership: 80,
          "technical-depth": 82,
          communication: 86,
          "systems-thinking": 74,
        },
      },
    ]);

    expect(trend).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Communication", score: 88 }),
        expect.objectContaining({ label: "Ownership", score: 70 }),
      ]),
    );
  });
});
