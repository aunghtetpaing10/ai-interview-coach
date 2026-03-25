import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  NotebookTabs,
  Quote,
  Radar,
  Waves,
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
import { landingHighlights, stackHighlights } from "@/lib/fixtures/mock-data";
import { cn } from "@/lib/utils";

const proofPoints = [
  {
    icon: CheckCircle2,
    title: "Grounded interviews",
    body: "Prompts stay attached to role context, resume claims, and targeted pressure-testing.",
  },
  {
    icon: NotebookTabs,
    title: "Revision-first reports",
    body: "The report is an editorial package: scorecard, citations, rewrites, and next drills.",
  },
  {
    icon: Radar,
    title: "Track-level trends",
    body: "Dashboard signals separate momentum from weak tracks instead of averaging everything away.",
  },
  {
    icon: Waves,
    title: "Realtime by default",
    body: "Voice is native to the rehearsal loop, with text fallback when transport is unavailable.",
  },
] as const;

const liveRoomNotes = [
  {
    icon: Waves,
    title: "Live room",
    body: "Voice-led mock interviews stay structured enough for reliable scoring and replay.",
  },
  {
    icon: NotebookTabs,
    title: "Editorial audit",
    body: "Weak answers are rewritten against the same evidence instead of hallucinated summaries.",
  },
  {
    icon: Radar,
    title: "Progress intelligence",
    body: "Track-level trends show whether clarity is compounding or only spiking occasionally.",
  },
] as const;

export default function Home() {
  return (
    <div className="curator-shell relative flex flex-1 flex-col overflow-hidden">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-16 px-6 pb-20 pt-8 lg:px-10 lg:pt-12">
        <section className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <div className="space-y-8">
            <Badge className="bg-[rgba(208,127,79,0.14)] text-[color:var(--curator-navy)]">
              Editorial mock interview intelligence
            </Badge>
            <div className="space-y-6">
              <h1 className="curator-display max-w-4xl text-[clamp(3.8rem,8vw,7rem)] text-[color:var(--curator-ink)]">
                Turn interview practice into measurable mastery.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                The Curator stages live interview rehearsals, cites the exact
                transcript moments that shaped each score, and turns every
                session into a deliberate editorial revision cycle.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    className:
                      "h-12 bg-[color:var(--curator-navy)] px-6 text-[color:var(--primary-foreground)] hover:bg-[color:var(--curator-navy-strong)]",
                  }),
                )}
              >
                Open the dashboard
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
                      "h-12 border-[color:var(--curator-line)] bg-white/70 px-6",
                  }),
                )}
              >
                Review the repo
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {landingHighlights.map((highlight) => (
                <Card
                  key={highlight.label}
                  className="curator-card border-white/60 backdrop-blur"
                >
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {highlight.label}
                    </CardDescription>
                    <CardTitle className="font-serif text-4xl tracking-[-0.05em] text-[color:var(--curator-ink)]">
                      {highlight.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-6 text-muted-foreground">
                    {highlight.description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-5 lg:pt-8">
            <Card className="curator-card-dark overflow-hidden">
              <CardHeader className="gap-5 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className="bg-white/10 text-white"
                  >
                    Session preview
                  </Badge>
                  <span className="font-mono text-xs uppercase tracking-[0.3em] text-slate-300">
                    realtime audit
                  </span>
                </div>
                <CardTitle className="curator-display text-5xl text-white sm:text-6xl">
                  Practice like an editor, not a prompt submitter.
                </CardTitle>
                <CardDescription className="max-w-lg text-base leading-7 text-slate-200">
                  The Curator keeps the interviewer grounded in your resume,
                  surfaces what actually sounded persuasive, and highlights
                  where the argument still collapses under pressure.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-6">
                {liveRoomNotes.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <item.icon className="size-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-sm leading-6 text-slate-300">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
              <Card className="curator-card">
                <CardHeader className="gap-4">
                  <div className="flex items-center gap-2 text-[color:var(--curator-orange)]">
                    <Quote className="size-4" />
                    <CardDescription className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--curator-orange)]">
                      What changes
                    </CardDescription>
                  </div>
                  <CardTitle className="font-serif text-3xl tracking-[-0.05em] text-[color:var(--curator-ink)]">
                    Every score cites a real moment.
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-muted-foreground">
                  Candidates leave with transcript evidence, revised answers,
                  and a next-practice plan rather than a vague model opinion.
                </CardContent>
              </Card>

              <Card className="curator-card">
                <CardHeader className="gap-4">
                  <CardDescription className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Readiness signal
                  </CardDescription>
                  <CardTitle className="font-serif text-5xl tracking-[-0.06em] text-[color:var(--curator-navy)]">
                    82
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-muted-foreground">
                  Interview performance index from the latest full rehearsal,
                  with clarity and system thinking separated instead of flattened.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="proof" className="space-y-8">
          <SectionTitle
            eyebrow="Proof"
            title="A polished coaching surface is only useful if the feedback can be trusted."
            description="The product loop is designed so candidates can inspect the evidence, rehearse the rewrite, and see whether the next session actually improved."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {proofPoints.map((item) => (
              <Card
                key={item.title}
                className="curator-card"
              >
                <CardHeader className="gap-5">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(20,63,134,0.09)] text-[color:var(--curator-navy)]">
                    <item.icon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription className="text-sm leading-6 text-muted-foreground">
                      {item.body}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section
          id="method"
          className="grid gap-8 rounded-[2rem] border border-[color:var(--curator-line)] bg-white/70 p-8 shadow-[var(--curator-shadow)] xl:grid-cols-[0.88fr_1.12fr]"
        >
          <div className="space-y-4">
            <SectionTitle
              eyebrow="Method"
              title="Built for parallel product delivery, not a one-screen concept."
              description="The codebase already separates routing, persisted data, session logic, and reporting so the experience can evolve without losing its operational spine."
            />
          </div>
          <div className="space-y-5">
            {stackHighlights.map((item, index) => (
              <div key={item.title}>
                {index > 0 ? (
                  <Separator className="mb-5 bg-[color:var(--curator-line)]" />
                ) : null}
                <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--curator-orange)]">
                    {item.title}
                  </p>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,#13397d_0%,#0e2d67_60%,#13397d_100%)] px-8 py-10 text-white shadow-[0_32px_120px_-64px_rgba(10,24,54,0.92)] sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-4">
              <Badge className="bg-white/12 text-white">Ready for the full loop</Badge>
              <h2 className="curator-display max-w-3xl text-5xl text-white sm:text-6xl">
                Ready to master your next executive-style interview loop?
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-200">
                Enter the workspace, finish onboarding, and let the live room,
                report audit, and dashboard trendline start speaking to each other.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    className:
                      "h-12 bg-white px-6 text-[color:var(--curator-navy)] hover:bg-slate-100",
                  }),
                )}
              >
                Enter workspace
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className:
                      "h-12 border-white/20 bg-white/8 px-6 text-white hover:bg-white/12",
                  }),
                )}
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-[color:var(--curator-line)] py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-2xl text-[color:var(--curator-ink)]">The Curator</p>
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--curator-orange)]">
              Editorial interview intelligence
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link className="curator-link" href="/sign-in">
              Sign in
            </Link>
            <Link className="curator-link" href="/dashboard">
              Dashboard
            </Link>
            <a
              className="curator-link"
              href="https://github.com/aunghtetpaing10/ai-interview-coach"
              rel="noreferrer"
              target="_blank"
            >
              Repository
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
