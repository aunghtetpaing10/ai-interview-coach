import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { InterviewReport } from "@/lib/reporting/types";

type ReportScoreGridProps = {
  report: InterviewReport;
};

export function ReportScoreGrid({ report }: ReportScoreGridProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {report.scorecard.dimensions.map((dimension) => (
        <Card key={dimension.key} className="border-slate-200/60 bg-white/85">
          <CardHeader className="pb-3">
            <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
              {dimension.label}
            </CardDescription>
            <CardTitle className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">
              {dimension.score}%
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={dimension.score} className="h-2.5" />
            <p className="text-sm leading-6 text-slate-600">
              {report.summary.strengths.some((item) =>
                item.toLowerCase().includes(dimension.label.toLowerCase()),
              )
                ? "This is one of the stronger signals in the report."
                : report.summary.growthAreas.some((item) =>
                      item.toLowerCase().includes(dimension.label.toLowerCase()),
                    )
                  ? "This is one of the weaker signals and should be the first repair target."
                  : dimension.evidenceSummary}
            </p>
          </CardContent>
        </Card>
      ))}

      <Card className="border-slate-200/60 bg-white/85 md:col-span-2 xl:col-span-4">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <CardDescription>Strengths</CardDescription>
            <CardTitle className="text-2xl tracking-[-0.03em] text-slate-950">
              What the candidate is already doing well
            </CardTitle>
          </div>
          <Badge variant="secondary" className="rounded-full">
            {report.summary.band}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {report.summary.strengths.map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
