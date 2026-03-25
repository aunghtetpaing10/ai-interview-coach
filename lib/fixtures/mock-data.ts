import {
  buildCompetencyTrend,
  deriveReadinessState,
  getInterviewModeLabel,
} from "@/lib/domain/interview";
import type { Scorecard, UserProfile } from "@/lib/types/interview";

const baseScorecards: Scorecard[] = [
  {
    mode: "behavioral",
    overallScore: 81,
    competencies: {
      clarity: 86,
      ownership: 84,
      "technical-depth": 68,
      communication: 88,
      "systems-thinking": 79,
    },
  },
  {
    mode: "resume",
    overallScore: 78,
    competencies: {
      clarity: 80,
      ownership: 74,
      "technical-depth": 72,
      communication: 84,
      "systems-thinking": 79,
    },
  },
  {
    mode: "project",
    overallScore: 84,
    competencies: {
      clarity: 82,
      ownership: 89,
      "technical-depth": 86,
      communication: 83,
      "systems-thinking": 80,
    },
  },
  {
    mode: "system-design",
    overallScore: 72,
    competencies: {
      clarity: 69,
      ownership: 72,
      "technical-depth": 76,
      communication: 70,
      "systems-thinking": 74,
    },
  },
];

export const landingHighlights = [
  {
    label: "Average session length",
    value: "18 min",
    description:
      "Long enough for serious probing, short enough to repeat several times a week.",
  },
  {
    label: "Rubric coverage",
    value: "5 competencies",
    description:
      "Scoring is normalized against clarity, ownership, depth, communication, and systems thinking.",
  },
  {
    label: "Delivery workflow",
    value: "6 feature branches",
    description:
      "The repo is organized for parallel delivery with small commits and required checks.",
  },
] as const;

export const stackHighlights = [
  {
    title: "Frontend",
    description:
      "Next.js App Router, React 19, Tailwind v4, and shadcn/ui provide the UI foundation while still leaving room for a distinct brand layer.",
  },
  {
    title: "AI layer",
    description:
      "OpenAI Realtime handles live voice interaction, while the Responses API powers structured scoring, grounded coaching, and practice-plan generation.",
  },
  {
    title: "Data + jobs",
    description:
      "Supabase covers auth, storage, and Postgres, while Inngest handles background workflows for report generation and reprocessing.",
  },
  {
    title: "Observability",
    description:
      "Sentry, PostHog, and Upstash are included from the start so the app can measure reliability, UX drop-off, and quota enforcement.",
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
      copy: "You are trending toward interview-ready, but system design still lags your project walkthrough answers.",
      icon: "target" as const,
    },
    {
      label: "Live sessions completed",
      value: "12",
      copy: "The current pacing is strong enough to show measurable week-over-week movement.",
      icon: "voice" as const,
    },
    {
      label: "Reports generated",
      value: "9",
      copy: "Every report cites evidence so users can trust the coaching instead of guessing what the model inferred.",
      icon: "report" as const,
    },
    {
      label: "Practice streak",
      value: "6 days",
      copy: "Short, high-signal drills help maintain momentum between longer live sessions.",
      icon: "plan" as const,
    },
  ],
  scorecards: baseScorecards.map((scorecard) => ({
    mode: scorecard.mode,
    label: getInterviewModeLabel(scorecard.mode),
    competencies: Object.values(buildCompetencyTrend([scorecard])).map(
      (item) => ({
        ...item,
        note:
          item.score >= 80
            ? "Strong enough to keep, but still worth sharpening with tighter evidence."
            : "This needs more structure, examples, and explicit tradeoff language.",
      }),
    ),
    coachingTitle:
      scorecard.mode === "system-design"
        ? "State your constraints earlier."
        : "Keep answers anchored in ownership and measurable outcomes.",
    coachingBody:
      scorecard.mode === "system-design"
        ? "Your answers become stronger when you declare scale assumptions, failure domains, and capacity bottlenecks before diving into components."
        : "The strongest clips mention what changed because of your decisions, not just what the team built.",
  })),
  practicePlan: [
    {
      title: "Re-answer one system design question in 4 steps",
      description:
        "Open with scale assumptions, outline the API, state storage choices, then close with bottlenecks and tradeoffs.",
      length: "12 min",
    },
    {
      title: "Rewrite two STAR stories for ownership clarity",
      description:
        "Replace passive phrasing with direct action, constraints, and measurable business or reliability impact.",
      length: "8 min",
    },
    {
      title: "Run one live voice drill",
      description:
        "Use the realtime interviewer to stress-test vague areas, then compare the transcript with the generated scorecard.",
      length: "15 min",
    },
  ],
};
