"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { OnboardingSubmissionState } from "@/lib/intake/types";
import { cn } from "@/lib/utils";

type SummaryPanelProps = {
  state: OnboardingSubmissionState;
  pending: boolean;
};

const trackTone: Record<string, string> = {
  behavioral: "bg-[rgba(20,63,134,0.12)] text-[color:var(--curator-navy)]",
  resume: "bg-[rgba(25,135,84,0.12)] text-emerald-800",
  project: "bg-[rgba(208,127,79,0.14)] text-[color:var(--curator-navy)]",
  "system-design": "bg-[rgba(31,42,68,0.08)] text-[color:var(--curator-ink)]",
};

export function SummaryPanel({ state, pending }: SummaryPanelProps) {
  const { summary } = state;

  return (
    <Card className="sticky top-6 overflow-hidden curator-card-dark">
      <CardHeader className="gap-4 border-b border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0))]">
        <div className="flex items-center justify-between gap-3">
          <Badge className="rounded-full bg-white/10 text-white">
            {pending ? "Saving draft..." : state.status === "success" ? "Draft saved" : "Live summary"}
          </Badge>
          <span className="font-mono text-xs uppercase tracking-[0.28em] text-slate-300">
            onboarding
          </span>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-[-0.03em]">
          {summary.readinessLabel}
        </CardTitle>
        <CardDescription className="max-w-md text-slate-300">
          {summary.coachingHeadline}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Draft completeness</span>
            <span className="font-mono">{summary.completion}%</span>
          </div>
          <Progress value={summary.completion} className="h-2.5 bg-white/10" />
        </div>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Recommended rounds
          </p>
          <div className="flex flex-wrap gap-2">
            {summary.recommendedTracks.map((track) => (
              <Badge
                key={track}
                className={cn(
                  "rounded-full",
                  trackTone[track] ?? "bg-white/10 text-white",
                )}
              >
                {track.replace("-", " ")}
              </Badge>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Resume shell
          </p>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{summary.resumePreview.fileName}</p>
              <Badge variant="secondary" className="rounded-full bg-white/10 text-white">
                {summary.resumePreview.sizeLabel}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {summary.resumePreview.summary}
            </p>
          </div>
        </section>

        <Separator className="bg-white/10" />

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Next steps
          </p>
          <ol className="space-y-3">
            {summary.nextSteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-slate-300">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {summary.missingPieces.length > 0 ? (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Still missing
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.missingPieces.map((piece) => (
                <Badge
                  key={piece}
                  variant="outline"
                  className="rounded-full border-white/15 bg-white/5 text-slate-200"
                >
                  {piece}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
