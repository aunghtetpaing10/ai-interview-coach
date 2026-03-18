import { COMPETENCY_LABELS, normalizeScore } from "@/lib/domain/interview";
import type { Scorecard, TranscriptTurn } from "@/lib/types/interview";
import type {
  AnswerRewrite,
  CitationBlock,
  CitationSignal,
  PracticePlan,
  PracticePlanInput,
  RewriteInput,
  ReportBand,
  ScorecardSummary,
} from "@/lib/reporting/types";

function formatTimestamp(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function bandForScore(score: number): ReportBand {
  if (score >= 85) {
    return "ready";
  }

  if (score >= 75) {
    return "strong";
  }

  if (score >= 65) {
    return "steady";
  }

  return "watch";
}

function labelForBand(band: ReportBand) {
  switch (band) {
    case "ready":
      return "Interview ready";
    case "strong":
      return "Strong and trending up";
    case "steady":
      return "Solid foundation";
    case "watch":
      return "Needs targeted repair";
  }
}

function makeLabelList(entries: ReadonlyArray<readonly [string, number]>) {
  return entries.map(([key, value]) => `${COMPETENCY_LABELS[key as keyof typeof COMPETENCY_LABELS]} ${value}%`);
}

export function summarizeScorecard(scorecard: Scorecard): ScorecardSummary {
  const entries = Object.entries(scorecard.competencies)
    .map(([key, value]) => [key, value] as const)
    .sort((left, right) => right[1] - left[1]);
  const band = bandForScore(scorecard.overallScore);

  return {
    score: normalizeScore(scorecard.overallScore),
    band,
    headline: `${labelForBand(band)} with clear upside in ${COMPETENCY_LABELS[entries.at(-1)?.[0] as keyof typeof COMPETENCY_LABELS] ?? "the weakest area"}.`,
    strengths: makeLabelList(entries.slice(0, 2)),
    growthAreas: makeLabelList(entries.slice(-2).reverse()),
  };
}

export function buildCitationBlocks(
  transcript: ReadonlyArray<TranscriptTurn>,
  signals: ReadonlyArray<CitationSignal>,
): CitationBlock[] {
  return signals.map((signal, index) => {
    const turn = transcript.find((entry) => entry.id === signal.turnId);
    const quote = turn?.text ?? signal.insight;

    return {
      id: `citation-${index + 1}`,
      label:
        signal.emphasis === "strength"
          ? "Positive evidence"
          : signal.emphasis === "gap"
            ? "Gap to address"
            : "Follow-up probe",
      speaker: turn?.speaker ?? "candidate",
      timestamp: formatTimestamp(turn?.timestampSeconds ?? 0),
      quote,
      insight: signal.insight,
      emphasis: signal.emphasis,
    };
  });
}

export function rewriteAnswerDraft(input: RewriteInput): AnswerRewrite {
  const stronger =
    `I handled ${input.evidence}. ` +
    `The key gap was ${input.weakness.toLowerCase()}. ` +
    `A stronger answer keeps the ownership, names the decision, and closes with the result.`;

  return {
    id: `rewrite-${input.prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    prompt: input.prompt,
    stronger,
    whyItWorks:
      `It foregrounds the specific action and outcome while removing vague phrasing from the draft: "${input.draft}".`,
    evidence: input.evidence,
  };
}

export function generatePracticePlan(
  input: PracticePlanInput,
): PracticePlan {
  const primaryFocus =
    input.focusAreas[0] ??
    input.summary.growthAreas[0]?.split(" ")[0] ??
    "clarity";

  const stepTemplates = {
    clarity: [
      {
        title: "Rebuild the answer spine",
        minutes: 10,
        drill: "Rewrite the answer as a 30-second setup, 30-second action, and 30-second result.",
        outcome: "The answer opens cleanly and lands with a crisp point of view.",
      },
      {
        title: "Trim the filler",
        minutes: 8,
        drill: "Remove every sentence that does not change the reader's confidence in your ownership.",
        outcome: "The answer sounds sharper and more direct.",
      },
      {
        title: "Deliver the final pass",
        minutes: 12,
        drill: "Say the revised answer out loud twice and keep the timing under 90 seconds.",
        outcome: "The final version is ready for a live interviewer.",
      },
    ],
    ownership: [
      {
        title: "State your exact role",
        minutes: 10,
        drill: "Call out where you led, where you collaborated, and where you made the final call.",
        outcome: "The answer shows unmistakable ownership.",
      },
      {
        title: "Anchor one metric",
        minutes: 8,
        drill: "Add a before/after measure that proves your decision mattered.",
        outcome: "The story feels concrete instead of implied.",
      },
      {
        title: "Pressure test the follow-up",
        minutes: 12,
        drill: "Answer a skeptical follow-up about scope, tradeoffs, and constraints.",
        outcome: "You are ready for interruption and challenge.",
      },
    ],
    "technical depth": [
      {
        title: "Name the mechanism",
        minutes: 10,
        drill: "Explain how the system works at the component and data-flow level.",
        outcome: "The answer contains real technical substance.",
      },
      {
        title: "Surface the tradeoffs",
        minutes: 8,
        drill: "Pick one design choice and justify why it beats the obvious alternative.",
        outcome: "Your reasoning becomes more credible.",
      },
      {
        title: "Close on failure modes",
        minutes: 12,
        drill: "List the top two ways the design can fail and how you would detect them.",
        outcome: "You sound prepared for senior-level probing.",
      },
    ],
    "systems thinking": [
      {
        title: "State the constraints early",
        minutes: 10,
        drill: "Open with scale, latency, and consistency assumptions before naming components.",
        outcome: "The interview starts from the right framing.",
      },
      {
        title: "Map the bottlenecks",
        minutes: 8,
        drill: "Walk through the most likely throughput and reliability limits in the design.",
        outcome: "You show an operating mindset.",
      },
      {
        title: "Explain the fallback path",
        minutes: 12,
        drill: "Describe how you would degrade gracefully when the primary path is unavailable.",
        outcome: "The answer feels production-aware.",
      },
    ],
  } as const;

  const normalizedFocus = primaryFocus.toLowerCase();
  const template =
    normalizedFocus.includes("ownership")
      ? stepTemplates.ownership
      : normalizedFocus.includes("technical")
        ? stepTemplates["technical depth"]
        : normalizedFocus.includes("system")
          ? stepTemplates["systems thinking"]
          : stepTemplates.clarity;

  return {
    title: `${input.targetRole} practice plan`,
    focus: input.summary.headline,
    steps: template.map((step, index) => ({
      id: `practice-${index + 1}`,
      ...step,
    })),
  };
}
