import { describe, expect, it } from "vitest";
import { REPORT_EVAL_CASES, REPORT_PROMPT_FIXTURES } from "@/lib/evals/fixtures";

describe("report eval fixtures", () => {
  it("exposes stable prompt fixtures", () => {
    expect(REPORT_PROMPT_FIXTURES).toHaveLength(3);
    expect(REPORT_PROMPT_FIXTURES[0]).toMatchObject({
      id: "report-rubric-v1",
      version: "2026-03-19",
    });
    expect(REPORT_PROMPT_FIXTURES[1].guardrails).toContain(
      "Do not invent metrics that are not present in the transcript.",
    );
  });

  it("covers all reporting eval categories", () => {
    expect(REPORT_EVAL_CASES.map((item) => item.category)).toEqual([
      "scorecard",
      "citation",
      "rewrite",
      "practice-plan",
    ]);
    expect(REPORT_EVAL_CASES.every((item) => item.expected.length > 0)).toBe(
      true,
    );
  });
});
