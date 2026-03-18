import { describe, expect, it } from "vitest";
import { createRealtimeSessionSnapshot } from "@/lib/openai/realtime-session";
import { createDemoInterviewSession } from "@/lib/interview-session/fixtures";
import { getInterviewModePreset } from "@/lib/interview-session/catalog";
import {
  formatInterviewClock,
  getInterviewProgressPercent,
  interviewSessionReducer,
} from "@/lib/interview-session/session";

describe("interview session state", () => {
  it("formats timer values and progress consistently", () => {
    expect(formatInterviewClock(125)).toBe("02:05");
    expect(getInterviewProgressPercent(45, 90)).toBe(50);
    expect(getInterviewProgressPercent(12, 0)).toBe(0);
  });

  it("resets the prompt ladder when the mode changes while idle", () => {
    const initial = createDemoInterviewSession();
    const next = interviewSessionReducer(initial, {
      type: "mode-changed",
      mode: "behavioral",
    });
    const preset = getInterviewModePreset("behavioral");

    expect(next.mode).toBe("behavioral");
    expect(next.status).toBe("idle");
    expect(next.transcript[1].text).toBe(preset.openingPrompt);
    expect(next.activePrompt).toBe(preset.openingPrompt);
    expect(next.questionIndex).toBe(0);
  });

  it("connects, accepts a candidate response, and queues the next follow-up", () => {
    const initial = createDemoInterviewSession();
    const connected = interviewSessionReducer(
      interviewSessionReducer(initial, { type: "connection-requested" }),
      { type: "connection-established" },
    );
    const live = interviewSessionReducer(connected, {
      type: "draft-changed",
      draftResponse:
        "I broke the service into separate write and read paths and added load-based backpressure.",
    });
    const afterSubmit = interviewSessionReducer(live, {
      type: "response-submitted",
    });

    expect(afterSubmit.status).toBe("live");
    expect(afterSubmit.draftResponse).toBe("");
    expect(afterSubmit.transcript.some((turn) => turn.speaker === "candidate")).toBe(
      true,
    );
    expect(afterSubmit.activePrompt).toContain("hardest bottlenecks");
  });

  it("ends the session once the timer reaches the configured duration", () => {
    const initial = createDemoInterviewSession();
    const live = interviewSessionReducer(
      interviewSessionReducer(initial, { type: "connection-requested" }),
      { type: "connection-established" },
    );
    const ended = interviewSessionReducer(live, {
      type: "timer-ticked",
      seconds: live.durationSeconds,
    });

    expect(ended.elapsedSeconds).toBe(live.durationSeconds);
    expect(ended.status).toBe("ended");
    expect(ended.connectionMessage).toBe("Timed block complete.");
  });

  it("falls back to a mock transport snapshot when no API key is present", () => {
    const snapshot = createRealtimeSessionSnapshot();

    expect(snapshot.provider).toBe("mock");
    expect(snapshot.transportHint).toMatch(/No OpenAI API key/i);
  });
});
