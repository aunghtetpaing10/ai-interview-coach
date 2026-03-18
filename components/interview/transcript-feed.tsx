import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { InterviewTranscriptTurn } from "@/lib/interview-session/types";

type TranscriptFeedProps = {
  transcript: InterviewTranscriptTurn[];
  currentPrompt: string;
};

const speakerStyles: Record<InterviewTranscriptTurn["speaker"], string> = {
  system: "bg-slate-200 text-slate-700",
  interviewer: "bg-amber-100 text-amber-900",
  candidate: "bg-emerald-100 text-emerald-900",
};

export function TranscriptFeed({
  transcript,
  currentPrompt,
}: TranscriptFeedProps) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="space-y-3 border-b border-white/10">
        <Badge className="w-fit rounded-full bg-white/10 text-white">
          Transcript timeline
        </Badge>
        <CardTitle className="text-xl tracking-[-0.03em]">
          Session conversation
        </CardTitle>
        <p className="text-sm leading-6 text-slate-300">
          This timeline captures the live transcript, the latest interviewer
          prompt, and the fallback text flow used when realtime transport is not
          available.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Current prompt
          </p>
          <p className="mt-2 text-sm leading-6 text-white">{currentPrompt}</p>
        </div>
        <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {transcript.map((turn) => (
            <article
              key={turn.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <Badge
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.22em]",
                    speakerStyles[turn.speaker],
                  )}
                >
                  {turn.speaker}
                </Badge>
                <span className="font-mono text-xs text-slate-400">
                  +{String(turn.elapsedSeconds).padStart(2, "0")}s
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-100">{turn.text}</p>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
