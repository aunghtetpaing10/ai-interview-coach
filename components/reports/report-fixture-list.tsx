import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ReportEvalCase, ReportPromptFixture } from "@/lib/reporting/types";

type ReportFixtureListProps = {
  promptFixtures: readonly ReportPromptFixture[];
  evalCases: readonly ReportEvalCase[];
};

export function ReportFixtureList({
  promptFixtures,
  evalCases,
}: ReportFixtureListProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-slate-200/60 bg-white/85">
        <CardHeader className="gap-3">
          <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
            Prompt fixtures
          </CardDescription>
          <CardTitle className="text-2xl tracking-[-0.03em] text-slate-950">
            Regression-ready prompt shapes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {promptFixtures.map((fixture) => (
            <div key={fixture.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-slate-950">{fixture.title}</p>
                <Badge variant="outline" className="rounded-full">
                  {fixture.version}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {fixture.objective}
              </p>
              <Separator className="my-4 bg-slate-200" />
              <ul className="space-y-2 text-sm leading-6 text-slate-600">
                {fixture.guardrails.map((guardrail) => (
                  <li key={guardrail}>{guardrail}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 bg-white/85">
        <CardHeader className="gap-3">
          <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
            Eval cases
          </CardDescription>
          <CardTitle className="text-2xl tracking-[-0.03em] text-slate-950">
            What should stay stable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {evalCases.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-slate-950">{item.label}</p>
                <Badge variant="secondary" className="rounded-full">
                  {item.category}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.input}
              </p>
              <Separator className="my-4 bg-slate-200" />
              <ul className="space-y-2 text-sm leading-6 text-slate-600">
                {item.expected.map((expected) => (
                  <li key={expected}>{expected}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
