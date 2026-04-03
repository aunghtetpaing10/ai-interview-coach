import type {
  CompanyStyle,
  InterviewDifficulty,
  InterviewMode,
  LegacyScorecard,
  PracticeStyle,
  ScoreBand,
  ScoreDimension,
  Scorecard,
  StoredScorecard,
} from "@/lib/types/interview";

type ScoreDimensionTemplate = {
  key: string;
  label: string;
};

export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  behavioral: "Behavioral",
  coding: "Coding",
  resume: "Resume deep dive",
  project: "Project walkthrough",
  "system-design": "System design",
};

export const PRACTICE_STYLE_LABELS: Record<PracticeStyle, string> = {
  guided: "Guided drill",
  live: "Live mock",
};

export const INTERVIEW_DIFFICULTY_LABELS: Record<InterviewDifficulty, string> = {
  standard: "Standard",
  challenging: "Challenging",
  stretch: "Stretch",
};

export const COMPANY_STYLE_LABELS: Record<CompanyStyle, string> = {
  general: "Generalist",
  amazon: "Amazon-style",
  google: "Google-style",
  meta: "Meta-style",
  stripe: "Stripe-style",
};

const MODE_DIMENSION_TEMPLATES: Record<InterviewMode, readonly ScoreDimensionTemplate[]> = {
  behavioral: [
    { key: "structure", label: "Structure" },
    { key: "ownership", label: "Ownership" },
    { key: "impact", label: "Impact" },
    { key: "communication", label: "Communication" },
    { key: "adaptability", label: "Adaptability" },
  ],
  coding: [
    { key: "problem-framing", label: "Problem framing" },
    { key: "solution-design", label: "Solution design" },
    { key: "correctness", label: "Correctness" },
    { key: "testing", label: "Testing" },
    { key: "optimization", label: "Optimization" },
    { key: "communication", label: "Communication" },
  ],
  resume: [
    { key: "credibility", label: "Credibility" },
    { key: "scope", label: "Scope" },
    { key: "decision-quality", label: "Decision quality" },
    { key: "technical-depth", label: "Technical depth" },
    { key: "impact", label: "Impact" },
  ],
  project: [
    { key: "credibility", label: "Credibility" },
    { key: "scope", label: "Scope" },
    { key: "decision-quality", label: "Decision quality" },
    { key: "technical-depth", label: "Technical depth" },
    { key: "impact", label: "Impact" },
  ],
  "system-design": [
    { key: "requirements", label: "Requirements" },
    { key: "architecture", label: "Architecture" },
    { key: "api-data-model", label: "API and data model" },
    { key: "scalability", label: "Scalability" },
    { key: "reliability", label: "Reliability" },
    { key: "trade-offs", label: "Trade-offs" },
  ],
};

const LEGACY_COMPETENCY_LABELS = {
  clarity: "Clarity",
  ownership: "Ownership",
  "technical-depth": "Technical depth",
  communication: "Communication",
  "systems-thinking": "Systems thinking",
} as const;

function average(...values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return normalizeScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function mapLegacyScorecardDimensions(scorecard: LegacyScorecard): ScoreDimension[] {
  const competencies = scorecard.competencies;

  switch (scorecard.mode) {
    case "behavioral":
      return [
        {
          key: "structure",
          label: "Structure",
          score: competencies.clarity,
          evidenceSummary: "Open with context, move to action, and close on impact.",
        },
        {
          key: "ownership",
          label: "Ownership",
          score: competencies.ownership,
          evidenceSummary: "Use first-person language and name the call you made.",
        },
        {
          key: "impact",
          label: "Impact",
          score: average(competencies["technical-depth"], competencies["systems-thinking"]),
          evidenceSummary: "Quantify what changed because of your decision.",
        },
        {
          key: "communication",
          label: "Communication",
          score: competencies.communication,
          evidenceSummary: "Keep the story compact enough for interruptions.",
        },
        {
          key: "adaptability",
          label: "Adaptability",
          score: average(competencies.communication, competencies["systems-thinking"]),
          evidenceSummary: "Handle skeptical probes without losing the answer spine.",
        },
      ];
    case "coding":
      return [
        {
          key: "problem-framing",
          label: "Problem framing",
          score: competencies.clarity,
          evidenceSummary: "Clarify the problem, constraints, and success criteria first.",
        },
        {
          key: "solution-design",
          label: "Solution design",
          score: competencies["technical-depth"],
          evidenceSummary: "State the main idea before diving into details.",
        },
        {
          key: "correctness",
          label: "Correctness",
          score: average(competencies["technical-depth"], competencies.clarity),
          evidenceSummary: "Walk through examples to prove the approach works.",
        },
        {
          key: "testing",
          label: "Testing",
          score: competencies["systems-thinking"],
          evidenceSummary: "Call out edge cases before the interviewer asks.",
        },
        {
          key: "optimization",
          label: "Optimization",
          score: average(competencies["technical-depth"], competencies["systems-thinking"]),
          evidenceSummary: "Explain the trade-off behind the final complexity target.",
        },
        {
          key: "communication",
          label: "Communication",
          score: competencies.communication,
          evidenceSummary: "Narrate the thinking while staying concise.",
        },
      ];
    case "resume":
    case "project":
      return [
        {
          key: "credibility",
          label: "Credibility",
          score: average(competencies.clarity, competencies.communication),
          evidenceSummary: "Defend claims with specifics instead of broad summaries.",
        },
        {
          key: "scope",
          label: "Scope",
          score: competencies.ownership,
          evidenceSummary: "Name where your responsibility started and ended.",
        },
        {
          key: "decision-quality",
          label: "Decision quality",
          score: average(competencies["technical-depth"], competencies["systems-thinking"]),
          evidenceSummary: "Explain why your choice beat realistic alternatives.",
        },
        {
          key: "technical-depth",
          label: "Technical depth",
          score: competencies["technical-depth"],
          evidenceSummary: "Describe mechanisms, not just outcomes.",
        },
        {
          key: "impact",
          label: "Impact",
          score: average(competencies.ownership, competencies["systems-thinking"]),
          evidenceSummary: "Show what improved because of the work.",
        },
      ];
    case "system-design":
      return [
        {
          key: "requirements",
          label: "Requirements",
          score: competencies.clarity,
          evidenceSummary: "State users, scale, and constraints before the architecture.",
        },
        {
          key: "architecture",
          label: "Architecture",
          score: competencies["technical-depth"],
          evidenceSummary: "Present a coherent high-level design before deep dives.",
        },
        {
          key: "api-data-model",
          label: "API and data model",
          score: average(competencies.clarity, competencies["technical-depth"]),
          evidenceSummary: "Tie interfaces and storage to the main requirements.",
        },
        {
          key: "scalability",
          label: "Scalability",
          score: competencies["systems-thinking"],
          evidenceSummary: "Make bottlenecks and throughput assumptions explicit.",
        },
        {
          key: "reliability",
          label: "Reliability",
          score: average(competencies["systems-thinking"], competencies.communication),
          evidenceSummary: "Name failure modes and graceful degradation paths.",
        },
        {
          key: "trade-offs",
          label: "Trade-offs",
          score: average(competencies.ownership, competencies["technical-depth"]),
          evidenceSummary: "Explain the cost of the design choices you made.",
        },
      ];
  }
}

export function getInterviewModeLabel(mode: InterviewMode) {
  return INTERVIEW_MODE_LABELS[mode];
}

export function getPracticeStyleLabel(style: PracticeStyle) {
  return PRACTICE_STYLE_LABELS[style];
}

export function getInterviewDifficultyLabel(difficulty: InterviewDifficulty) {
  return INTERVIEW_DIFFICULTY_LABELS[difficulty];
}

export function getCompanyStyleLabel(companyStyle: CompanyStyle) {
  return COMPANY_STYLE_LABELS[companyStyle];
}

export function getModeDimensionTemplates(mode: InterviewMode) {
  return MODE_DIMENSION_TEMPLATES[mode];
}

export function getModeRubricVersion(mode: InterviewMode) {
  return `${mode}-v2`;
}

export function createEmptyScorecard(mode: InterviewMode): Scorecard {
  return {
    mode,
    overallScore: 0,
    rubricVersion: getModeRubricVersion(mode),
    dimensions: MODE_DIMENSION_TEMPLATES[mode].map((dimension) => ({
      ...dimension,
      score: 0,
      evidenceSummary: "No evidence captured yet.",
    })),
  };
}

export function normalizeScore(score: number) {
  return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

export function deriveReadinessState(score: number): ScoreBand {
  if (score >= 85) {
    return "ready";
  }

  if (score >= 70) {
    return "improving";
  }

  return "training";
}

export function isLegacyScorecard(scorecard: StoredScorecard): scorecard is LegacyScorecard {
  return "competencies" in scorecard;
}

export function normalizeScorecard(scorecard: StoredScorecard): Scorecard {
  if (!isLegacyScorecard(scorecard)) {
    return {
      ...scorecard,
      rubricVersion: scorecard.rubricVersion || getModeRubricVersion(scorecard.mode),
      dimensions: scorecard.dimensions.map((dimension) => ({
        ...dimension,
        score: normalizeScore(dimension.score),
      })),
    };
  }

  return {
    mode: scorecard.mode,
    overallScore: normalizeScore(scorecard.overallScore),
    rubricVersion: getModeRubricVersion(scorecard.mode),
    dimensions: mapLegacyScorecardDimensions(scorecard),
  };
}

export function buildDimensionTrend(scorecards: StoredScorecard[]) {
  const normalizedScorecards = scorecards.map(normalizeScorecard);

  if (normalizedScorecards.length === 0) {
    return [];
  }

  const aggregate = new Map<
    string,
    { key: string; label: string; score: number; evidenceSummary: string; count: number }
  >();

  for (const scorecard of normalizedScorecards) {
    for (const dimension of scorecard.dimensions) {
      const existing = aggregate.get(dimension.key);
      if (existing) {
        existing.score += dimension.score;
        existing.count += 1;
        continue;
      }

      aggregate.set(dimension.key, {
        ...dimension,
        count: 1,
      });
    }
  }

  return [...aggregate.values()]
    .map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      score: normalizeScore(dimension.score / dimension.count),
      evidenceSummary: dimension.evidenceSummary,
    }))
    .sort((left, right) => right.score - left.score);
}

export const buildCompetencyTrend = buildDimensionTrend;

export function getLeadDimension(scorecard: StoredScorecard) {
  return normalizeScorecard(scorecard).dimensions
    .slice()
    .sort((left, right) => right.score - left.score)[0];
}

export function getLowestDimension(scorecard: StoredScorecard) {
  return normalizeScorecard(scorecard).dimensions
    .slice()
    .sort((left, right) => left.score - right.score)[0];
}

export function getLegacyCompetencyLabels() {
  return LEGACY_COMPETENCY_LABELS;
}
