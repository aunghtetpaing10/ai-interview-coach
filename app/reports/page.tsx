import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { createReportService } from "@/lib/report-service/report-service";
import { CandidateShell } from "@/components/workspace/candidate-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createWorkspaceReportStore } from "@/lib/workspace/runtime";

export default async function ReportsPage() {
  const user = await requireWorkspaceUser("/reports");
  const reportService = createReportService(await createWorkspaceReportStore());
  const reportOverviews = await reportService.listReportOverviews(user.id);
  const latestReport = reportOverviews[0];
  const userLabel = user.email ?? "Candidate";

  if (latestReport) {
    redirect(`/reports/${latestReport.id}`);
  }

  return (
    <CandidateShell
      activeHref="/reports"
      userLabel={userLabel}
      headline="Review stored scorecards, transcript evidence, answer rewrites, and the next deliberate practice plan."
      railNote="`/reports` now opens the latest completed report by default when one exists."
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <Card className="curator-card-dark overflow-hidden">
          <CardHeader className="gap-5 border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <Badge className="rounded-full bg-white/10 text-white">
                Feedback archive
              </Badge>
              <span className="font-mono text-xs uppercase tracking-[0.28em] text-slate-300">
                empty state
              </span>
            </div>
            <CardTitle className="curator-display text-5xl text-white sm:text-6xl">
              No completed reports yet.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 text-slate-200">
              Finish an interview and queue report generation. The latest report
              will become the default `/reports` destination, while older reports
              remain directly addressable from their own URLs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
                What appears here
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <p>Stored scorecards anchored to persisted transcript evidence.</p>
                <p>Rewrite recommendations that convert weak answers into tighter versions.</p>
                <p>Practice steps that carry into the next interview round.</p>
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
                Recommended next move
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Finish onboarding if the profile is still incomplete, then run a
                live interview to seed the first report row.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="curator-card">
          <CardHeader className="space-y-3">
            <CardDescription className="curator-kicker">
              Route behavior
            </CardDescription>
            <CardTitle className="text-3xl tracking-[-0.05em] text-[color:var(--curator-ink)]">
              The report detail becomes the home.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
            <div className="rounded-[1.5rem] border border-[color:var(--curator-line)] bg-white/80 p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-4 text-[color:var(--curator-navy)]" />
                <p>
                  When a report exists, the index route redirects straight to the
                  latest detail page instead of forcing a catalog-first workflow.
                </p>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--curator-line)] bg-white/80 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-4 text-[color:var(--curator-orange)]" />
                <p>
                  Direct links such as `/reports/[reportId]` remain stable for
                  reopening specific sessions later.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/interview"
                className={cn(
                  buttonVariants({
                    className:
                      "h-12 rounded-full bg-[color:var(--curator-navy)] px-6 text-white hover:bg-[color:var(--curator-navy-strong)]",
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
                    className:
                      "h-12 rounded-full border-[color:var(--curator-line)] bg-white/80 px-6",
                  }),
                )}
              >
                Finish onboarding
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </CandidateShell>
  );
}
