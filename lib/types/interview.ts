export type InterviewMode =
  | "behavioral"
  | "resume"
  | "project"
  | "system-design";

export type CompetencyKey =
  | "clarity"
  | "ownership"
  | "technical-depth"
  | "communication"
  | "systems-thinking";

export type ScoreBand = "training" | "improving" | "ready";

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

export interface Scorecard {
  mode: InterviewMode;
  overallScore: number;
  competencies: Record<CompetencyKey, number>;
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
