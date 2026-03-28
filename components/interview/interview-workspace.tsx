"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mic, MicOff, Pause, Play, Send, Square } from "lucide-react";
import { getInterviewModePreset } from "@/lib/interview-session/catalog";
import {
  formatInterviewClock,
  getInterviewProgressPercent,
  interviewSessionReducer,
} from "@/lib/interview-session/session";
import type { InterviewSessionState } from "@/lib/interview-session/types";
import {
  connectBrowserRealtimeSession,
  createBrowserRealtimeSnapshot,
} from "@/lib/openai/browser-realtime";
import { RealtimePanel } from "@/components/interview/realtime-panel";
import { TranscriptFeed } from "@/components/interview/transcript-feed";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type InterviewWorkspaceProps = {
  initialSession: InterviewSessionState;
};

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export function InterviewWorkspace({ initialSession }: InterviewWorkspaceProps) {
  const [state, dispatch] = useReducer(interviewSessionReducer, initialSession);
  const [runtimeNotice, setRuntimeNotice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const persistedNextSequenceIndexRef = useRef(
    initialSession.transcript.filter((turn) => turn.speaker !== "system").length,
  );
  const pendingTranscriptPersistsRef = useRef<Set<Promise<void>>>(new Set());
  const connectionRef = useRef<{
    close(): void;
    sendText(text: string): void;
  } | null>(null);
  const router = useRouter();
  const preset = getInterviewModePreset(state.mode);
  const progressPercent = getInterviewProgressPercent(
    state.elapsedSeconds,
    state.durationSeconds,
  );
  const remainingSeconds = Math.max(0, state.durationSeconds - state.elapsedSeconds);
  const modeLocked =
    state.status === "connecting" ||
    state.status === "live" ||
    state.status === "paused";
  const startDisabled = state.status === "connecting" || state.status === "live";

  useEffect(() => {
    return () => {
      connectionRef.current?.close();
      connectionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state.status !== "live") {
      return;
    }

    const interval = window.setInterval(() => {
      dispatch({ type: "timer-ticked" });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "connecting") {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const openRealtimeSession = async () => {
      try {
        const connection = await connectBrowserRealtimeSession(
          {
            candidateName: state.candidateName,
            targetRole: state.targetRole,
            mode: state.mode,
            focus: preset.focus,
            openingPrompt: state.activePrompt,
          },
          {
            audioElement: audioRef.current,
            microphoneEnabled: state.microphoneEnabled,
            signal: controller.signal,
          },
        );

        if (!active || controller.signal.aborted) {
          connection.close();
          return;
        }

        connectionRef.current?.close();
        connectionRef.current = connection;
        dispatch({
          type: "connection-established",
          realtime: connection.snapshot,
          connectionMessage: connection.connectionMessage,
        });
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return;
        }

        connectionRef.current?.close();
        connectionRef.current = null;
        const message =
          error instanceof Error && error.message
            ? error.message
            : "OpenAI Realtime unavailable. Continuing with text fallback.";

        dispatch({
          type: "connection-established",
          realtime: createBrowserRealtimeSnapshot({
            provider: "mock",
            message,
            openingPrompt: state.activePrompt,
          }),
          connectionMessage: "OpenAI Realtime unavailable. Continuing with text fallback.",
        });
      }
    };

    void openRealtimeSession();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    state.status,
    state.candidateName,
    state.targetRole,
    state.mode,
    state.activePrompt,
    state.microphoneEnabled,
    preset.focus,
  ]);

  function handleSessionStart() {
    setRuntimeNotice(null);

    if (state.status === "paused") {
      dispatch({ type: "session-resumed" });
      return;
    }

    if (state.status === "connecting" || state.status === "live") {
      return;
    }

    dispatch({ type: "connection-requested" });
  }

  function handleSessionPause() {
    dispatch({ type: "session-paused" });
  }

  async function handleSessionEnd() {
    connectionRef.current?.close();
    connectionRef.current = null;
    dispatch({ type: "session-ended" });

    try {
      const pendingPersists = Array.from(pendingTranscriptPersistsRef.current);
      if (pendingPersists.length > 0) {
        await Promise.allSettled(pendingPersists);
      }

      const completeResponse = await fetch(
        `/api/interview/sessions/${state.sessionId}/complete`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      if (!completeResponse.ok) {
        throw new Error("Failed to complete the interview session.");
      }

      const reportResponse = await fetch(
        `/api/interview/sessions/${state.sessionId}/report`,
        {
          method: "POST",
        },
      );

      if (!reportResponse.ok) {
        throw new Error("Session saved, but the report could not be created.");
      }

      const reportPayload = await reportResponse.json().catch(() => null);
      const reportResult = reportPayload?.data ?? reportPayload;
      const completedReportId =
        reportResult?.report?.id ?? reportResult?.reportId ?? null;

      if (reportResult?.status === "completed" && completedReportId) {
        setRuntimeNotice("Report ready. Opening the latest report.");
        router.push(`/reports/${completedReportId}`);
        return;
      }

      if (reportResult?.status === "queued" || reportResult?.status === "running") {
        setRuntimeNotice("Report is processing. Opening the job tracker.");
        router.push(`/reports/processing/${state.sessionId}`);
        return;
      }

      throw new Error("Session saved, but the report response was invalid.");
    } catch (error) {
      setRuntimeNotice(
        error instanceof Error
          ? error.message
          : "Session ended locally, but the server could not persist the final state.",
      );
    }
  }

  function handleModeChange(value: string) {
    connectionRef.current?.close();
    connectionRef.current = null;
    dispatch({ type: "mode-changed", mode: value as InterviewSessionState["mode"] });
    router.push(`/interview?mode=${value}`);
  }

  async function handleSubmit() {
    const trimmedDraft = state.draftResponse.trim();

    if (!trimmedDraft || state.status !== "live") {
      return;
    }

    const nextState = interviewSessionReducer(state, {
      type: "response-submitted",
    });
    const appendedTurns = nextState.transcript
      .slice(state.transcript.length)
      .filter((turn) => turn.speaker !== "system")
      .map((turn) => ({
        speaker: turn.speaker,
        body: turn.text,
        seconds: turn.elapsedSeconds,
      }));

    setRuntimeNotice(null);
    connectionRef.current?.sendText(trimmedDraft);
    dispatch({ type: "response-submitted" });

    const persistPromise = (async () => {
      try {
        const batchId = crypto.randomUUID();
        const baseSequenceIndex = persistedNextSequenceIndexRef.current;
        const response = await fetch(`/api/interview/sessions/${state.sessionId}/turns`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            batchId,
            baseSequenceIndex,
            turns: appendedTurns,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            payload?.error?.message ??
            "The transcript updated locally, but the server could not persist the new turns.";

          throw new Error(message);
        }

        const payload = await response.json().catch(() => null);
        const appendAck = payload?.data ?? payload;
        if (typeof appendAck?.nextSequenceIndex === "number") {
          persistedNextSequenceIndexRef.current = appendAck.nextSequenceIndex;
        }
      } catch (error) {
        setRuntimeNotice(
          error instanceof Error
            ? error.message
            : "The transcript updated locally, but the server could not persist the new turns.",
        );
      }
    })();

    pendingTranscriptPersistsRef.current.add(persistPromise);
    try {
      await persistPromise;
    } finally {
      pendingTranscriptPersistsRef.current.delete(persistPromise);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
      <Card className="curator-card-dark overflow-hidden">
        <CardHeader className="gap-5 border-b border-white/10 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge className="rounded-full bg-white/10 text-white">
              {state.realtime.label}
            </Badge>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full bg-white/10 text-white">
                {state.status}
              </Badge>
              <Badge variant="secondary" className="rounded-full bg-white/10 text-white">
                {preset.label}
              </Badge>
            </div>
          </div>
          <div className="space-y-3">
            <p className="curator-kicker text-white/70">Live interview room</p>
            <CardTitle className="curator-display text-4xl text-white sm:text-5xl">
              {state.candidateName} practicing for {state.targetRole}
            </CardTitle>
            <p className="max-w-3xl text-base leading-7 text-slate-300">
              The Curator keeps the browser realtime connection, text fallback,
              transcript persistence, and background report publishing in a single
              editorial rehearsal loop.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Elapsed" value={formatInterviewClock(state.elapsedSeconds)} />
            <Metric label="Remaining" value={formatInterviewClock(remainingSeconds)} />
            <Metric label="Mode" value={preset.label} />
            <Metric label="Mic" value={state.microphoneEnabled ? "On" : "Muted"} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              <span>Session progress</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2.5 bg-white/10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6 md:p-8">
          <TranscriptFeed
            transcript={state.transcript}
            currentPrompt={state.activePrompt}
          />

          <audio ref={audioRef} autoPlay playsInline className="hidden" />

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Text fallback
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Type a response and the reducer will queue the next interviewer
                  follow-up.
                </p>
              </div>
              <Badge className="rounded-full bg-white/10 text-white">
                {state.status === "live" ? "live" : state.status}
              </Badge>
            </div>

            <Textarea
              value={state.draftResponse}
              onChange={(event) =>
                dispatch({
                  type: "draft-changed",
                  draftResponse: event.target.value,
                })
              }
              placeholder={`Draft your answer to: ${state.activePrompt}`}
              className="mt-4 min-h-32 border-white/10 bg-black/20 text-white placeholder:text-slate-500"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSessionStart}
                  disabled={startDisabled}
                  className={cn(
                    buttonVariants({
                      size: "sm",
                      className:
                        "rounded-full bg-white px-4 text-slate-950 hover:bg-slate-100",
                    }),
                  )}
                >
                  {state.status === "paused" ? (
                    <Play className="size-4" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                  {state.status === "paused"
                    ? "Resume live session"
                    : "Start live session"}
                </button>
                <button
                  type="button"
                  onClick={handleSessionPause}
                  disabled={state.status !== "live"}
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className:
                        "rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10",
                    }),
                  )}
                >
                  <Pause className="size-4" />
                  Pause
                </button>
                <button
                  type="button"
                  onClick={handleSessionEnd}
                  disabled={state.status === "ended"}
                  className={cn(
                    buttonVariants({
                      variant: "destructive",
                      size: "sm",
                      className:
                        "rounded-full bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
                    }),
                  )}
                >
                  <Square className="size-4" />
                  End
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "microphone-toggled" })}
                  className={cn(
                    buttonVariants({
                      variant: "secondary",
                      size: "sm",
                      className:
                        "rounded-full bg-white/10 text-white hover:bg-white/20",
                    }),
                  )}
                >
                  {state.microphoneEnabled ? (
                    <Mic className="size-4" />
                  ) : (
                    <MicOff className="size-4" />
                  )}
                  {state.microphoneEnabled ? "Mic on" : "Mic muted"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!state.draftResponse.trim() || state.status !== "live"}
                className={cn(
                  buttonVariants({
                    size: "sm",
                    className:
                      "rounded-full bg-[color:var(--curator-orange)] px-4 text-white hover:bg-[color:var(--curator-orange-strong)]",
                  }),
                )}
              >
                <Send className="size-4" />
                Send response
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6 xl:sticky xl:top-6">
        <Card className="curator-card">
          <CardHeader className="space-y-4">
            <Badge className="w-fit rounded-full bg-[rgba(20,63,134,0.12)] text-[color:var(--curator-navy)]">
              Interview mode
            </Badge>
            <CardTitle className="text-2xl tracking-[-0.04em] text-[color:var(--curator-ink)]">
              Switch the session lens
            </CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              The reducer resets the prompt ladder when the session is idle, so
              each mode starts with a clean transcript and the right follow-up
              pattern.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              value={state.mode}
              onValueChange={handleModeChange}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2 gap-2 bg-[rgba(20,63,134,0.08)] p-1 sm:grid-cols-4">
                {["behavioral", "resume", "project", "system-design"].map((mode) => {
                  const modePreset = getInterviewModePreset(
                    mode as InterviewSessionState["mode"],
                  );

                  return (
                    <TabsTrigger key={mode} value={mode} disabled={modeLocked}>
                      {modePreset.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
            <div className="rounded-[1.5rem] border border-[color:var(--curator-line)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--curator-orange)]">
                Focus area
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {preset.focus}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {preset.closingPrompt}
              </p>
            </div>
            <div className="grid gap-2">
              {preset.followUpPrompts.map((prompt) => (
                <div
                  key={prompt}
                  className="rounded-[1.35rem] border border-[color:var(--curator-line)] bg-white/80 p-3 text-sm leading-6 text-slate-700"
                >
                  {prompt}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-[1.5rem] border border-[color:var(--curator-line)] bg-[rgba(20,63,134,0.04)] px-4 py-3">
              <span className="text-sm font-medium text-[color:var(--curator-ink)]">
                Session status
              </span>
              <span className="text-sm font-semibold text-[color:var(--curator-navy)]">
                {runtimeNotice ?? state.connectionMessage}
              </span>
            </div>
          </CardContent>
        </Card>

        <RealtimePanel
          snapshot={state.realtime}
          connectionMessage={state.connectionMessage}
        />

        <Card className="curator-card">
          <CardHeader className="space-y-4">
            <Badge className="w-fit rounded-full bg-[rgba(20,63,134,0.12)] text-[color:var(--curator-navy)]">
              Session notes
            </Badge>
            <CardTitle className="text-2xl tracking-[-0.04em] text-[color:var(--curator-ink)]">
              UI integration points
            </CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              This shell negotiates a real OpenAI Realtime transport in the
              browser and keeps the text fallback path available when voice
              setup is unavailable while the report publishes in the background
              after the session ends.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
            <div className="rounded-[1.35rem] border border-[color:var(--curator-line)] bg-white/80 p-3">
              <strong>Transport:</strong> {state.realtime.provider}
            </div>
            <div className="rounded-[1.35rem] border border-[color:var(--curator-line)] bg-white/80 p-3">
              <strong>Route:</strong> {state.sessionId}
            </div>
            <div className="rounded-[1.35rem] border border-[color:var(--curator-line)] bg-white/80 p-3">
              <strong>Prompt ladder:</strong> {state.questionIndex + 1} turns
              generated from the current mode preset.
            </div>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({
                  variant: "outline",
                  className:
                    "mt-2 flex w-full items-center justify-center rounded-full border-[color:var(--curator-line)] bg-white",
                }),
              )}
            >
              Back to dashboard
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
