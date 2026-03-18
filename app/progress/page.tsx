import type { Metadata } from "next";
import { ProgressDashboard } from "@/components/progress/progress-dashboard";
import {
  buildProgressDashboardSnapshot,
  PROGRESS_SESSIONS,
} from "@/lib/analytics/progress";
import { getPostHogTelemetryStatus } from "@/lib/analytics/posthog";
import { getSentryTelemetryStatus } from "@/lib/observability/sentry";
import { getRateLimitTelemetryStatus } from "@/lib/rate-limit/upstash";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "Production-style progress dashboard for interview practice, telemetry health, and request budgeting.",
};

export default function ProgressPage() {
  const snapshot = buildProgressDashboardSnapshot(PROGRESS_SESSIONS);
  const posthog = getPostHogTelemetryStatus();
  const sentry = getSentryTelemetryStatus();
  const rateLimit = getRateLimitTelemetryStatus();

  return (
    <ProgressDashboard
      snapshot={snapshot}
      posthog={posthog}
      sentry={sentry}
      rateLimit={rateLimit}
      quotaUsed={24}
      quotaLimit={rateLimit.limit}
      quotaResetAt="midnight UTC"
    />
  );
}
