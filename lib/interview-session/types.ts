import type { InterviewMode } from "@/lib/types/interview";

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
  openingPrompt: string;
  followUpPrompts: string[];
  closingPrompt: string;
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
  mode: InterviewMode;
  durationSeconds?: number;
}

export interface InterviewSessionState {
  sessionId: string;
  candidateName: string;
  targetRole: string;
  mode: InterviewMode;
  status: InterviewSessionStatus;
  elapsedSeconds: number;
  durationSeconds: number;
  microphoneEnabled: boolean;
  transcript: InterviewTranscriptTurn[];
  questionIndex: number;
  draftResponse: string;
  activePrompt: string;
  connectionMessage: string;
  realtime: RealtimeSessionSnapshot;
}

export type InterviewSessionAction =
  | { type: "mode-changed"; mode: InterviewMode }
  | { type: "connection-requested" }
  | { type: "connection-established" }
  | { type: "connection-failed"; reason: string }
  | { type: "session-paused" }
  | { type: "session-resumed" }
  | { type: "session-ended" }
  | { type: "timer-ticked"; seconds?: number }
  | { type: "microphone-toggled" }
  | { type: "draft-changed"; draftResponse: string }
  | { type: "response-submitted" };
