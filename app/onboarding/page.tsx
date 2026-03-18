import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionTitle } from "@/components/section-title";
import { OnboardingFlow } from "@/components/intake/onboarding-flow";

export const metadata = {
  title: "Onboarding",
  description:
    "Set up your target role, resume shell, and job description for grounded AI interview coaching.",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(22,56,212,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(236,120,67,0.12),_transparent_24%),linear-gradient(180deg,_#f7f7f2_0%,_#f0ede4_60%,_#f7f4ed_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            Back to home
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
                  <p className="font-medium">Mock-safe by design</p>
                  <p className="text-sm text-slate-300">
                    No external credentials or storage are required for this slice.
                  </p>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-300">
                The flow validates input locally, then uses a server action to
                return a structured summary that the candidate can review before
                starting practice.
              </p>
            </CardContent>
          </Card>
        </section>

        <OnboardingFlow />
      </div>
    </main>
  );
}
