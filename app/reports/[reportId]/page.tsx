import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText, LayoutPanelTop, Sparkles } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { SiteHeader } from "@/components/site-header";
import { ReportHero } from "@/components/reports/report-hero";
import { ReportScoreGrid } from "@/components/reports/report-score-grid";
import { ReportTabs } from "@/components/reports/report-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { REPORT_EVAL_CASES, REPORT_PROMPT_FIXTURES } from "@/lib/evals/fixtures";
import { createPostgresReportStore } from "@/lib/report-service/database-store";
import { createReportService } from "@/lib/report-service/report-service";
import { cn } from "@/lib/utils";

export default async function Page({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const user = await requireWorkspaceUser("/reports");
  const { reportId } = await params;
  const reportService = createReportService(createPostgresReportStore());
  const [report, reportOverviews] = await Promise.all([
    reportService.getReportById(user.id, reportId),
    reportService.listReportOverviews(user.id),
  ]);

  if (!report) {
    notFound();
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(39,94,254,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(244,151,70,0.16),_transparent_28%),linear-gradient(180deg,_#f8f7f2_0%,_#f1ede3_44%,_#f8f4ec_100%)]" />
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10 lg:px-10">
        <ReportHero report={report} />

        <section className="grid gap-4 md:grid-cols-4">
          {[
            {
              icon: FileText,
              label: "Transcript turns",
              value: `${report.transcript.length}`,
            },
            {
              icon: LayoutPanelTop,
              label: "Citation blocks",
              value: `${report.citations.length}`,
            },
            {
              icon: Sparkles,
              label: "Answer rewrites",
              value: `${report.rewrites.length}`,
            },
            {
              icon: CalendarDays,
              label: "Practice steps",
              value: `${report.practicePlan.steps.length}`,
            },
          ].map((item) => (
            <Card key={item.label} className="border-slate-200/60 bg-white/85">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
                    {item.label}
                  </CardDescription>
                  <div className="rounded-2xl bg-[#1638d4]/10 p-2 text-[#1638d4]">
                    <item.icon className="size-4" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-semibold tracking-[-0.03em]">
                  {item.value}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>

        <ReportScoreGrid report={report} />

        <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <ReportTabs
            report={report}
            promptFixtures={REPORT_PROMPT_FIXTURES}
            evalCases={REPORT_EVAL_CASES}
          />

          <Card className="h-fit border-slate-200/60 bg-white/85">
            <CardHeader className="gap-3">
              <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
                Session metadata
              </CardDescription>
              <CardTitle className="text-2xl tracking-[-0.03em] text-slate-950">
                Report index
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">Prompt version</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {report.promptVersion}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">Catalog count</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {reportOverviews.length} tracked reports for this user.
                </p>
              </div>
              <Link
                href="/reports"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    className: "w-full rounded-full",
                  }),
                )}
              >
                <ArrowLeft className="size-4" />
                Back to report catalog
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
