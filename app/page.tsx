import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Mic,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { SectionTitle } from "@/components/section-title";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { landingHighlights, stackHighlights } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(39,94,254,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(236,120,67,0.22),_transparent_28%),linear-gradient(180deg,_#f7f7f2_0%,_#f0ede4_45%,_#f7f4ed_100%)]" />
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-20 px-6 pb-20 pt-8 lg:px-10">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-8">
            <Badge className="rounded-full bg-[#1638d4] px-4 py-1.5 text-xs font-semibold tracking-[0.24em] uppercase text-white">
              Production-style AI product
            </Badge>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">
                Train for real software interviews with a coach that cites your
                own resume back at you.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">
                AI Interview Coach combines live voice mock interviews, grounded
                follow-up questions, and evidence-linked scoring so candidates
                can see exactly what improved and what still sounds weak.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    className:
                      "h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800",
                  }),
                )}
              >
                Explore the dashboard
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="https://github.com/aunghtetpaing10/ai-interview-coach"
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className:
                      "h-12 rounded-full border-slate-300 bg-white/70 px-6",
                  }),
                )}
              >
                View repository
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {landingHighlights.map((highlight) => (
                <Card
                  key={highlight.label}
                  className="border-white/60 bg-white/70 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur"
                >
                  <CardHeader className="pb-3">
                    <CardDescription>{highlight.label}</CardDescription>
                    <CardTitle className="text-3xl font-semibold">
                      {highlight.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-6 text-slate-600">
                    {highlight.description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden border-slate-200/70 bg-slate-950 text-white shadow-[0_30px_100px_-35px_rgba(15,23,42,0.85)]">
            <CardHeader className="gap-5 border-b border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0))]">
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="rounded-full bg-white/10 text-white"
                >
                  Session preview
                </Badge>
                <span className="font-mono text-xs uppercase tracking-[0.3em] text-slate-300">
                  gpt-realtime
                </span>
              </div>
              <CardTitle className="text-2xl font-semibold tracking-[-0.03em]">
                &quot;Tell me about the payment system you scaled.&quot;
              </CardTitle>
              <CardDescription className="max-w-md text-slate-300">
                Follow-ups adapt to the claims in the candidate’s resume, then
                the session is scored against a reusable rubric instead of
                free-form vibes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 p-6">
              {[
                {
                  icon: Mic,
                  title: "Live voice with text fallback",
                  body: "Candidates can respond naturally, while the app keeps the transcript structured for scoring.",
                },
                {
                  icon: TimerReset,
                  title: "Evidence-linked scoring",
                  body: "Each rubric score is paired with transcript moments so the coaching remains auditable.",
                },
                {
                  icon: BrainCircuit,
                  title: "Grounded follow-ups",
                  body: "The interviewer probes vague claims, missing ownership signals, and shallow architecture explanations.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                    <item.icon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm leading-6 text-slate-300">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-8">
          <SectionTitle
            eyebrow="Why this stands out"
            title="Built to look like a serious AI product, not a prompt wrapper."
            description="The architecture, evals, and user-facing artifacts are designed to be legible to employers who care about engineering quality."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: Sparkles,
                title: "Retrieval-backed interviews",
                body: "Questioning and report generation are grounded in the resume, target role, and rubric bank.",
              },
              {
                icon: ShieldCheck,
                title: "Production controls",
                body: "Rate limits, analytics, error monitoring, and typed environment validation are part of the baseline.",
              },
              {
                icon: BrainCircuit,
                title: "Async eval pipeline",
                body: "Scoring and practice-plan generation are designed as background workflows, not request-thread hacks.",
              },
              {
                icon: TimerReset,
                title: "TDD-first workflow",
                body: "Unit, e2e, and prompt fixture coverage are part of the repo from the first commit.",
              },
            ].map((item) => (
              <Card
                key={item.title}
                className="border-slate-200/60 bg-white/75"
              >
                <CardHeader className="gap-5">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#1638d4]/10 text-[#1638d4]">
                    <item.icon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription className="text-sm leading-6 text-slate-600">
                      {item.body}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-8 rounded-[2rem] border border-white/60 bg-white/75 p-8 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.4)] xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <SectionTitle
              eyebrow="Stack"
              title="Chosen for a real deployment path."
              description="The project is organized so feature branches can land independently without turning the base app into a dead-end prototype."
            />
          </div>
          <div className="space-y-5">
            {stackHighlights.map((item, index) => (
              <div key={item.title}>
                {index > 0 ? (
                  <Separator className="mb-5 bg-slate-200" />
                ) : null}
                <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                  <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-500">
                    {item.title}
                  </p>
                  <p className="text-sm leading-7 text-slate-700">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
