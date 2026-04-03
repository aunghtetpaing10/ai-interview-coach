import type {
  CompanyStyle,
  InterviewDifficulty,
  InterviewMode,
  PracticeStyle,
} from "@/db/schema";

export type {
  CompanyStyle,
  InterviewDifficulty,
  InterviewMode,
  PracticeStyle,
};

export type LegacyCompetencyKey =
  | "clarity"
  | "ownership"
  | "technical-depth"
  | "communication"
  | "systems-thinking";

export type ScoreBand = "training" | "improving" | "ready";

export interface ScoreDimension {
  key: string;
  label: string;
  score: number;
  evidenceSummary: string;
}

export interface Scorecard {
  mode: InterviewMode;
  overallScore: number;
  rubricVersion: string;
  dimensions: ScoreDimension[];
}

export interface LegacyScorecard {
  mode: InterviewMode;
  overallScore: number;
  competencies: Record<LegacyCompetencyKey, number>;
}

export type StoredScorecard = Scorecard | LegacyScorecard;

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  targetRole: string;
}

export interface TargetRole {
  title: string;
  companyType: string;
  level: string;
  priorities: string[];
}

export interface ResumeAsset {
  id: string;
  fileName: string;
  uploadedAt: string;
}

export interface TranscriptTurn {
  id: string;
  speaker: "interviewer" | "candidate";
  text: string;
  timestampSeconds: number;
}

export interface FeedbackReport {
  summary: string;
  strengths: string[];
  gaps: string[];
  citations: Array<{
    timestamp: string;
    quote: string;
    rationale: string;
  }>;
}

export interface PracticePlan {
  title: string;
  steps: Array<{
    title: string;
    description: string;
    length: string;
  }>;
}

export interface PromptVersion {
  id: string;
  label: string;
  updatedAt: string;
}

export interface EvalCase {
  id: string;
  name: string;
  mode: InterviewMode;
  expectedBand: ScoreBand;
}
