import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  FileText,
  Sparkles,
  Target,
} from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { buildDashboardReadModel } from "@/lib/dashboard/read-model";
import { createProgressService } from "@/lib/progress-service/progress-service";
import { createReportService } from "@/lib/report-service/report-service";
import { CandidateShell } from "@/components/workspace/candidate-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  createWorkspaceInterviewRepository,
  createWorkspaceProgressStore,
  createWorkspaceReportStore,
} from "@/lib/workspace/runtime";

export const dynamic = "force-dynamic";

const iconMap = {
  voice: AudioLines,
  report: FileText,
  plan: Sparkles,
  target: Target,
} as const;

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "TC";
}

export default async function DashboardPage() {
  const user = await requireWorkspaceUser("/dashboard");
  const repository = await createWorkspaceInterviewRepository();
  const reportService = createReportService(await createWorkspaceReportStore());
  const progressService = createProgressService(await createWorkspaceProgressStore());

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
  const latestReportHref = model.latestReport ? `/reports/${model.latestReport.id}` : "/reports";
  const candidateLabel = workspace.profile?.fullName ?? user.email ?? "Candidate";

  return (
    <CandidateShell
      activeHref="/dashboard"
      userLabel={candidateLabel}
      headline={model.headline}
      railNote={
        <>
          `/workspace` now resolves to `/dashboard`, so all post-auth flows land
          on a single signed-in home.
        </>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
            <div className="rounded-[34px] bg-[#1b3958] p-6 text-white shadow-[0_30px_120px_-56px_rgba(15,23,42,0.95)] sm:p-8">
              <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
                <div className="max-w-3xl space-y-5">
                  <Badge className="w-fit rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-white">
                    Candidate dashboard
                  </Badge>
                  <div className="space-y-3">
                    <h1 className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                      Good evening, {model.firstName}.
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-white/70">
                      {model.heroDescription}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/interview"
                      className={cn(
                        buttonVariants({
                          className:
                            "h-12 rounded-full bg-[#f4efe5] px-6 text-[#122033] hover:bg-white",
                        }),
                      )}
                    >
                      Start live interview
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      href={latestReportHref}
                      className={cn(
                        buttonVariants({
                          variant: "outline",
                          className:
                            "h-12 rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white",
                        }),
                      )}
                    >
                      {model.latestReport ? "Open latest report" : "View reports"}
                    </Link>
                  </div>
                </div>

                <Card className="w-full max-w-sm border-white/10 bg-white/5 text-white shadow-none">
                  <CardHeader className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-12 border border-white/10 bg-white/10">
                        <AvatarFallback className="bg-transparent text-white">
                          {getInitials(candidateLabel)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-white">{candidateLabel}</p>
                        <p className="text-sm text-white/70">{model.targetRole}</p>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/60">
                        Active mode
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                        {model.activeModeLabel}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/70">
                        {model.nextDrillDescription}
                      </p>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </div>

            <Card className="border-[#1b3958]/10 bg-[#f9f3e9]/90 shadow-[0_20px_70px_-50px_rgba(27,57,88,0.5)]">
              <CardHeader className="space-y-3">
                <CardDescription className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#1b3958]/60">
                  Next deliberate drill
                </CardDescription>
                <CardTitle className="text-3xl tracking-[-0.05em] text-[#122033]">
                  {model.nextDrillTitle}
                </CardTitle>
                <p className="text-sm leading-7 text-slate-600">
                  {model.latestReport
                    ? model.latestReport.summary
                    : "Complete the first session and the dashboard will replace placeholders with persisted coaching data."}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[24px] border border-[#1b3958]/10 bg-white/75 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#1b3958]/60">
                    Latest report
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-semibold tracking-[-0.05em] text-[#122033]">
                        {model.latestReport?.score ?? "--"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {model.latestReport
                          ? `${model.latestReport.band} band`
                          : "No completed report yet"}
                      </p>
                    </div>
                    <Link
                      href={latestReportHref}
                      className={cn(
                        buttonVariants({
                          variant: "outline",
                          className: "rounded-full border-[#1b3958]/15 bg-white",
                        }),
                      )}
                    >
                      Review
                    </Link>
                  </div>
                </div>
                <div className="rounded-[24px] border border-dashed border-[#1b3958]/15 bg-white/60 p-4 text-sm leading-6 text-slate-600">
                  {model.latestSession
                    ? `${model.latestSession.trackLabel} on ${model.latestSession.completedAtLabel} ran ${model.latestSession.durationMinutes} minutes with ${model.latestSession.followUps} follow-up prompts.`
                    : "The session summary will appear here after the first completed interview."}
                </div>
              </CardContent>
            </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {model.stats.map((stat) => {
              const Icon = iconMap[stat.icon];

              return (
                <Card
                  key={stat.label}
                  className="border-[#1b3958]/10 bg-[#fbf6ee]/85 shadow-[0_16px_50px_-42px_rgba(27,57,88,0.45)]"
                >
                  <CardHeader className="gap-4 pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-slate-600">
                        {stat.label}
                      </CardDescription>
                      <div className="rounded-2xl bg-[#e7d9c7] p-2 text-[#1b3958]">
                        <Icon className="size-4" />
                      </div>
                    </div>
                    <CardTitle className="text-3xl tracking-[-0.05em] text-[#122033]">
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <div className="space-y-6">
              <Card className="border-[#1b3958]/10 bg-[#fbf7ef]/90">
                <CardHeader className="space-y-3">
                  <CardDescription className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#1b3958]/60">
                    Recent session
                  </CardDescription>
                  <CardTitle className="text-3xl tracking-[-0.05em] text-[#122033]">
                    {model.latestSession?.focus ?? "No completed sessions yet"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {model.latestSession ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {[
                          {
                            label: "Track",
                            value: model.latestSession.trackLabel,
                          },
                          {
                            label: "Score",
                            value: `${model.latestSession.score}`,
                          },
                          {
                            label: "Follow-ups",
                            value: `${model.latestSession.followUps}`,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-[24px] border border-[#1b3958]/10 bg-white/75 p-4"
                          >
                            <p className="text-sm font-medium text-slate-500">{item.label}</p>
                            <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#122033]">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-[28px] bg-[#1b3958] p-5 text-white">
                        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/60">
                          Coaching note
                        </p>
                        <p className="mt-3 text-base leading-7 text-white/80">
                          {model.latestSession.note}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[28px] border border-dashed border-[#1b3958]/15 bg-white/70 p-5 text-sm leading-7 text-slate-600">
                      Run the first completed interview to populate this section with persisted
                      timing, follow-ups, and coaching notes.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[#1b3958]/10 bg-[#fbf7ef]/90">
                <CardHeader className="space-y-3">
                  <CardDescription className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#1b3958]/60">
                    Mode scorecards
                  </CardDescription>
                  <CardTitle className="text-3xl tracking-[-0.05em] text-[#122033]">
                    Readiness by interview track
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {model.scorecards.map((scorecard) => (
                    <div
                      key={scorecard.mode}
                      className="rounded-[28px] border border-[#1b3958]/10 bg-white/80 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold tracking-[-0.03em] text-[#122033]">
                            {scorecard.label}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {scorecard.coachingTitle}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-[#e7d9c7] text-[#1b3958]"
                        >
                          {scorecard.competencies[0]?.score ?? 0} lead signal
                        </Badge>
                      </div>
                      <div className="mt-5 space-y-4">
                        {scorecard.competencies.slice(0, 3).map((competency) => (
                          <div key={competency.label} className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-slate-600">
                              <span>{competency.label}</span>
                              <span>{competency.score}%</span>
                            </div>
                            <Progress value={competency.score} className="h-2.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-[#1b3958]/10 bg-[#fbf7ef]/90">
                <CardHeader className="space-y-3">
                  <CardDescription className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#1b3958]/60">
                    Active search
                  </CardDescription>
                  <CardTitle className="text-3xl tracking-[-0.05em] text-[#122033]">
                    {model.jobTarget
                      ? `${model.jobTarget.companyName} | ${model.jobTarget.jobTitle}`
                      : model.targetRole}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
                  <div className="rounded-[24px] border border-[#1b3958]/10 bg-white/75 p-4">
                    <p>{model.jobTarget?.jobDescription ?? "No saved job description yet."}</p>
                  </div>
                  <div className="rounded-[24px] border border-[#1b3958]/10 bg-white/75 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#1b3958]/60">
                      Resume asset
                    </p>
                    <p className="mt-2 text-base font-semibold text-[#122033]">
                      {model.resumeAsset?.fileName ?? "Resume not uploaded"}
                    </p>
                    <p className="mt-2">
                      {model.resumeAsset?.summary ??
                        "Finish onboarding to attach a resume summary to the signed-in workspace."}
                    </p>
                  </div>
                  <Link
                    href="/onboarding"
                    className={cn(
                      buttonVariants({
                        variant: "outline",
                        className: "w-full rounded-full border-[#1b3958]/15 bg-white",
                      }),
                    )}
                  >
                    Review onboarding
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-[#1b3958]/10 bg-[#fbf7ef]/90">
                <CardHeader className="space-y-3">
                  <CardDescription className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#1b3958]/60">
                    Timeline
                  </CardDescription>
                  <CardTitle className="text-3xl tracking-[-0.05em] text-[#122033]">
                    Latest score movement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {model.timeline.length > 0 ? (
                    model.timeline.map((point) => (
                      <div
                        key={`${point.label}-${point.trackLabel}`}
                        className="flex items-center justify-between rounded-[22px] border border-[#1b3958]/10 bg-white/75 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-[#122033]">{point.label}</p>
                          <p className="text-sm text-slate-600">{point.trackLabel}</p>
                        </div>
                        <p className="text-lg font-semibold tracking-[-0.03em] text-[#122033]">
                          {point.score}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-[#1b3958]/15 bg-white/70 p-4 text-sm leading-6 text-slate-600">
                      Score movement will appear here after completed sessions are persisted to
                      progress history.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[#1b3958]/10 bg-[#fbf7ef]/90">
                <CardHeader className="space-y-3">
                  <CardDescription className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#1b3958]/60">
                    Reference prompts
                  </CardDescription>
                  <CardTitle className="text-3xl tracking-[-0.05em] text-[#122033]">
                    Question bank preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {model.questionPreview.map((question) => (
                    <div
                      key={question.id}
                      className="rounded-[24px] border border-[#1b3958]/10 bg-white/75 p-4"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#1b3958]/60">
                        {question.modeLabel}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{question.prompt}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-[#1b3958]/10 bg-[#fbf7ef]/90">
                <CardHeader className="space-y-3">
                  <CardDescription className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#1b3958]/60">
                    Practice plan
                  </CardDescription>
                  <CardTitle className="text-3xl tracking-[-0.05em] text-[#122033]">
                    What to do next
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {model.practicePlan.length > 0 ? (
                    model.practicePlan.map((item, index) => (
                      <div
                        key={item.title}
                        className="rounded-[24px] border border-[#1b3958]/10 bg-white/75 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1b3958]/60">
                            Step {index + 1}
                          </p>
                          <Badge variant="secondary" className="rounded-full">
                            {item.length}
                          </Badge>
                        </div>
                        <p className="mt-2 text-base font-semibold text-[#122033]">
                          {item.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-[#1b3958]/15 bg-white/70 p-4 text-sm leading-6 text-slate-600">
                      Complete an interview to generate a persisted drill plan here.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
      </section>
    </CandidateShell>
  );
}
