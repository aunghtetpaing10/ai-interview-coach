import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PracticePlan } from "@/lib/reporting/types";

type ReportPracticePlanProps = {
  practicePlan: PracticePlan;
};

export function ReportPracticePlan({ practicePlan }: ReportPracticePlanProps) {
  return (
    <Card className="border-slate-200/60 bg-white/85">
      <CardHeader className="gap-3">
        <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
          Practice plan
        </CardDescription>
        <CardTitle className="text-2xl tracking-[-0.03em] text-slate-950">
          {practicePlan.title}
        </CardTitle>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {practicePlan.focus}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {practicePlan.steps.map((step) => (
          <div key={step.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-medium text-slate-950">{step.title}</p>
              <Badge variant="secondary" className="rounded-full">
                {step.minutes} min
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.drill}</p>
            <p className="mt-3 text-sm font-medium text-slate-700">{step.outcome}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
