import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReportOverview } from "@/lib/reporting/types";

type ReportHeroProps = {
  report: ReportOverview;
};

export function ReportHero({ report }: ReportHeroProps) {
  return (
    <Card className="curator-card-dark overflow-hidden">
      <CardHeader className="gap-5 border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge className="rounded-full bg-white/10 text-white">
            <Sparkles className="mr-1 size-3" />
            Latest report detail
          </Badge>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-slate-300">
            Prompt {report.promptVersion}
          </span>
        </div>
        <CardTitle className="curator-display max-w-4xl text-5xl text-white sm:text-6xl">
          {report.title}
        </CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7 text-slate-300">
          {report.summary.headline}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
              {report.candidate} | {report.targetRole}
            </p>
            <p className="text-sm leading-7 text-slate-300">
              Session date {report.sessionDate}. The same evidence drives the
              scorecard, citation blocks, rewrites, and practice plan.
            </p>
          </div>
          <Link
            href="/reports"
            className={cn(
              buttonVariants({
                variant: "outline",
                className:
                  "rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10",
              }),
            )}
          >
            <ArrowLeft className="size-4" />
            Back to reports home
          </Link>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 px-6 py-5 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.7)]">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
            Overall score
          </p>
          <p className="mt-2 text-6xl font-semibold tracking-[-0.06em] text-white">
            {report.scorecard.overallScore}
          </p>
          <p className="mt-2 text-sm font-medium text-amber-200">
            {report.summary.band === "ready"
              ? "Interview ready"
              : report.summary.band === "strong"
                ? "Strong and trending up"
                : report.summary.band === "steady"
                  ? "Solid foundation"
                  : "Needs targeted repair"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
