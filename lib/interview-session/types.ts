import type {
  CompanyStyle,
  InterviewDifficulty,
  InterviewMode,
  PracticeStyle,
} from "@/lib/types/interview";

export type InterviewSessionStatus =
  | "idle"
  | "connecting"
  | "live"
  | "paused"
  | "ended";

export type TranscriptSpeaker = "system" | "interviewer" | "candidate";

export type RealtimeProvider = "mock" | "openai";

export interface InterviewModePreset {
  mode: InterviewMode;
  label: string;
  focus: string;
  summary: string;
  defaultPracticeStyle: PracticeStyle;
  defaultDifficulty: InterviewDifficulty;
  guidedDescription: string;
  liveDescription: string;
}

export interface InterviewBlueprintStage {
  id: string;
  label: string;
  prompt: string;
  interviewerGoal: string;
  hint: string;
}

export interface InterviewBlueprint {
  id: string;
  questionId: string;
  questionTitle: string;
  questionFamily: string;
  mode: InterviewMode;
  practiceStyle: PracticeStyle;
  difficulty: InterviewDifficulty;
  companyStyle: CompanyStyle | null;
  interviewerGoal: string;
  followUpPolicy: string;
  coachingOutline: string[];
  openingPrompt: string;
  wrapUpPrompt: string;
  stages: InterviewBlueprintStage[];
  rotationQuestionIds: string[];
}

export interface InterviewTranscriptTurn {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  elapsedSeconds: number;
}

export interface RealtimeSessionSnapshot {
  provider: RealtimeProvider;
  label: string;
  transportHint: string;
  fallbackReason: string;
  instructionPreview: string;
}

export interface InterviewSessionSeed {
  sessionId: string;
  candidateName: string;
  targetRole: string;
  blueprint: InterviewBlueprint;
  durationSeconds?: number;
}

export interface InterviewSessionState {
  sessionId: string;
  candidateName: string;
  targetRole: string;
  mode: InterviewMode;
  practiceStyle: PracticeStyle;
  difficulty: InterviewDifficulty;
  companyStyle: CompanyStyle | null;
  status: InterviewSessionStatus;
  elapsedSeconds: number;
  durationSeconds: number;
  microphoneEnabled: boolean;
  transcript: InterviewTranscriptTurn[];
  questionId: string;
  questionTitle: string;
  questionFamily: string;
  stageIndex: number;
  draftResponse: string;
  activePrompt: string;
  connectionMessage: string;
  realtime: RealtimeSessionSnapshot;
  blueprint: InterviewBlueprint;
}

export type InterviewSessionAction =
  | { type: "mode-changed"; blueprint: InterviewBlueprint }
  | { type: "connection-requested" }
  | {
      type: "connection-established";
      realtime?: RealtimeSessionSnapshot;
      connectionMessage?: string;
    }
  | { type: "connection-failed"; reason: string }
  | { type: "session-paused" }
  | { type: "session-resumed" }
  | { type: "session-ended" }
  | { type: "timer-ticked"; seconds?: number }
  | { type: "microphone-toggled" }
  | { type: "draft-changed"; draftResponse: string }
  | { type: "response-submitted" };
