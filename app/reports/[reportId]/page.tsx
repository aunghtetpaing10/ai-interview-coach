import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, FileText, LayoutPanelTop, Sparkles } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { ReportHero } from "@/components/reports/report-hero";
import { ReportScoreGrid } from "@/components/reports/report-score-grid";
import { ReportTabs } from "@/components/reports/report-tabs";
import { CandidateShell } from "@/components/workspace/candidate-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { REPORT_EVAL_CASES, REPORT_PROMPT_FIXTURES } from "@/lib/evals/fixtures";
import { createReportService } from "@/lib/report-service/report-service";
import { createWorkspaceReportStore } from "@/lib/workspace/runtime";

export default async function Page({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const user = await requireWorkspaceUser("/reports");
  const { reportId } = await params;
  const reportService = createReportService(await createWorkspaceReportStore());
  const [report, reportOverviews] = await Promise.all([
    reportService.getReportById(user.id, reportId),
    reportService.listReportOverviews(user.id),
  ]);

  if (!report) {
    notFound();
  }

  return (
    <CandidateShell
      activeHref="/reports"
      userLabel={report.candidate || user.email || "Candidate"}
      headline={report.summary.headline}
      railNote={`${reportOverviews.length} stored reports remain directly addressable from the same archive.`}
    >
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
            label: "Track artifacts",
            value: `${report.artifactSections.length}`,
          },
          {
            icon: CalendarDays,
            label: "Replay actions",
            value: `${report.replayActions.length}`,
          },
        ].map((item) => (
          <Card key={item.label} className="curator-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
                  {item.label}
                </CardDescription>
                <div className="rounded-2xl bg-[rgba(20,63,134,0.09)] p-2 text-[color:var(--curator-navy)]">
                  <item.icon className="size-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--curator-ink)]">
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

        <Card className="curator-card h-fit">
          <CardHeader className="gap-3">
            <CardDescription className="curator-kicker">
              Report archive
            </CardDescription>
            <CardTitle className="text-2xl tracking-[-0.03em] text-[color:var(--curator-ink)]">
              Session metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.4rem] border border-[color:var(--curator-line)] bg-white/80 p-4">
              <p className="text-sm font-medium text-[color:var(--curator-ink)]">
                Prompt version
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {report.promptVersion}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-[color:var(--curator-line)] bg-white/80 p-4">
              <p className="text-sm font-medium text-[color:var(--curator-ink)]">
                Question family
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {report.questionFamily ?? "Not set"}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-[color:var(--curator-line)] bg-white/80 p-4">
              <p className="text-sm font-medium text-[color:var(--curator-ink)]">
                Archived reports
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {reportOverviews.length} tracked reports for this user.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                More reports
              </p>
              <div className="grid gap-2">
                {reportOverviews.slice(0, 3).map((overview) => (
                  <Link
                    key={overview.id}
                    href={`/reports/${overview.id}`}
                    className="rounded-[1.2rem] border border-[color:var(--curator-line)] bg-white/75 px-4 py-3 text-sm leading-6 text-slate-700 transition hover:bg-white"
                  >
                    <span className="block font-medium text-[color:var(--curator-ink)]">
                      {overview.title}
                    </span>
                    <span className="block text-slate-500">
                      {overview.sessionDate} | {overview.summary.band}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full">
              Deep links remain stable
            </Badge>
          </CardContent>
        </Card>
      </section>
    </CandidateShell>
  );
}
