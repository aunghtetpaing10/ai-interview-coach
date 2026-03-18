import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProgressSession } from "@/lib/analytics/progress";

type SessionFeedProps = {
  sessions: ProgressSession[];
};

function trackTone(track: ProgressSession["track"]) {
  switch (track) {
    case "behavioral":
      return "bg-sky-100 text-sky-800";
    case "resume":
      return "bg-emerald-100 text-emerald-800";
    case "project":
      return "bg-amber-100 text-amber-800";
    case "system-design":
      return "bg-violet-100 text-violet-800";
  }
}

export function SessionFeed({ sessions }: SessionFeedProps) {
  return (
    <Card className="border-slate-200/70 bg-white/90">
      <CardHeader className="space-y-3">
        <CardDescription className="font-mono text-xs uppercase tracking-[0.3em] text-slate-500">
          Session log
        </CardDescription>
        <CardTitle className="text-2xl">Recent interview sessions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {sessions.slice().reverse().map((session) => (
          <article
            key={session.id}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-500">{session.completedAt.slice(0, 10)}</p>
                <h3 className="text-lg font-semibold text-slate-950">{session.focus}</h3>
              </div>
              <Badge className={trackTone(session.track)}>{session.track}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>{session.durationMinutes} min</span>
              <span>{session.followUps} follow-ups</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{session.note}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Score
              </p>
              <p className="text-2xl font-semibold text-slate-950">{session.score}%</p>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
