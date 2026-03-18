import { InterviewWorkspace } from "@/components/interview/interview-workspace";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INTERVIEW_ROUTE_COPY, createDemoInterviewSession } from "@/lib/interview-session/fixtures";

export default function InterviewPage() {
  const session = createDemoInterviewSession();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-10 lg:px-10">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div className="space-y-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-[#1638d4]">
            {INTERVIEW_ROUTE_COPY.eyebrow}
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl">
            {INTERVIEW_ROUTE_COPY.title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            {INTERVIEW_ROUTE_COPY.description}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Timer",
              description: "Reducer-driven and easy to test.",
            },
            {
              title: "Transcript",
              description: "Speaker turns and follow-ups are deterministic.",
            },
            {
              title: "Transport",
              description: session.realtime.label,
            },
          ].map((item) => (
            <Card key={item.title} className="border-slate-200/70 bg-white/80">
              <CardHeader className="pb-3">
                <CardDescription>{item.title}</CardDescription>
                <CardTitle className="text-lg">{item.description}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <InterviewWorkspace initialSession={session} />
    </main>
  );
}
