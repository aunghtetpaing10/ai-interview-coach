import { describe, expect, it } from "vitest";
import type { InterviewSessionView } from "@/lib/session-service/session-service";
import { buildInterviewSessionStateFromView } from "@/lib/interview-session/persisted";
import { makeInterviewSessionRow } from "@/tests/helpers/factories";

function makeSessionView(): InterviewSessionView {
  return {
    session: {
      ...makeInterviewSessionRow({
        id: "session-1",
        userId: "user-1",
        targetRoleId: "target-1",
        mode: "system-design",
        status: "active",
        title: "Platform engineer interview",
        overallScore: null,
        durationSeconds: 18 * 60,
        startedAt: new Date("2026-03-19T10:00:00.000Z"),
        endedAt: null,
        createdAt: new Date("2026-03-19T09:59:00.000Z"),
        updatedAt: new Date("2026-03-19T10:05:00.000Z"),
      }),
    },
    transcriptTurns: [
      {
        id: "turn-1",
        sessionId: "session-1",
        speaker: "interviewer",
        body: "Design a real-time notification service.",
        seconds: 8,
        sequenceIndex: 0,
        confidence: 100,
        createdAt: new Date("2026-03-19T10:00:08.000Z"),
      },
      {
        id: "turn-2",
        sessionId: "session-1",
        speaker: "candidate",
        body: "I would start with fan-out and delivery state.",
        seconds: 22,
        sequenceIndex: 1,
        confidence: 100,
        createdAt: new Date("2026-03-19T10:00:22.000Z"),
      },
      {
        id: "turn-3",
        sessionId: "session-1",
        speaker: "interviewer",
        body: "What are the hardest bottlenecks and why?",
        seconds: 28,
        sequenceIndex: 2,
        confidence: 100,
        createdAt: new Date("2026-03-19T10:00:28.000Z"),
      },
    ],
  };
}

describe("buildInterviewSessionStateFromView", () => {
  it("hydrates the reducer state from a persisted session view", () => {
    const state = buildInterviewSessionStateFromView({
      view: makeSessionView(),
      candidateName: "Aung",
      targetRole: "Platform engineer",
      realtime: {
        provider: "openai",
        label: "gpt-realtime realtime",
        transportHint: "Connected over WebRTC.",
        fallbackReason: "OpenAI Realtime session established.",
        instructionPreview: "Probe the candidate's claims.",
      },
    });

    expect(state.sessionId).toBe("session-1");
    expect(state.transcript).toHaveLength(4);
    expect(state.activePrompt).toBe("What are the hardest bottlenecks and why?");
    expect(state.stageIndex).toBe(1);
    expect(state.elapsedSeconds).toBe(28);
    expect(state.status).toBe("idle");
  });

  it("keeps the seeded opening prompt when no persisted turns exist yet", () => {
    const view = makeSessionView();
    const state = buildInterviewSessionStateFromView({
      view: {
        ...view,
        transcriptTurns: [],
      },
      candidateName: "Aung",
      targetRole: "Platform engineer",
      realtime: {
        provider: "mock",
        label: "Browser text fallback",
        transportHint: "Fallback enabled.",
        fallbackReason: "OpenAI unavailable.",
        instructionPreview: "Start here.",
      },
    });

    expect(state.transcript[1]?.speaker).toBe("interviewer");
    expect(state.activePrompt).toBe(state.transcript[1]?.text);
    expect(state.stageIndex).toBe(0);
  });
});
