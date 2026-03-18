import type {
  CompetencyKey,
  InterviewMode,
  ScoreBand,
  Scorecard,
} from "@/lib/types/interview";

export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  behavioral: "Behavioral",
  resume: "Resume deep dive",
  project: "Project walkthrough",
  "system-design": "System design",
};

export const COMPETENCY_LABELS: Record<CompetencyKey, string> = {
  clarity: "Clarity",
  ownership: "Ownership",
  "technical-depth": "Technical depth",
  communication: "Communication",
  "systems-thinking": "Systems thinking",
};

export function getInterviewModeLabel(mode: InterviewMode) {
  return INTERVIEW_MODE_LABELS[mode];
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

export function buildCompetencyTrend(scorecards: Scorecard[]) {
  const aggregates = Object.keys(COMPETENCY_LABELS).reduce<
    Record<CompetencyKey, { label: string; score: number }>
  >((accumulator, key) => {
    const competency = key as CompetencyKey;

    accumulator[competency] = {
      label: COMPETENCY_LABELS[competency],
      score: 0,
    };

    return accumulator;
  }, {} as Record<CompetencyKey, { label: string; score: number }>);

  if (scorecards.length === 0) {
    return Object.values(aggregates);
  }

  for (const scorecard of scorecards) {
    for (const competency of Object.keys(
      scorecard.competencies,
    ) as CompetencyKey[]) {
      aggregates[competency].score += scorecard.competencies[competency];
    }
  }

  return Object.values(aggregates).map((item) => ({
    ...item,
    score: normalizeScore(item.score / scorecards.length),
  }));
}
