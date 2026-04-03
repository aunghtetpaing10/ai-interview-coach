import { getDefaultInterviewBlueprint } from "@/lib/interview-session/catalog";
import { createInterviewSessionState } from "@/lib/interview-session/session";
import type {
  InterviewSessionState,
  RealtimeSessionSnapshot,
} from "@/lib/interview-session/types";
import type { InterviewSessionView } from "@/lib/session-service/session-service";

function mapPersistedStatusToUiStatus(
  status: InterviewSessionView["session"]["status"],
): InterviewSessionState["status"] {
  if (status === "completed" || status === "archived") {
    return "ended";
  }

  return "idle";
}

export function buildInterviewSessionStateFromView(input: {
  view: InterviewSessionView;
  candidateName: string;
  targetRole: string;
  realtime: RealtimeSessionSnapshot;
}): InterviewSessionState {
  const blueprint = getDefaultInterviewBlueprint({
    mode: input.view.session.mode,
    practiceStyle: input.view.session.practiceStyle,
    difficulty: input.view.session.difficulty,
    companyStyle: input.view.session.companyStyle ?? null,
    questionId: input.view.session.questionId ?? null,
  });
  const baseState = createInterviewSessionState(
    {
      sessionId: input.view.session.id,
      candidateName: input.candidateName,
      targetRole: input.targetRole,
      blueprint,
      durationSeconds: input.view.session.durationSeconds,
    },
    input.realtime,
  );
  const persistedTranscript = input.view.transcriptTurns.map((turn) => ({
    id: turn.id,
    speaker: turn.speaker,
    text: turn.body,
    elapsedSeconds: turn.seconds,
  }));
  const interviewerTurnCount = input.view.transcriptTurns.filter(
    (turn) => turn.speaker === "interviewer",
  ).length;
  const lastInterviewerTurn = [...input.view.transcriptTurns]
    .reverse()
    .find((turn) => turn.speaker === "interviewer");
  const elapsedSeconds = input.view.transcriptTurns.at(-1)?.seconds ?? 0;
  const stageIndex = Math.max(0, interviewerTurnCount - 1);

  return {
    ...baseState,
    status: mapPersistedStatusToUiStatus(input.view.session.status),
    elapsedSeconds,
    transcript:
      persistedTranscript.length > 0
        ? [baseState.transcript[0]!, ...persistedTranscript]
        : baseState.transcript,
    stageIndex: Math.min(stageIndex, Math.max(0, blueprint.stages.length - 1)),
    activePrompt: lastInterviewerTurn?.body ?? blueprint.openingPrompt,
    connectionMessage:
      input.view.session.status === "completed"
        ? "Session complete. Review the stored transcript and track the background report."
        : "Persisted session loaded. Start live voice or continue the staged drill in text fallback.",
  };
}
