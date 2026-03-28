"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, RefreshCcw } from "lucide-react";
import type { ReportGenerationWorkflow } from "@/lib/report-service/report-service";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ReportProcessingPanelProps = {
  sessionId: string;
  initialState: ReportGenerationWorkflow;
};

function toLegacyWorkflow(value: unknown): ReportGenerationWorkflow {
  if (value && typeof value === "object" && "status" in value) {
    const candidate = value as {
      status: ReportGenerationWorkflow["status"];
      job?: { id?: string | null } | null;
      report?: { id?: string | null } | null;
      failure?: { message?: string | null } | null;
      jobId?: string;
      reportId?: string;
      error?: string;
    };
    if ("job" in candidate || "report" in candidate || "failure" in candidate) {
      return {
        status: candidate.status,
        jobId:
          candidate.job?.id ??
          (candidate.status === "completed" ? candidate.report?.id ?? undefined : undefined),
        reportId: candidate.report?.id ?? undefined,
        error: candidate.failure?.message ?? undefined,
      };
    }

    return candidate;
  }

  return {
    status: "not_requested",
  };
}

function getStatusLabel(status: ReportGenerationWorkflow["status"]) {
  switch (status) {
    case "not_requested":
      return "Not requested";
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

function getStatusDescription(state: ReportGenerationWorkflow) {
  switch (state.status) {
    case "not_requested":
      return "The report has not been requested yet.";
    case "queued":
      return "The interview has been saved and the background report job is waiting to start.";
    case "running":
      return "The report is being generated in the background. This page will redirect as soon as it is ready.";
    case "failed":
      return (
        state.error ??
        "The report job failed. Retry it to generate the latest scorecard."
      );
    case "completed":
      return "The report is ready. Redirecting now.";
  }
}

export function ReportProcessingPanel({
  sessionId,
  initialState,
}: ReportProcessingPanelProps) {
  const router = useRouter();
  const [state, setState] = useState(() => toLegacyWorkflow(initialState));
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
        const response = await fetch(`/api/interview/sessions/${sessionId}/report-generation`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error?.message ?? "Failed to refresh report status.",
          );
        }

        const payload = await response.json().catch(() => null);
        const nextState = toLegacyWorkflow(payload?.data ?? payload);

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
        const response = await fetch(`/api/interview/sessions/${sessionId}/report-generation`, {
          method: "POST",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error?.message ?? "Failed to retry report generation.",
          );
        }

        const payload = await response.json().catch(() => null);
        const nextState = toLegacyWorkflow(payload?.data ?? payload);
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
            : state.status === "not_requested"
              ? "Queue report generation to begin background processing."
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
