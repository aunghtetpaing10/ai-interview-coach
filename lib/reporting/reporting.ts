import {
  getInterviewModeLabel,
  getLowestDimension,
  normalizeScore,
  normalizeScorecard,
} from "@/lib/domain/interview";
import type { Scorecard, StoredScorecard, TranscriptTurn } from "@/lib/types/interview";
import type {
  AnswerRewrite,
  CitationBlock,
  CitationSignal,
  PracticePlan,
  PracticePlanInput,
  ReportArtifactSection,
  ReportBand,
  RewriteInput,
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

function makeDimensionList(
  entries: ReadonlyArray<{ label: string; score: number }>,
) {
  return entries.map((entry) => `${entry.label} ${entry.score}%`);
}

export function summarizeScorecard(scorecardInput: Scorecard | StoredScorecard): ScorecardSummary {
  const scorecard = normalizeScorecard(scorecardInput);
  const entries = scorecard.dimensions
    .map((dimension) => ({
      label: dimension.label,
      score: normalizeScore(dimension.score),
    }))
    .sort((left, right) => right.score - left.score);
  const weakestDimension = entries.at(-1);
  const band = bandForScore(scorecard.overallScore);

  return {
    score: normalizeScore(scorecard.overallScore),
    band,
    headline: `${labelForBand(band)} in ${getInterviewModeLabel(scorecard.mode).toLowerCase()} with the clearest upside in ${weakestDimension?.label.toLowerCase() ?? "the weakest area"}.`,
    strengths: makeDimensionList(entries.slice(0, 2)),
    growthAreas: makeDimensionList(entries.slice(-2).reverse()),
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
    `A stronger answer names the decision, the trade-off, and the outcome in the first minute.`;

  return {
    id: `rewrite-${input.prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    prompt: input.prompt,
    stronger,
    whyItWorks:
      `It replaces vague phrasing with accountable language while preserving the original evidence: "${input.draft}".`,
    evidence: input.evidence,
  };
}

function createPlanStep(
  index: number,
  title: string,
  minutes: number,
  drill: string,
  outcome: string,
) {
  return {
    id: `practice-${index}`,
    title,
    minutes,
    drill,
    outcome,
  };
}

export function generatePracticePlan(input: PracticePlanInput): PracticePlan {
  const scorecard = normalizeScorecard(input.scorecard);
  const weakestDimension = getLowestDimension(scorecard);

  const templates: Record<
    ScorecardSummary["band"] | "default",
    { title: string; steps: PracticePlan["steps"] }
  > = {
    default: {
      title: `${input.targetRole} practice plan`,
      steps: [
        createPlanStep(
          1,
          "Re-answer the opening question",
          10,
          "Keep the first answer under 90 seconds and make the structure obvious.",
          "The opening answer becomes easier to follow under pressure.",
        ),
        createPlanStep(
          2,
          "Pressure-test one follow-up",
          12,
          "Answer one skeptical follow-up without restarting the whole story.",
          "The answer survives interruptions and deeper probing.",
        ),
        createPlanStep(
          3,
          "Run a second pass",
          15,
          "Repeat the same question and focus only on the weakest scoring dimension.",
          "The next rep turns feedback into a measurable improvement.",
        ),
      ],
    },
    ready: {
      title: `${input.targetRole} finishing plan`,
      steps: [
        createPlanStep(
          1,
          "Sharpen the close",
          8,
          "Trim the answer ending so the main trade-off lands in one sentence.",
          "The answer finishes like an interview-ready story instead of a draft.",
        ),
        createPlanStep(
          2,
          "Rotate a similar question",
          12,
          "Use the same structure on a nearby question family without losing precision.",
          "Strength transfers instead of staying tied to one prompt.",
        ),
        createPlanStep(
          3,
          "Run a live mock",
          15,
          "Switch to live mode and keep the answer quality under tighter interviewer pressure.",
          "The result holds up in a more realistic mock.",
        ),
      ],
    },
    strong: {
      title: `${input.targetRole} progression plan`,
      steps: [
        createPlanStep(
          1,
          "Tighten the weakest dimension",
          10,
          `Spend one focused pass on ${weakestDimension?.label.toLowerCase() ?? "the weakest area"}.`,
          "The next answer closes the most obvious gap first.",
        ),
        createPlanStep(
          2,
          "Add one harder follow-up",
          12,
          "Ask for one more skeptical interviewer probe and answer it directly.",
          "The story becomes sturdier under challenge.",
        ),
        createPlanStep(
          3,
          "Replay the same prompt",
          15,
          "Repeat the same question immediately and compare the second answer with the first.",
          "Improvement becomes visible in the transcript, not just assumed.",
        ),
      ],
    },
    steady: {
      title: `${input.targetRole} repair plan`,
      steps: [
        createPlanStep(
          1,
          "Fix the answer spine",
          10,
          "State the framing, decision, and result before expanding into details.",
          "The answer stops drifting and starts reading like a clear argument.",
        ),
        createPlanStep(
          2,
          "Call out the missing proof",
          10,
          "Add one concrete piece of evidence the original answer implied but did not state.",
          "The answer sounds more credible and less generic.",
        ),
        createPlanStep(
          3,
          "Replay with timing pressure",
          12,
          "Run the answer again and keep it inside a tighter time budget.",
          "The candidate can stay clear without rambling.",
        ),
      ],
    },
    watch: {
      title: `${input.targetRole} reset plan`,
      steps: [
        createPlanStep(
          1,
          "Reframe the question",
          8,
          "Clarify what the interviewer is really asking before answering again.",
          "The next attempt starts on the right problem.",
        ),
        createPlanStep(
          2,
          "Build a structured draft",
          12,
          "Write a short outline before speaking so the main points are visible.",
          "The answer has a usable skeleton instead of improvisation only.",
        ),
        createPlanStep(
          3,
          "Run a guided drill",
          15,
          "Stay in guided mode and fix one weakness at a time before switching back to live pressure.",
          "The fundamentals improve before the next full mock.",
        ),
      ],
    },
  };

  const resolved = templates[input.summary.band] ?? templates.default;

  return {
    title: resolved.title,
    focus: `${getInterviewModeLabel(scorecard.mode)} focus on ${weakestDimension?.label.toLowerCase() ?? "the lowest dimension"}.`,
    steps: resolved.steps,
  };
}

export function buildArtifactSections(input: {
  mode: PracticePlanInput["scorecard"]["mode"];
  summary: ScorecardSummary;
  transcript: ReadonlyArray<TranscriptTurn>;
  strongestLine?: string;
}): ReportArtifactSection[] {
  const transcriptPreview =
    input.transcript.find((turn) => turn.speaker === "candidate")?.text ??
    input.summary.headline;
  const strongestLine = input.strongestLine ?? input.summary.strengths[0] ?? input.summary.headline;

  switch (input.mode) {
    case "behavioral":
      return [
        {
          id: "behavioral-story-check",
          title: "STAR repair checklist",
          description: "Use this to make the next behavioral answer more interview-ready.",
          items: [
            {
              title: "Situation and stakes",
              detail: "State why the problem mattered before describing the work.",
            },
            {
              title: "Action ownership",
              detail: `Turn "${transcriptPreview}" into a first-person action sequence.`,
            },
            {
              title: "Result proof",
              detail: "Close with one metric or concrete business outcome.",
            },
          ],
        },
        {
          id: "behavioral-proof-gaps",
          title: "Missing proof",
          description: "These are the proof points the next answer should surface explicitly.",
          items: input.summary.growthAreas.map((item) => ({
            title: item,
            detail: "Add one sentence of evidence that makes this dimension believable.",
          })),
        },
      ];
    case "coding":
      return [
        {
          id: "coding-reasoning-timeline",
          title: "Reasoning timeline",
          description: "A stronger coding answer should move through these checkpoints in order.",
          items: [
            {
              title: "Clarify",
              detail: "Restate the problem, edge cases, and constraints before proposing a solution.",
            },
            {
              title: "Design",
              detail: "Explain the algorithm in plain language before pseudocode.",
            },
            {
              title: "Validate",
              detail: "Test with a normal case, an edge case, and a failure case.",
            },
          ],
        },
        {
          id: "coding-audit",
          title: "Complexity and edge-case audit",
          description: "Use this checklist before ending a coding answer.",
          items: [
            {
              title: "Missed edge case",
              detail: input.summary.growthAreas[0] ?? "Check empty input and repeated values.",
            },
            {
              title: "Optimization story",
              detail: "Explain why the final complexity is acceptable for the stated constraints.",
            },
            {
              title: "Stronger pseudocode",
              detail: `Keep the final outline anchored to the strongest signal: ${strongestLine}.`,
            },
          ],
        },
      ];
    case "resume":
    case "project":
      return [
        {
          id: "experience-credibility",
          title: "Credibility gaps",
          description: "Use these to make resume and project answers harder to challenge.",
          items: [
            {
              title: "Scope boundary",
              detail: "Name where your responsibility ended instead of saying 'we' for everything.",
            },
            {
              title: "Decision evidence",
              detail: "Defend one technical choice with a real alternative you rejected.",
            },
            {
              title: "Quantification",
              detail: "Add one measurable outcome or operational consequence.",
            },
          ],
        },
        {
          id: "experience-follow-up-drills",
          title: "Follow-up drills",
          description: "These follow-ups should feel routine on the next run.",
          items: [
            {
              title: "What exactly did you own?",
              detail: "Answer in one sentence before expanding.",
            },
            {
              title: "Why that design?",
              detail: "Lead with the trade-off, not the tool choice.",
            },
            {
              title: "What changed?",
              detail: "Close with impact on users, systems, or team velocity.",
            },
          ],
        },
      ];
    case "system-design":
      return [
        {
          id: "system-design-checklist",
          title: "Requirement checklist",
          description: "Hit these before you start drawing components.",
          items: [
            {
              title: "Users and workload",
              detail: "State traffic shape, latency, and correctness expectations up front.",
            },
            {
              title: "API and data model",
              detail: "Name the contract and storage shape early enough to guide the architecture.",
            },
            {
              title: "Capacity assumptions",
              detail: "Show the order-of-magnitude numbers the design depends on.",
            },
          ],
        },
        {
          id: "system-design-critique",
          title: "Architecture critique",
          description: "Use these as the closing self-critique before time runs out.",
          items: [
            {
              title: "First bottleneck",
              detail: input.summary.growthAreas[0] ?? "Name the hottest dependency and why it fails first.",
            },
            {
              title: "Failure mode",
              detail: "Describe one degraded-path behavior when the primary path is unavailable.",
            },
            {
              title: "Trade-off",
              detail: `Preserve the strongest part of the design: ${strongestLine}.`,
            },
          ],
        },
      ];
  }
}
