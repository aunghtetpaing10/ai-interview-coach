import Link from "next/link";
import { ArrowRight, Flame, Gauge, ShieldCheck, TimerReset } from "lucide-react";
import { SectionTitle } from "@/components/section-title";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ProgressDashboardSnapshot } from "@/lib/analytics/progress";
import type { PostHogTelemetryStatus } from "@/lib/analytics/posthog";
import type { SentryTelemetryStatus } from "@/lib/observability/sentry";
import type { RateLimitTelemetryStatus } from "@/lib/rate-limit/upstash";
import { ProgressTrendChart } from "@/components/progress/progress-trend-chart";
import { IntegrationStatusGrid } from "@/components/progress/integration-status-grid";
import { SessionFeed } from "@/components/progress/session-feed";

type ProgressDashboardProps = {
  snapshot: ProgressDashboardSnapshot;
  posthog: PostHogTelemetryStatus;
  sentry: SentryTelemetryStatus;
  rateLimit: RateLimitTelemetryStatus;
  quotaUsed: number;
  quotaLimit: number;
  quotaResetAt: string;
};

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Flame;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">{label}</p>
        <div className="rounded-2xl bg-white/10 p-2 text-white">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}

export function ProgressDashboard({
  snapshot,
  posthog,
  sentry,
  rateLimit,
  quotaUsed,
  quotaLimit,
  quotaResetAt,
}: ProgressDashboardProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)]" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden border-white/10 bg-white/5 text-white shadow-[0_30px_120px_-60px_rgba(15,23,42,0.9)]">
            <CardHeader className="gap-6 border-b border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0))]">
              <div className="flex items-center justify-between">
                <Badge className="rounded-full bg-white/10 text-white">Progress cockpit</Badge>
                <span className="font-mono text-xs uppercase tracking-[0.28em] text-slate-400">
                  live snapshot
                </span>
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                  The interview loop is trending upward and the telemetry layer is visible.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300">
                  This view turns practice into an operational system: score trends, weak-track detection, and integration health all stay in one place.
                </p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Readiness"
                value={snapshot.readinessBand}
                detail={`${snapshot.averageScore}% average score across ${snapshot.sessions.length} sessions.`}
                icon={Gauge}
              />
              <StatCard
                label="Momentum"
                value={`${snapshot.momentum > 0 ? "+" : ""}${snapshot.momentum}`}
                detail="Recent practice is outpacing the previous window."
                icon={Flame}
              />
              <StatCard
                label="Streak"
                value={`${snapshot.streakDays} days`}
                detail="The latest sessions form a consecutive practice run."
                icon={TimerReset}
              />
              <StatCard
                label="Minutes"
                value={`${snapshot.totalMinutes}`}
                detail={`${snapshot.averageFollowUps} follow-ups per interview on average.`}
                icon={ShieldCheck}
              />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader className="gap-4">
              <CardDescription className="text-slate-300">Latest session</CardDescription>
              <CardTitle className="text-2xl">{snapshot.latestSession.focus}</CardTitle>
              <CardDescription className="leading-6 text-slate-300">
                {snapshot.latestSession.note}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Score</span>
                  <span>{snapshot.latestSession.score}%</span>
                </div>
                <Progress value={snapshot.latestSession.score} className="mt-3 h-2.5" />
                <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                  <span>{snapshot.latestSession.track}</span>
                  <span>{snapshot.latestSession.durationMinutes} min</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Strongest track
                  </p>
                  <p className="mt-2 text-xl font-semibold">{snapshot.strongestTrack.label}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {snapshot.strongestTrack.averageScore}% average across {snapshot.strongestTrack.sessions} sessions.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Weakest track
                  </p>
                  <p className="mt-2 text-xl font-semibold">{snapshot.weakestTrack.label}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {snapshot.weakestTrack.averageScore}% average. Focus the next practice block here.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({
                      className: "rounded-full bg-white text-slate-950 hover:bg-slate-100",
                    }),
                  )}
                >
                  Back to dashboard
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/"
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                      className: "rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10",
                    }),
                  )}
                >
                  Overview
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-white/90 text-slate-950 shadow-[0_24px_100px_-60px_rgba(15,23,42,0.85)]">
            <CardHeader className="gap-4">
              <SectionTitle
                eyebrow="Trendline"
                title="Score trajectory over time"
                description="The recent run shows sustained improvement rather than a single lucky session."
              />
            </CardHeader>
            <CardContent>
              <ProgressTrendChart data={snapshot.timeline} />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/90 text-slate-950">
            <CardHeader className="gap-4">
              <SectionTitle
                eyebrow="Track health"
                title="What is helping and what still needs work"
                description="Use the tabs to inspect each interview track without losing the broader trend."
              />
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={snapshot.trackSummaries[0].track} className="space-y-5">
                <TabsList className="grid w-full grid-cols-4">
                  {snapshot.trackSummaries.map((track) => (
                    <TabsTrigger key={track.track} value={track.track}>
                      {track.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {snapshot.trackSummaries.map((track) => (
                  <TabsContent key={track.track} value={track.track} className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {track.sessions} sessions
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">
                            {track.averageScore}%
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-slate-900 text-white">
                          {track.track}
                        </Badge>
                      </div>
                      <Separator className="my-4 bg-slate-200" />
                      <p className="text-sm leading-6 text-slate-600">{track.bestNote}</p>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <IntegrationStatusGrid
          posthog={posthog}
          sentry={sentry}
          rateLimit={rateLimit}
          quotaUsed={quotaUsed}
          quotaLimit={quotaLimit}
          quotaResetAt={quotaResetAt}
        />

        <SessionFeed sessions={snapshot.sessions} />
      </div>
    </main>
  );
}
