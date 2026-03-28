import { NextResponse } from "next/server";
import { getPostHogTelemetryStatus } from "@/lib/analytics/posthog";
import { getSqlClient } from "@/lib/db/client";
import { getEnv, getReportJobRuntimeConfig, isE2EDemoMode } from "@/lib/env";
import { getSentryTelemetryStatus } from "@/lib/observability/sentry";
import { getRateLimitTelemetryStatus } from "@/lib/rate-limit/upstash";

export const runtime = "nodejs";

type DependencyStatus = "healthy" | "ready" | "degraded" | "skipped";

export async function GET() {
  const env = getEnv();
  const rawEnv = process.env as Record<string, string | undefined>;
  const database = {
    required: Boolean(env.POSTGRES_URL),
    status: "skipped" as DependencyStatus,
    detail: env.POSTGRES_URL
      ? "Not checked yet."
      : "POSTGRES_URL is unset, so the app is running without a live database.",
  };

  if (env.POSTGRES_URL) {
    try {
      await getSqlClient().unsafe("select 1 as ok");
      database.status = "healthy";
      database.detail = "Postgres responded to a readiness probe.";
    } catch (error) {
      database.status = "degraded";
      database.detail =
        error instanceof Error ? error.message : "Postgres readiness probe failed.";
    }
  }

  const reportJobs = {
    required: Boolean(
      env.INNGEST_EVENT_KEY && env.INNGEST_SIGNING_KEY && env.OPENAI_API_KEY,
    ),
    status: "skipped" as DependencyStatus,
    detail: "Not checked yet.",
  };

  const reportJobRuntimeConfig = getReportJobRuntimeConfig();
  if (reportJobRuntimeConfig) {
    reportJobs.status = "ready";
    reportJobs.detail = `Inngest app ${reportJobRuntimeConfig.appId} is configured for report generation.`;
  } else if (isE2EDemoMode()) {
    reportJobs.detail = "Demo mode skips background report jobs.";
  } else {
    reportJobs.detail =
      "Set INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY, and OPENAI_API_KEY to enable report jobs.";
  }

  const posthog = getPostHogTelemetryStatus(rawEnv);
  const sentry = getSentryTelemetryStatus(rawEnv);
  const rateLimit = getRateLimitTelemetryStatus(rawEnv);
  const status = database.status === "degraded" || reportJobs.status === "degraded" ? "degraded" : "ok";

  return NextResponse.json(
    {
      status,
      service: "ai-interview-coach",
      timestamp: new Date().toISOString(),
      mode: isE2EDemoMode() ? "demo" : "live",
      dependencies: {
        database,
        reportJobs,
        analytics: posthog,
        observability: sentry,
        rateLimit,
      },
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
