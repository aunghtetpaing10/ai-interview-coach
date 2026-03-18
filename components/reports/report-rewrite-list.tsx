import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnswerRewrite } from "@/lib/reporting/types";

type ReportRewriteListProps = {
  rewrites: AnswerRewrite[];
};

export function ReportRewriteList({ rewrites }: ReportRewriteListProps) {
  return (
    <div className="grid gap-4">
      {rewrites.map((rewrite, index) => (
        <Card key={rewrite.id} className="border-slate-200/60 bg-white/85">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
                Rewrite {index + 1}
              </CardDescription>
              <Badge variant="outline" className="rounded-full">
                {rewrite.prompt}
              </Badge>
            </div>
            <CardTitle className="text-xl tracking-[-0.03em] text-slate-950">
              Stronger answer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
            <p>{rewrite.stronger}</p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">Why this works</p>
              <p className="mt-2">{rewrite.whyItWorks}</p>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">
              Evidence: {rewrite.evidence}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
