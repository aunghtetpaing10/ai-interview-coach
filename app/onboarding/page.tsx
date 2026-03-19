import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionTitle } from "@/components/section-title";
import { OnboardingFlow } from "@/components/intake/onboarding-flow";
import { createInitialOnboardingState } from "@/lib/intake/state";
import { loadOnboardingDraftForUser } from "@/lib/intake/persistence";

export const metadata = {
  title: "Onboarding",
  description:
    "Set up your target role, resume shell, and job description for grounded AI interview coaching.",
};

export default async function OnboardingPage() {
  const user = await requireWorkspaceUser("/onboarding");
  const draft = await loadOnboardingDraftForUser(user.id);
  const initialState = createInitialOnboardingState(draft);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(22,56,212,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(236,120,67,0.12),_transparent_24%),linear-gradient(180deg,_#f7f7f2_0%,_#f0ede4_60%,_#f7f4ed_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
        <div className="flex items-center justify-between">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            Back to workspace
          </Link>
          <Badge className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
            Intake flow
          </Badge>
        </div>

        <section className="grid gap-6 rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.35)] lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-6">
            <Badge className="rounded-full bg-[#1638d4] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-white">
              Profile setup
            </Badge>
            <SectionTitle
              eyebrow="Onboarding"
              title="Give the coach enough signal to act like it knows the role."
              description="A target role, a resume shell, and a job description are enough to produce grounded follow-ups and a useful practice plan."
            />
          </div>
          <Card className="border-slate-200/60 bg-slate-950 text-white">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="font-medium">Authenticated persistence</p>
                  <p className="text-sm text-slate-300">
                    Saved values are scoped to {user.email ?? "the current user"}.
                  </p>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-300">
                The flow validates input, persists it to the product data model,
                and rehydrates the form from saved user-owned rows on reload.
              </p>
            </CardContent>
          </Card>
        </section>

        <OnboardingFlow initialDraft={draft} initialState={initialState} />
      </div>
    </main>
  );
}
