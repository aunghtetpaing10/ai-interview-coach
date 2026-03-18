import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RealtimeSessionSnapshot } from "@/lib/interview-session/types";

type RealtimePanelProps = {
  snapshot: RealtimeSessionSnapshot;
  connectionMessage: string;
};

export function RealtimePanel({
  snapshot,
  connectionMessage,
}: RealtimePanelProps) {
  return (
    <Card className="border-slate-200/70 bg-white/80 shadow-[0_24px_90px_-50px_rgba(15,23,42,0.45)]">
      <CardHeader className="space-y-3">
        <Badge className="w-fit rounded-full bg-[#1638d4] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white">
          Realtime integration
        </Badge>
        <CardTitle className="text-xl tracking-[-0.03em]">
          Session transport snapshot
        </CardTitle>
        <p className="text-sm leading-6 text-slate-600">
          The UI is wired to a safe adapter shape. When no OpenAI key is
          available, the session falls back to deterministic browser behavior so
          the app stays demoable.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Provider
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {snapshot.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {snapshot.transportHint}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Fallback
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {snapshot.fallbackReason}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {connectionMessage}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Instruction preview
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {snapshot.instructionPreview}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
