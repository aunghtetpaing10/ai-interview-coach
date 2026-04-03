import { createRealtimeSessionSnapshot } from "@/lib/openai/realtime-session";
import { getDefaultInterviewBlueprint } from "@/lib/interview-session/catalog";
import { createInterviewSessionState } from "@/lib/interview-session/session";
import type { InterviewSessionState } from "@/lib/interview-session/types";

export function createDemoInterviewSession(): InterviewSessionState {
  return createInterviewSessionState(
    {
      sessionId: "interview-demo-session",
      candidateName: "Aung",
      targetRole: "Mid-level software engineer",
      blueprint: getDefaultInterviewBlueprint({
        mode: "system-design",
        practiceStyle: "live",
        difficulty: "challenging",
      }),
      durationSeconds: 18 * 60,
    },
    createRealtimeSessionSnapshot(),
  );
}

export const INTERVIEW_ROUTE_COPY = {
  eyebrow: "Live interview room",
  title: "Practice like the call is already in progress.",
  description:
    "The workspace below is wired to a blueprint-driven session model with staged prompts, guided or live practice, timer controls, transcript persistence, and track-specific follow-ups.",
} as const;
