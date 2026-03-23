import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingFlow } from "@/components/intake/onboarding-flow";
import { createInitialOnboardingState } from "@/lib/intake/state";
import { loadWorkspaceOnboardingDraftForUser } from "@/lib/workspace/runtime";

export const metadata = {
  title: "Onboarding",
  description:
    "Set up your target role, resume shell, and job description for grounded Curator interview coaching.",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireWorkspaceUser("/onboarding");
  const draft = await loadWorkspaceOnboardingDraftForUser(user.id);
  const initialState = createInitialOnboardingState(draft);

  return (
    <main className="curator-shell min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-6 lg:px-10 lg:py-8">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--curator-navy)] transition-colors hover:text-[color:var(--curator-navy-strong)]"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <Badge variant="secondary" className="rounded-full">
            Intake flow
          </Badge>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <Card className="curator-card">
            <CardContent className="flex h-full flex-col justify-between gap-8 p-6 md:p-8">
              <div className="space-y-6">
                <Badge className="w-fit rounded-full bg-[color:var(--curator-navy)] text-white">
                  Profile setup
                </Badge>
                <div className="space-y-4">
                  <p className="curator-kicker">Onboarding</p>
                  <h1 className="curator-display max-w-3xl text-5xl font-semibold text-[color:var(--curator-ink)] sm:text-6xl">
                    Give the coach enough signal to sound editorial, specific, and grounded.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-700">
                    A role title, resume shell, and job description are enough
                    for The Curator to shape follow-ups, scorecards, and a first
                    practice plan that feels tied to your actual background.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Draft scope", value: "Role, resume, JD" },
                  { label: "Persistence", value: user.email ?? "Current user" },
                  { label: "Output", value: "Grounded coaching" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.4rem] border border-[color:var(--curator-line)] bg-white/70 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--curator-ink)]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="curator-card-dark">
            <CardContent className="flex h-full flex-col justify-between gap-6 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <Sparkles className="size-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">
                    Authenticated persistence
                  </p>
                  <p className="text-sm leading-6 text-white/80">
                    Saved values are scoped to {user.email ?? "the current user"} and
                    rehydrate from persisted rows on reload.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  What happens next
                </p>
                <p className="text-sm leading-6 text-white/80">
                  The flow validates the draft locally, persists the saved
                  values, and reuses them to seed dashboard, interview, and
                  reporting views.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <OnboardingFlow initialState={initialState} />
      </div>
    </main>
  );
}
