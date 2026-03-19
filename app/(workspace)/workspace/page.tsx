import Link from "next/link";
import { ArrowRight, Clock3, LayoutDashboard, Sparkles, Target, Workflow } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { createPostgresInterviewRepository } from "@/lib/data/database-repository";
import { getWorkspaceMetricCopy } from "@/lib/data/workspace";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default async function WorkspacePage() {
  const user = await requireWorkspaceUser("/workspace");
  const repository = createPostgresInterviewRepository();
  const snapshot = await repository.getWorkspaceSnapshot(user.id);
  const metrics = getWorkspaceMetricCopy(snapshot);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200/60 bg-white/85">
          <CardHeader className="space-y-4">
            <Badge className="w-fit rounded-full bg-[#1638d4] text-white">
              Authenticated shell
            </Badge>
            <CardTitle className="text-4xl tracking-[-0.05em]">
              Welcome back, {snapshot.profile?.fullName ?? user.email ?? "candidate"}.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 text-slate-600">
              This workspace now loads your saved role context, question bank, interview history, and resume metadata from persisted data instead of seed fixtures.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {metric.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 bg-white/85">
          <CardHeader>
            <CardDescription>Workspace status</CardDescription>
            <CardTitle className="text-2xl">Product loop foundation is live</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-slate-600">
            <div className="flex items-start gap-3">
              <LayoutDashboard className="mt-0.5 size-4 text-[#1638d4]" />
              <p>Workspace access is bound to the authenticated Supabase user.</p>
            </div>
            <div className="flex items-start gap-3">
              <Target className="mt-0.5 size-4 text-[#1638d4]" />
              <p>Reference data still seeds prompts and rubric dimensions through the database.</p>
            </div>
            <div className="flex items-start gap-3">
              <Workflow className="mt-0.5 size-4 text-[#1638d4]" />
              <p>Repository helpers now read real user-owned rows instead of hard-coded fixtures.</p>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 text-[#1638d4]" />
              <p>The next steps are onboarding persistence, sessions, reports, and voice runtime.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200/60 bg-white/85">
          <CardHeader>
            <CardDescription>Current mode</CardDescription>
            <CardTitle className="text-2xl capitalize">{snapshot.activeMode.replace("-", " ")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Clock3 className="size-4 text-[#1638d4]" />
              <p className="text-sm text-slate-600">
                Recent sessions are stored as typed rows and drive this workspace snapshot directly.
              </p>
            </div>
            {snapshot.jobTarget ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Active job target</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {snapshot.jobTarget.companyName} | {snapshot.jobTarget.jobTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-3">
                  {snapshot.jobTarget.jobDescription}
                </p>
              </div>
            ) : null}
            {snapshot.resumeAsset ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Latest resume asset</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {snapshot.resumeAsset.fileName}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {snapshot.resumeAsset.summary}
                </p>
              </div>
            ) : (
              <Link
                href="/onboarding"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    className: "w-full rounded-full",
                  }),
                )}
              >
                Finish onboarding
                <ArrowRight className="size-4" />
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 bg-white/85">
          <CardHeader>
            <CardDescription>Question preview</CardDescription>
            <CardTitle className="text-2xl">Reference prompts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.questionPreview.map((question, index) => (
              <div key={question.id}>
                {index > 0 ? <Separator className="mb-4 bg-slate-200" /> : null}
                <div className="space-y-2">
                  <p className="text-xs font-mono uppercase tracking-[0.24em] text-slate-500">
                    {question.mode}
                  </p>
                  <p className="text-sm leading-6 text-slate-700">{question.prompt}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
