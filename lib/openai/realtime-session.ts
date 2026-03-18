import { getEnv } from "@/lib/env";
import { getInterviewModeLabel } from "@/lib/domain/interview";
import type { InterviewMode } from "@/lib/types/interview";
import type { RealtimeSessionSnapshot } from "@/lib/interview-session/types";

export function createRealtimeSessionSnapshot(): RealtimeSessionSnapshot {
  const env = getEnv();
  const configured = Boolean(env.OPENAI_API_KEY);

  return {
    provider: configured ? "openai" : "mock",
    label: configured ? `${env.OPENAI_REALTIME_MODEL} realtime` : "Browser mock transport",
    transportHint: configured
      ? "Server-side realtime wiring can be enabled when an API key is available."
      : "No OpenAI API key is set, so the session uses deterministic local fallback behavior.",
    fallbackReason: configured
      ? "Realtime transport configured."
      : "OPENAI_API_KEY missing; using mock transport.",
    instructionPreview:
      "Probe the candidate's claims, keep the follow-up tight, and ground every question in the resume, target role, and transcript.",
  };
}

export function buildRealtimeInstructions(input: {
  candidateName: string;
  targetRole: string;
  mode: InterviewMode;
  focus: string;
  openingPrompt: string;
}) {
  return [
    `You are a senior interviewer coaching ${input.candidateName} for ${input.targetRole}.`,
    `Interview mode: ${getInterviewModeLabel(input.mode)}.`,
    `Focus area: ${input.focus}.`,
    `Opening prompt: ${input.openingPrompt}`,
    "Keep the session grounded in the candidate's transcript and resume claims.",
    "Prefer short follow-ups that force concrete evidence, tradeoffs, and ownership.",
    "If voice transport is unavailable, continue the same interview flow in text mode.",
  ].join(" ");
}
