import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CitationBlock } from "@/lib/reporting/types";

type ReportCitationListProps = {
  citations: CitationBlock[];
};

export function ReportCitationList({ citations }: ReportCitationListProps) {
  return (
    <div className="grid gap-4">
      {citations.map((citation) => (
        <Card key={citation.id} className="border-slate-200/60 bg-white/85">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardDescription className="uppercase tracking-[0.22em] text-slate-500">
                {citation.timestamp}
              </CardDescription>
              <Badge
                variant={citation.emphasis === "gap" ? "destructive" : "secondary"}
                className="rounded-full"
              >
                {citation.label}
              </Badge>
            </div>
            <CardTitle className="text-lg tracking-[-0.02em] text-slate-950">
              {citation.quote}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-slate-600">
            {citation.insight}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
