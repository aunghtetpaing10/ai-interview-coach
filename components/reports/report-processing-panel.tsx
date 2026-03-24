"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, RefreshCcw } from "lucide-react";
import type { ReportGenerationState } from "@/lib/report-service/report-service";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ReportProcessingPanelProps = {
  sessionId: string;
  initialState: ReportGenerationState;
};

function getStatusLabel(status: ReportGenerationState["status"]) {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "failed":
      return "Failed";
    case "completed":
      return "Completed";
  }
}

function getStatusDescription(state: ReportGenerationState) {
  switch (state.status) {
    case "queued":
      return "The interview has been saved and the background report job is waiting to start.";
    case "running":
      return "The report is being generated in the background. This page will redirect as soon as it is ready.";
    case "failed":
      return state.error ?? "The report job failed. Retry it to generate the latest scorecard.";
    case "completed":
      return "The report is ready. Redirecting now.";
  }
}

export function ReportProcessingPanel({
  sessionId,
  initialState,
}: ReportProcessingPanelProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [pollError, setPollError] = useState<string | null>(null);
  const [isRetryPending, startRetryTransition] = useTransition();

  useEffect(() => {
    if (state.status === "completed" && state.reportId) {
      startRetryTransition(() => {
        router.replace(`/reports/${state.reportId}`);
      });
    }
  }, [router, state.reportId, state.status]);

  useEffect(() => {
    if (state.status !== "queued" && state.status !== "running") {
      return;
    }

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/interview/sessions/${sessionId}/report`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to refresh report status.");
        }

        const nextState = (await response.json()) as ReportGenerationState;

        if (cancelled) {
          return;
        }

        setState(nextState);
        setPollError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPollError(
          error instanceof Error
            ? error.message
            : "Failed to refresh report status.",
        );
      }
    };

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [sessionId, state.status]);

  function handleRetry() {
    startRetryTransition(async () => {
      try {
        const response = await fetch(`/api/interview/sessions/${sessionId}/report`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to retry report generation.");
        }

        const nextState = (await response.json()) as ReportGenerationState;
        setState(nextState);
        setPollError(null);
      } catch (error) {
        setPollError(
          error instanceof Error
            ? error.message
            : "Failed to retry report generation.",
        );
      }
    });
  }

  const statusDescription = getStatusDescription(state);

  return (
    <Card className="curator-card">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Badge className="rounded-full bg-[rgba(20,63,134,0.12)] text-[color:var(--curator-navy)]">
            Report processing
          </Badge>
          <Badge variant="secondary" className="rounded-full">
            {getStatusLabel(state.status)}
          </Badge>
        </div>
        <CardTitle className="text-3xl tracking-[-0.05em] text-[color:var(--curator-ink)]">
          {state.status === "failed"
            ? "The background job needs a retry."
            : "The latest interview report is in flight."}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
        <div className="rounded-[1.5rem] border border-[color:var(--curator-line)] bg-white/80 p-4">
          <p>{statusDescription}</p>
        </div>

        {(state.status === "queued" || state.status === "running") && (
          <div className="flex items-center gap-3 rounded-[1.5rem] border border-[color:var(--curator-line)] bg-[rgba(20,63,134,0.05)] p-4 text-[color:var(--curator-navy)]">
            <LoaderCircle className="size-4 animate-spin" />
            <p>
              Polling every two seconds. You can refresh this page and it will keep
              tracking the same job.
            </p>
          </div>
        )}

        {state.status === "failed" && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetryPending}
            className={cn(
              buttonVariants({
                className:
                  "h-12 rounded-full bg-[color:var(--curator-navy)] px-6 text-white hover:bg-[color:var(--curator-navy-strong)]",
              }),
            )}
          >
            <RefreshCcw className="size-4" />
            {isRetryPending ? "Retrying..." : "Retry report generation"}
          </button>
        )}

        {pollError && (
          <div className="flex items-center gap-3 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <AlertCircle className="size-4" />
            <p>{pollError}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
