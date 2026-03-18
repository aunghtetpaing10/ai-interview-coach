import { createRealtimeSessionSnapshot } from "@/lib/openai/realtime-session";
import { createInterviewSessionState } from "@/lib/interview-session/session";
import type { InterviewSessionState } from "@/lib/interview-session/types";

export function createDemoInterviewSession(): InterviewSessionState {
  return createInterviewSessionState(
    {
      sessionId: "interview-demo-session",
      candidateName: "Aung",
      targetRole: "Mid-level software engineer",
      mode: "system-design",
      durationSeconds: 18 * 60,
    },
    createRealtimeSessionSnapshot(),
  );
}

export const INTERVIEW_ROUTE_COPY = {
  eyebrow: "Live interview room",
  title: "Practice like the call is already in progress.",
  description:
    "The workspace below is wired to a reducer-driven session model with a mock realtime bridge, timer controls, transcript timeline, and mode-specific follow-ups.",
} as const;
