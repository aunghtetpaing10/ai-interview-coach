"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportCitationList } from "@/components/reports/report-citation-list";
import { ReportFixtureList } from "@/components/reports/report-fixture-list";
import { ReportPracticePlan } from "@/components/reports/report-practice-plan";
import { ReportRewriteList } from "@/components/reports/report-rewrite-list";
import type {
  ReportEvalCase,
  ReportPromptFixture,
  InterviewReport,
} from "@/lib/reporting/types";

type ReportTabsProps = {
  report: InterviewReport;
  promptFixtures: readonly ReportPromptFixture[];
  evalCases: readonly ReportEvalCase[];
};

export function ReportTabs({
  report,
  promptFixtures,
  evalCases,
}: ReportTabsProps) {
  return (
    <Tabs defaultValue="summary" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="citations">Citations</TabsTrigger>
        <TabsTrigger value="rewrites">Rewrites</TabsTrigger>
        <TabsTrigger value="practice">Practice</TabsTrigger>
        <TabsTrigger value="evals">Evals</TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="space-y-4">
        <Card className="border-slate-200/60 bg-white/85">
          <CardHeader className="gap-3">
            <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
              Summary
            </CardDescription>
            <CardTitle className="text-2xl tracking-[-0.03em] text-slate-950">
              {report.summary.headline}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Growth areas
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.growthAreas.map((item) => (
                  <Badge key={item} variant="outline" className="rounded-full">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                What changed
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The report uses the same transcript evidence to drive the scorecard, citation blocks, answer rewrites, and practice plan. That keeps the feedback legible to the candidate and testable in regression fixtures.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {report.artifactSections.map((section) => (
            <Card key={section.id} className="border-slate-200/60 bg-white/85">
              <CardHeader className="gap-2">
                <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
                  {section.title}
                </CardDescription>
                <CardTitle className="text-xl tracking-[-0.03em] text-slate-950">
                  {section.description}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.items.map((item) => (
                  <div key={`${section.id}-${item.title}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-slate-200/60 bg-white/85">
          <CardHeader className="gap-2">
            <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
              Replay loop
            </CardDescription>
            <CardTitle className="text-xl tracking-[-0.03em] text-slate-950">
              Run the next rep immediately
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {report.replayActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white"
              >
                <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="citations">
        <ReportCitationList citations={report.citations} />
      </TabsContent>

      <TabsContent value="rewrites">
        <ReportRewriteList rewrites={report.rewrites} />
      </TabsContent>

      <TabsContent value="practice">
        <ReportPracticePlan practicePlan={report.practicePlan} />
      </TabsContent>

      <TabsContent value="evals">
        <ReportFixtureList promptFixtures={promptFixtures} evalCases={evalCases} />
      </TabsContent>
    </Tabs>
  );
}
