import {
  buildDimensionTrend,
  deriveReadinessState,
  getInterviewModeLabel,
  getModeRubricVersion,
} from "@/lib/domain/interview";
import type { Scorecard, UserProfile } from "@/lib/types/interview";

function createScorecard(
  mode: Scorecard["mode"],
  overallScore: number,
  dimensions: Array<{ key: string; label: string; score: number; evidenceSummary: string }>,
): Scorecard {
  return {
    mode,
    overallScore,
    rubricVersion: getModeRubricVersion(mode),
    dimensions,
  };
}

const baseScorecards: Scorecard[] = [
  createScorecard("behavioral", 81, [
    { key: "structure", label: "Structure", score: 84, evidenceSummary: "The story opens cleanly and lands on impact." },
    { key: "ownership", label: "Ownership", score: 82, evidenceSummary: "The answer uses direct first-person ownership." },
    { key: "impact", label: "Impact", score: 79, evidenceSummary: "The result is quantified but could be sharper." },
    { key: "communication", label: "Communication", score: 86, evidenceSummary: "The pacing stays compact under probing." },
    { key: "adaptability", label: "Adaptability", score: 74, evidenceSummary: "The answer still softens when challenged." },
  ]),
  createScorecard("coding", 78, [
    { key: "problem-framing", label: "Problem framing", score: 81, evidenceSummary: "The candidate clarifies inputs and constraints before solving." },
    { key: "solution-design", label: "Solution design", score: 80, evidenceSummary: "The high-level approach is explained before pseudocode." },
    { key: "correctness", label: "Correctness", score: 77, evidenceSummary: "The core logic is sound on the main example." },
    { key: "testing", label: "Testing", score: 72, evidenceSummary: "Edge cases still arrive too late in the answer." },
    { key: "optimization", label: "Optimization", score: 74, evidenceSummary: "Complexity tradeoffs are present but not crisp enough." },
    { key: "communication", label: "Communication", score: 83, evidenceSummary: "The reasoning stays easy to follow while solving." },
  ]),
  createScorecard("project", 84, [
    { key: "credibility", label: "Credibility", score: 82, evidenceSummary: "Claims are backed by specific implementation details." },
    { key: "scope", label: "Scope", score: 88, evidenceSummary: "Ownership boundaries are explicit." },
    { key: "decision-quality", label: "Decision quality", score: 86, evidenceSummary: "Alternatives and tradeoffs are easy to follow." },
    { key: "technical-depth", label: "Technical depth", score: 84, evidenceSummary: "The project explanation includes runtime concerns." },
    { key: "impact", label: "Impact", score: 80, evidenceSummary: "User and business outcomes are measurable." },
  ]),
  createScorecard("system-design", 72, [
    { key: "requirements", label: "Requirements", score: 69, evidenceSummary: "Traffic assumptions are still thin." },
    { key: "architecture", label: "Architecture", score: 76, evidenceSummary: "The top-level design is coherent." },
    { key: "api-data-model", label: "API and data model", score: 71, evidenceSummary: "Contracts exist but need to come earlier." },
    { key: "scalability", label: "Scalability", score: 74, evidenceSummary: "Bottlenecks are mentioned but not prioritized." },
    { key: "reliability", label: "Reliability", score: 68, evidenceSummary: "Failure-mode handling needs more detail." },
    { key: "trade-offs", label: "Trade-offs", score: 73, evidenceSummary: "Trade-offs are present but not anchored to requirements." },
  ]),
];

export const landingHighlights = [
  {
    label: "Core interview tracks",
    value: "3 tracks",
    description:
      "Behavioral, coding, and system design are treated as distinct products instead of one generic prompt loop.",
  },
  {
    label: "Practice styles",
    value: "guided + live",
    description:
      "Candidates can warm up with scaffolded drills or switch into pressure simulations without leaving the same route.",
  },
  {
    label: "Rubric coverage",
    value: "Track-specific",
    description:
      "Each report now scores mode-specific dimensions instead of forcing every interview through one shared competency model.",
  },
] as const;

export const stackHighlights = [
  {
    title: "Interview engine",
    description:
      "A deterministic blueprint and stage machine now drive each track, so follow-ups and reports stay mode-aware and testable.",
  },
  {
    title: "AI layer",
    description:
      "OpenAI Realtime powers live interviewer behavior, while the Responses pipeline produces grounded, track-specific scorecards and coaching artifacts.",
  },
  {
    title: "Question bank",
    description:
      "Seed data covers behavioral, coding, system design, resume, and project drills with difficulty and company-style metadata.",
  },
  {
    title: "Operational loop",
    description:
      "Reports, replay actions, dashboard recommendations, and progress views all connect back to persisted transcripts and score dimensions.",
  },
] as const;

const profile: UserProfile = {
  id: "candidate_001",
  firstName: "Aung",
  lastName: "Paing",
  targetRole: "Mid-level software engineer",
};

export const dashboardSnapshot = {
  profile,
  stats: [
    {
      label: "Readiness band",
      value: deriveReadinessState(79),
      copy: "Behavioral is holding up, while system design still needs clearer constraints and failure-mode coverage.",
      icon: "target" as const,
    },
    {
      label: "Guided drills",
      value: "7",
      copy: "Short guided reps are filling the weakest dimensions before live mocks.",
      icon: "plan" as const,
    },
    {
      label: "Live mocks",
      value: "5",
      copy: "Pressure sessions are now separate from guided practice instead of being one blended flow.",
      icon: "voice" as const,
    },
    {
      label: "Reports generated",
      value: "9",
      copy: "Each report keeps dimension scores, artifacts, and replay actions tied to the same transcript evidence.",
      icon: "report" as const,
    },
  ],
  scorecards: baseScorecards.map((scorecard) => ({
    mode: scorecard.mode,
    label: getInterviewModeLabel(scorecard.mode),
    dimensions: buildDimensionTrend([scorecard]).map((item) => ({
      ...item,
      note:
        item.score >= 80
          ? "Strong enough to preserve while rotating to harder prompts."
          : "This dimension still needs another guided rep before a live mock.",
    })),
    coachingTitle:
      scorecard.mode === "system-design"
        ? "Move constraints earlier."
        : scorecard.mode === "coding"
          ? "Call out edge cases before optimization."
          : "Keep answers anchored in ownership and measurable outcomes.",
    coachingBody:
      scorecard.mode === "system-design"
        ? "Lead with users, scale, and bottlenecks before deep-diving into components."
        : scorecard.mode === "coding"
          ? "Explain the approach, test it, and only then optimize complexity."
          : "The strongest clips explain responsibility, tradeoffs, and outcome without drifting into team-generic language.",
  })),
  practicePlan: [
    {
      title: "Replay one coding prompt",
      description:
        "Clarify requirements, outline the solution, test two edge cases, then restate the complexity tradeoff.",
      length: "12 min",
    },
    {
      title: "Rotate one behavioral drill",
      description:
        "Use the same story spine on a different ownership question and keep the impact sentence measurable.",
      length: "8 min",
    },
    {
      title: "Run one live system design mock",
      description:
        "Open with scale assumptions, walk the API/data model, then self-critique the first bottleneck and failure path.",
      length: "18 min",
    },
  ],
};
