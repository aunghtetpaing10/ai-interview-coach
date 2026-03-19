import Link from "next/link";
import {
  ArrowRight,
  FileText,
  GalleryHorizontalEnd,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionTitle } from "@/components/section-title";
import { REPORT_EVAL_CASES, REPORT_PROMPT_FIXTURES } from "@/lib/evals/fixtures";
import { createPostgresReportStore } from "@/lib/report-service/database-store";
import { createReportService } from "@/lib/report-service/report-service";
import { cn } from "@/lib/utils";

export default async function ReportsPage() {
  const user = await requireWorkspaceUser("/reports");
  const reportService = createReportService(createPostgresReportStore());
  const reportOverviews = await reportService.listReportOverviews(user.id);
  const featuredReport = reportOverviews[0]
    ? await reportService.getReportById(user.id, reportOverviews[0].id)
    : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(39,94,254,0.14),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(244,151,70,0.14),_transparent_30%),linear-gradient(180deg,_#f8f7f2_0%,_#f2eee5_48%,_#f8f4ec_100%)]" />
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 px-6 py-10 lg:px-10">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Badge className="rounded-full bg-[#1638d4] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-white">
              Reporting + evals
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">
                Reports that read like a product, not a chat transcript.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">
                Completed sessions now produce stored scorecards, transcript citations,
                answer rewrites, and a reusable practice plan for the authenticated user.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href={featuredReport ? `/reports/${featuredReport.id}` : "/interview"}
                className={cn(
                  buttonVariants({
                    size: "lg",
                    className:
                      "h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800",
                  }),
                )}
              >
                {featuredReport ? "Open latest report" : "Complete an interview"}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#catalog"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className:
                      "h-12 rounded-full border-slate-300 bg-white/75 px-6",
                  }),
                )}
              >
                Browse report history
              </Link>
            </div>
          </div>

          <Card className="border-slate-200/70 bg-slate-950 text-white shadow-[0_30px_100px_-35px_rgba(15,23,42,0.82)]">
            <CardHeader className="gap-4 border-b border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0))]">
              <Badge className="w-fit rounded-full bg-white/10 text-white">
                <Sparkles className="mr-1 size-3" />
                Latest report
              </Badge>
              <CardTitle className="text-2xl font-semibold tracking-[-0.03em]">
                {featuredReport?.title ?? "No completed reports yet"}
              </CardTitle>
              <CardDescription className="max-w-md text-slate-300">
                {featuredReport?.summary.headline ??
                  "Finish a live interview and queue report generation to populate this space."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
                  Score
                </p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.05em]">
                  {featuredReport?.scorecard.overallScore ?? "--"}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {featuredReport
                    ? `${featuredReport.summary.band} with evidence-linked commentary`
                    : "Stored scorecards appear here after the first completed report."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
                  Regression guardrails
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {REPORT_PROMPT_FIXTURES.length} prompt fixtures and {REPORT_EVAL_CASES.length} eval cases keep the report output stable.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: FileText,
              title: "Evidence first",
              body: "Each scorecard is traceable to persisted transcript turns and stored report rows.",
            },
            {
              icon: GalleryHorizontalEnd,
              title: "Structured rewrites",
              body: "Weak answers are rewritten with the same evidence but sharper ownership.",
            },
            {
              icon: ShieldCheck,
              title: "Regression ready",
              body: "Prompt fixtures and eval cases make AI behavior visible in tests.",
            },
          ].map((item) => (
            <Card key={item.title} className="border-slate-200/60 bg-white/80">
              <CardHeader className="gap-5">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#1638d4]/10 text-[#1638d4]">
                  <item.icon className="size-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription className="text-sm leading-6 text-slate-600">
                  {item.body}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section id="catalog" className="space-y-6">
          <SectionTitle
            eyebrow="Report catalog"
            title="Recent sessions"
            description="The catalog now loads persisted reports for the signed-in user instead of placeholder fixtures."
          />
          {reportOverviews.length > 0 ? (
            <div className="grid gap-4">
              {reportOverviews.map((report, index) => (
                <Card key={report.id} className="border-slate-200/60 bg-white/85">
                  <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
                        Report {index + 1}
                      </CardDescription>
                      <CardTitle className="text-2xl tracking-[-0.03em] text-slate-950">
                        {report.title}
                      </CardTitle>
                      <p className="text-sm text-slate-600">
                        {report.candidate} | {report.targetRole} | {report.sessionDate}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {report.scorecard.overallScore}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        {report.summary.band}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="space-y-3">
                      <p className="text-sm leading-7 text-slate-600">
                        {report.summary.headline}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {report.strengths.slice(0, 2).map((item) => (
                          <Badge key={item} variant="outline" className="rounded-full">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Link
                      href={`/reports/${report.id}`}
                      className={cn(
                        buttonVariants({
                          variant: "outline",
                          className: "rounded-full",
                        }),
                      )}
                    >
                      Open report
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-slate-200/60 bg-white/85">
              <CardContent className="space-y-4 p-6 text-sm leading-7 text-slate-600">
                <p>
                  No reports are stored for this user yet. Complete an interview and queue report generation to populate the catalog.
                </p>
                <Link
                  href="/interview"
                  className={cn(
                    buttonVariants({
                      className: "rounded-full bg-slate-950 text-white hover:bg-slate-800",
                    }),
                  )}
                >
                  Start interview
                </Link>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
