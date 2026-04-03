import { describe, expect, it } from "vitest";
import { summarizeScorecard } from "@/lib/reporting/reporting";
import {
  buildCitationBlocks,
  generatePracticePlan,
  rewriteAnswerDraft,
} from "@/lib/reporting/reporting";
import { makeScorecard } from "@/tests/helpers/factories";

describe("reporting helpers", () => {
  const scorecard = makeScorecard("project", {
    overallScore: 83,
    dimensionScores: {
      credibility: 84,
      scope: 78,
      "decision-quality": 87,
      "technical-depth": 80,
      impact: 75,
    },
  });

  const transcript = [
    {
      id: "turn-1",
      speaker: "interviewer",
      text: "Tell me about the payment queue you scaled.",
      timestampSeconds: 14,
    },
    {
      id: "turn-2",
      speaker: "candidate",
      text: "I owned the retry policy and moved the queue onto Kafka.",
      timestampSeconds: 29,
    },
    {
      id: "turn-3",
      speaker: "candidate",
      text: "We improved throughput but I did not explain the rollback path clearly.",
      timestampSeconds: 47,
    },
  ] as const;

  it("summarizes the scorecard into a band and coaching labels", () => {
    const summary = summarizeScorecard(scorecard);

    expect(summary.band).toBe("strong");
    expect(summary.strengths[0]).toContain("Decision quality");
    expect(summary.growthAreas[0]).toContain("Impact");
    expect(summary.headline).toContain("Strong and trending up");
  });

  it("builds citation blocks from transcript evidence", () => {
    const citations = buildCitationBlocks(transcript, [
      {
        turnId: "turn-2",
        emphasis: "strength",
        insight: "The candidate clearly names a decision and an ownership area.",
      },
      {
        turnId: "turn-3",
        emphasis: "gap",
        insight: "The answer still needs a concrete rollback path.",
      },
    ]);

    expect(citations).toHaveLength(2);
    expect(citations[0]).toMatchObject({
      label: "Positive evidence",
      timestamp: "0:29",
      quote: "I owned the retry policy and moved the queue onto Kafka.",
    });
    expect(citations[1]).toMatchObject({
      label: "Gap to address",
      timestamp: "0:47",
    });
  });

  it("rewrites a weak answer without losing the evidence", () => {
    const rewrite = rewriteAnswerDraft({
      prompt: "Describe a project you led",
      draft: "We improved the queue and the rollout went fine.",
      evidence: "the retry policy and rollback plan for the queue rollout",
      weakness: "It was too vague about who made the decisions",
    });

    expect(rewrite.stronger).toContain(
      "I handled the retry policy and rollback plan for the queue rollout.",
    );
    expect(rewrite.stronger).toContain("The key gap was it was too vague about who made the decisions.");
    expect(rewrite.whyItWorks).toContain("We improved the queue and the rollout went fine.");
  });

  it("generates a tailored practice plan from the weakest focus area", () => {
    const plan = generatePracticePlan({
      targetRole: "Mid-level software engineer",
      scorecard,
      summary: summarizeScorecard(scorecard),
      focusAreas: ["Systems thinking"],
    });

    expect(plan.title).toContain("Mid-level software engineer");
    expect(plan.focus).toContain("Project walkthrough focus");
    expect(plan.steps[0].title).toContain("Tighten");
    expect(plan.steps).toHaveLength(3);
  });
});
