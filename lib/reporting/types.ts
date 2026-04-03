import type {
  CompanyStyle,
  InterviewDifficulty,
  PracticeStyle,
  Scorecard,
  TranscriptTurn,
} from "@/lib/types/interview";

export type ReportBand = "ready" | "strong" | "steady" | "watch";

export type CitationEmphasis = "strength" | "gap" | "probe";

export interface ScorecardSummary {
  score: number;
  band: ReportBand;
  headline: string;
  strengths: string[];
  growthAreas: string[];
}

export interface CitationSignal {
  turnId: string;
  emphasis: CitationEmphasis;
  insight: string;
}

export interface CitationBlock {
  id: string;
  label: string;
  speaker: TranscriptTurn["speaker"];
  timestamp: string;
  quote: string;
  insight: string;
  emphasis: CitationEmphasis;
}

export interface RewriteInput {
  prompt: string;
  draft: string;
  evidence: string;
  weakness: string;
}

export interface AnswerRewrite {
  id: string;
  prompt: string;
  stronger: string;
  whyItWorks: string;
  evidence: string;
}

export interface PracticePlanStep {
  id: string;
  title: string;
  minutes: number;
  drill: string;
  outcome: string;
}

export interface PracticePlan {
  title: string;
  focus: string;
  steps: PracticePlanStep[];
}

export interface PracticePlanInput {
  targetRole: string;
  scorecard: Scorecard;
  summary: ScorecardSummary;
  focusAreas: string[];
}

export interface ReportPromptFixture {
  id: string;
  title: string;
  version: string;
  objective: string;
  guardrails: string[];
}

export interface ReportEvalCase {
  id: string;
  label: string;
  category: "scorecard" | "citation" | "rewrite" | "practice-plan";
  input: string;
  expected: string[];
}

export interface ReportArtifactItem {
  title: string;
  detail: string;
}

export interface ReportArtifactSection {
  id: string;
  title: string;
  description: string;
  items: ReportArtifactItem[];
}

export interface ReportReplayAction {
  label: string;
  href: string;
  description: string;
}

export interface ReportOverview {
  id: string;
  title: string;
  sessionDate: string;
  candidate: string;
  targetRole: string;
  promptVersion: string;
  scorecard: Scorecard;
  summary: ScorecardSummary;
  strengths: string[];
  growthAreas: string[];
}

export interface InterviewReport extends ReportOverview {
  transcript: TranscriptTurn[];
  citations: CitationBlock[];
  rewrites: AnswerRewrite[];
  practicePlan: PracticePlan;
  practiceStyle: PracticeStyle;
  difficulty: InterviewDifficulty;
  companyStyle: CompanyStyle | null;
  questionId: string | null;
  questionFamily: string | null;
  artifactSections: ReportArtifactSection[];
  replayActions: ReportReplayAction[];
}
