import Link from "next/link";
import { ArrowRight, Clock3, Mic, Radar, Sparkles, Target } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { createPostgresInterviewRepository } from "@/lib/data/database-repository";
import { buildDashboardReadModel } from "@/lib/dashboard/read-model";
import { createPostgresProgressStore } from "@/lib/progress-service/database-store";
import { createProgressService } from "@/lib/progress-service/progress-service";
import { createPostgresReportStore } from "@/lib/report-service/database-store";
import { createReportService } from "@/lib/report-service/report-service";
import { SectionTitle } from "@/components/section-title";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const iconMap = {
  voice: Mic,
  report: Radar,
  plan: Sparkles,
  target: Target,
} as const;

export default async function DashboardPage() {
  const user = await requireWorkspaceUser("/dashboard");
  const repository = createPostgresInterviewRepository();
  const reportService = createReportService(createPostgresReportStore());
  const progressService = createProgressService(createPostgresProgressStore());

  const [workspace, sessions, reportOverviews, progressSnapshot] = await Promise.all([
    repository.getWorkspaceSnapshot(user.id),
    repository.listWorkspaceSessions(user.id),
    reportService.listReportOverviews(user.id),
    progressService.getProgressSnapshot(user.id),
  ]);

  const latestReport = reportOverviews[0]
    ? await reportService.getReportById(user.id, reportOverviews[0].id)
    : null;
  const model = buildDashboardReadModel({
    workspace,
    reportOverviews,
    latestReport,
    progressSnapshot,
    completedSessionCount: sessions.filter((session) => session.status === "completed").length,
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="grid gap-6 rounded-[2rem] border border-white/70 bg-slate-950 p-8 text-white shadow-[0_30px_100px_-45px_rgba(15,23,42,0.8)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Badge className="w-fit rounded-full bg-white/10 text-white">
            Candidate workspace
          </Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-[-0.04em]">
              Good evening, {model.firstName}.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300">
              {model.heroDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button
              asChild
              className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
            >
              <Link href="/interview">
                Start a live interview
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href={model.latestReport ? `/reports/${model.latestReport.id}` : "/reports"}>
                Review latest scorecard
              </Link>
            </Button>
          </div>
        </div>
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader className="pb-4">
            <CardDescription className="text-slate-300">
              Next deliberate drill
            </CardDescription>
            <CardTitle className="text-2xl">{model.nextDrillTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-4">
              <Clock3 className="mt-0.5 size-4 text-amber-300" />
              <div className="space-y-1 text-sm text-slate-300">
                <p className="font-medium text-white">
                  {model.latestReport ? "Grounded practice plan" : "Finish the first loop"}
                </p>
                <p>{model.nextDrillDescription}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="size-10 border border-white/10 bg-white/10">
                <AvatarFallback className="bg-transparent text-white">
                  AI
                </AvatarFallback>
              </Avatar>
              <p className="text-sm leading-6 text-slate-300">
                {model.latestReport
                  ? `Latest report: ${model.latestReport.summary}`
                  : "The next completed interview will generate a persisted report and a reusable practice plan."}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {model.stats.map((stat) => {
          const Icon = iconMap[stat.icon];

          return (
            <Card key={stat.label} className="border-slate-200/60 bg-white/85">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>{stat.label}</CardDescription>
                  <div className="rounded-2xl bg-[#1638d4]/10 p-2 text-[#1638d4]">
                    <Icon className="size-4" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-semibold tracking-[-0.03em]">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-slate-600">
                {stat.copy}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-slate-200/60 bg-white/85">
          <CardHeader>
            <SectionTitle
              eyebrow="Progress snapshot"
              title="Scores by interview track"
              description="These scorecards are now derived from persisted report data instead of static fixtures."
            />
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={model.scorecards[0]?.mode ?? "behavioral"} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                {model.scorecards.map((scorecard) => (
                  <TabsTrigger key={scorecard.mode} value={scorecard.mode}>
                    {scorecard.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {model.scorecards.map((scorecard) => (
                <TabsContent key={scorecard.mode} value={scorecard.mode} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    {scorecard.competencies.map((competency) => (
                      <div
                        key={competency.label}
                        className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">
                            {competency.label}
                          </span>
                          <span className="font-mono text-slate-500">
                            {competency.score}%
                          </span>
                        </div>
                        <Progress value={competency.score} className="h-2.5" />
                        <p className="text-sm leading-6 text-slate-600">
                          {competency.note}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Card className="border-slate-200 bg-slate-50">
                    <CardHeader>
                      <CardDescription>Coaching note</CardDescription>
                      <CardTitle className="text-lg">
                        {scorecard.coachingTitle}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm leading-6 text-slate-600">
                      {scorecard.coachingBody}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 bg-white/85">
          <CardHeader>
            <SectionTitle
              eyebrow="Today"
              title="Deliberate practice plan"
              description="When a report exists, the next drills come straight from the stored practice plan."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {model.practicePlan.length > 0 ? (
              model.practicePlan.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Step {index + 1}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {item.title}
                      </p>
                    </div>
                    <Badge variant="secondary">{item.length}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Complete your first interview to generate a real plan here.
              </div>
            )}
            <Link
              href={model.practicePlan.length > 0 ? "/reports" : "/onboarding"}
              className={cn(
                buttonVariants({
                  variant: "outline",
                  className: "mt-2 flex w-full rounded-full",
                }),
              )}
            >
              {model.practicePlan.length > 0 ? "Open reports" : "Finish onboarding"}
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
