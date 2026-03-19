import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Radar } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { ProgressDashboard } from "@/components/progress/progress-dashboard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPostHogTelemetryStatus } from "@/lib/analytics/posthog";
import { getSentryTelemetryStatus } from "@/lib/observability/sentry";
import { createPostgresProgressStore } from "@/lib/progress-service/database-store";
import { createProgressService } from "@/lib/progress-service/progress-service";
import { getRateLimitTelemetryStatus } from "@/lib/rate-limit/upstash";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "Production-style progress dashboard for interview practice, telemetry health, and request budgeting.",
};

export default async function ProgressPage() {
  const user = await requireWorkspaceUser("/progress");
  const progressService = createProgressService(createPostgresProgressStore());
  const [sessions, snapshot] = await Promise.all([
    progressService.listProgressSessions(user.id),
    progressService.getProgressSnapshot(user.id),
  ]);
  const posthog = getPostHogTelemetryStatus();
  const sentry = getSentryTelemetryStatus();
  const rateLimit = getRateLimitTelemetryStatus();

  if (!snapshot) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 lg:px-10">
        <Card className="border-slate-200/70 bg-white/90 shadow-[0_24px_90px_-50px_rgba(15,23,42,0.45)]">
          <CardHeader className="space-y-4">
            <Badge className="w-fit rounded-full bg-[#1638d4] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white">
              Progress cockpit
            </Badge>
            <CardTitle className="text-3xl tracking-[-0.04em] text-slate-950">
              No completed sessions yet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-7 text-slate-600">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Radar className="mt-0.5 size-4 text-[#1638d4]" />
              <p>
                Complete a live interview and generate a report. The next visit
                here will show real score trends, track health, and telemetry
                status against persisted user data.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/interview"
                className={cn(
                  buttonVariants({
                    className: "rounded-full bg-slate-950 text-white hover:bg-slate-800",
                  }),
                )}
              >
                Start interview
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/onboarding"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    className: "rounded-full",
                  }),
                )}
              >
                Review onboarding
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <ProgressDashboard
      snapshot={snapshot}
      posthog={posthog}
      sentry={sentry}
      rateLimit={rateLimit}
      quotaUsed={Math.min(sessions.length, rateLimit.limit)}
      quotaLimit={rateLimit.limit}
      quotaResetAt={rateLimit.enabled ? "rolling window" : "when configured"}
    />
  );
}
