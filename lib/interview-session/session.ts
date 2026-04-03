import { getInterviewModeLabel } from "@/lib/domain/interview";
import type {
  InterviewBlueprint,
  InterviewSessionAction,
  InterviewSessionSeed,
  InterviewSessionState,
  InterviewTranscriptTurn,
  RealtimeSessionSnapshot,
} from "@/lib/interview-session/types";

export function formatInterviewClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getInterviewProgressPercent(
  elapsedSeconds: number,
  durationSeconds: number,
) {
  if (durationSeconds <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((elapsedSeconds / durationSeconds) * 100));
}

function buildTranscriptId(sessionId: string, kind: string, index: number) {
  return `${sessionId}-${kind}-${index}`;
}

function createSeedTranscript(
  seed: InterviewSessionSeed,
  realtime: RealtimeSessionSnapshot,
) {
  const transcript: InterviewTranscriptTurn[] = [
    {
      id: buildTranscriptId(seed.sessionId, "system", 0),
      speaker: "system",
      text: `${realtime.label} ready. ${
        realtime.provider === "mock"
          ? "Using the deterministic fallback until a live transport is configured."
          : "Connected to the realtime transport."
      }`,
      elapsedSeconds: 0,
    },
    {
      id: buildTranscriptId(seed.sessionId, "interviewer", 1),
      speaker: "interviewer",
      text: seed.blueprint.openingPrompt,
      elapsedSeconds: 8,
    },
  ];

  return transcript;
}

export function createInterviewSessionState(
  seed: InterviewSessionSeed,
  realtime: RealtimeSessionSnapshot,
): InterviewSessionState {
  return {
    sessionId: seed.sessionId,
    candidateName: seed.candidateName,
    targetRole: seed.targetRole,
    mode: seed.blueprint.mode,
    practiceStyle: seed.blueprint.practiceStyle,
    difficulty: seed.blueprint.difficulty,
    companyStyle: seed.blueprint.companyStyle,
    status: "idle",
    elapsedSeconds: 0,
    durationSeconds: seed.durationSeconds ?? 18 * 60,
    microphoneEnabled: true,
    transcript: createSeedTranscript(seed, realtime),
    questionId: seed.blueprint.questionId,
    questionTitle: seed.blueprint.questionTitle,
    questionFamily: seed.blueprint.questionFamily,
    stageIndex: 0,
    draftResponse: "",
    activePrompt: seed.blueprint.openingPrompt,
    connectionMessage:
      realtime.provider === "mock"
        ? "Mock realtime transport is active and ready to simulate a live call."
        : "Realtime transport is configured and waiting for a live session.",
    realtime,
    blueprint: seed.blueprint,
  };
}

function appendTranscriptTurn(
  state: InterviewSessionState,
  turn: Omit<InterviewTranscriptTurn, "id">,
) {
  return {
    ...state,
    transcript: [
      ...state.transcript,
      {
        ...turn,
        id: buildTranscriptId(
          state.sessionId,
          turn.speaker,
          state.transcript.length,
        ),
      },
    ],
  };
}

function getNextBlueprintPrompt(
  blueprint: InterviewBlueprint,
  stageIndex: number,
) {
  const nextStage = blueprint.stages[stageIndex + 1];

  if (!nextStage) {
    return {
      nextStageIndex: blueprint.stages.length - 1,
      nextPrompt: blueprint.wrapUpPrompt,
    };
  }

  return {
    nextStageIndex: stageIndex + 1,
    nextPrompt: nextStage.prompt,
  };
}

function advanceStage(state: InterviewSessionState) {
  const { nextStageIndex, nextPrompt } = getNextBlueprintPrompt(
    state.blueprint,
    state.stageIndex,
  );

  return {
    ...state,
    stageIndex: nextStageIndex,
    activePrompt: nextPrompt,
  };
}

function resetForBlueprint(
  state: InterviewSessionState,
  blueprint: InterviewBlueprint,
) {
  return {
    ...state,
    mode: blueprint.mode,
    practiceStyle: blueprint.practiceStyle,
    difficulty: blueprint.difficulty,
    companyStyle: blueprint.companyStyle,
    status: "idle" as const,
    elapsedSeconds: 0,
    microphoneEnabled: true,
    transcript: createSeedTranscript(
      {
        sessionId: state.sessionId,
        candidateName: state.candidateName,
        targetRole: state.targetRole,
        blueprint,
        durationSeconds: state.durationSeconds,
      },
      state.realtime,
    ),
    questionId: blueprint.questionId,
    questionTitle: blueprint.questionTitle,
    questionFamily: blueprint.questionFamily,
    stageIndex: 0,
    draftResponse: "",
    activePrompt: blueprint.openingPrompt,
    connectionMessage:
      state.realtime.provider === "mock"
        ? "Practice setup changed. The mock realtime transport is standing by."
        : "Practice setup changed. Realtime transport is standing by.",
    blueprint,
  };
}

export function interviewSessionReducer(
  state: InterviewSessionState,
  action: InterviewSessionAction,
): InterviewSessionState {
  switch (action.type) {
    case "mode-changed":
      if (state.status !== "idle" && state.status !== "ended") {
        return state;
      }

      return resetForBlueprint(state, action.blueprint);
    case "connection-requested":
      if (state.status === "connecting" || state.status === "live") {
        return state;
      }

      return {
        ...state,
        status: "connecting",
        connectionMessage: "Negotiating the realtime interview transport...",
      };
    case "connection-established": {
      const connectedRealtime = action.realtime ?? state.realtime;
      const connectedMessage =
        action.connectionMessage ??
        (connectedRealtime.provider === "mock"
          ? "Mock transport connected. The session is now running in browser fallback mode."
          : "Realtime transport connected and ready for voice interaction.");

      return {
        ...appendTranscriptTurn(
          {
            ...state,
            realtime: connectedRealtime,
          },
          {
            speaker: "system",
            text: connectedMessage,
            elapsedSeconds: state.elapsedSeconds,
          },
        ),
        realtime: connectedRealtime,
        status: "live",
        connectionMessage: connectedMessage,
      };
    }
    case "connection-failed":
      return {
        ...state,
        status: "idle",
        connectionMessage: action.reason,
      };
    case "session-paused":
      if (state.status !== "live") {
        return state;
      }

      return {
        ...state,
        status: "paused",
        connectionMessage: "Session paused. Resume when you are ready.",
      };
    case "session-resumed":
      if (state.status !== "paused") {
        return state;
      }

      return {
        ...state,
        status: "live",
        connectionMessage: "Session resumed and timer is running.",
      };
    case "session-ended":
      return {
        ...state,
        status: "ended",
        connectionMessage: "Session ended. Review the transcript and scorecard.",
      };
    case "timer-ticked": {
      if (state.status !== "live") {
        return state;
      }

      const delta = action.seconds ?? 1;
      const nextElapsed = Math.min(
        state.durationSeconds,
        state.elapsedSeconds + delta,
      );

      return {
        ...state,
        elapsedSeconds: nextElapsed,
        status:
          nextElapsed >= state.durationSeconds ? ("ended" as const) : state.status,
        connectionMessage:
          nextElapsed >= state.durationSeconds
            ? "Timed block complete."
            : state.connectionMessage,
      };
    }
    case "microphone-toggled":
      return {
        ...state,
        microphoneEnabled: !state.microphoneEnabled,
      };
    case "draft-changed":
      return {
        ...state,
        draftResponse: action.draftResponse,
      };
    case "response-submitted": {
      if (state.status !== "live") {
        return state;
      }

      const trimmedDraft = state.draftResponse.trim();

      if (!trimmedDraft) {
        return state;
      }

      const candidateTurn: Omit<InterviewTranscriptTurn, "id"> = {
        speaker: "candidate",
        text: trimmedDraft,
        elapsedSeconds: state.elapsedSeconds,
      };
      const nextState = appendTranscriptTurn(state, candidateTurn);
      const followUpState = advanceStage(nextState);
      const interviewerTurn: Omit<InterviewTranscriptTurn, "id"> = {
        speaker: "interviewer",
        text: followUpState.activePrompt,
        elapsedSeconds: Math.min(
          followUpState.durationSeconds,
          followUpState.elapsedSeconds + 5,
        ),
      };

      return {
        ...appendTranscriptTurn(followUpState, interviewerTurn),
        draftResponse: "",
        connectionMessage:
          state.practiceStyle === "guided"
            ? "Candidate response captured. The next guided checkpoint is ready."
            : "Candidate response captured and the next follow-up is queued.",
      };
    }
    default:
      return state;
  }
}

export function getCurrentModeLabel(mode: InterviewSessionState["mode"]) {
  return getInterviewModeLabel(mode);
}
