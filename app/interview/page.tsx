import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { getInterviewModePreset } from "@/lib/interview-session/catalog";
import { INTERVIEW_ROUTE_COPY } from "@/lib/interview-session/fixtures";
import { buildInterviewSessionStateFromView } from "@/lib/interview-session/persisted";
import { createRealtimeSessionSnapshot } from "@/lib/openai/realtime-session";
import { createInterviewSessionService } from "@/lib/session-service/session-service";
import type { InterviewMode } from "@/lib/types/interview";
import { InterviewWorkspace } from "@/components/interview/interview-workspace";
import { CandidateShell } from "@/components/workspace/candidate-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createWorkspaceInterviewRepository,
  createWorkspaceInterviewSessionStore,
} from "@/lib/workspace/runtime";
import { bootstrapInterviewSessionAction } from "./actions";

function parseRequestedMode(value: string | string[] | undefined): InterviewMode | null {
  if (typeof value !== "string") {
    return null;
  }

  return ["behavioral", "resume", "project", "system-design"].includes(value)
    ? (value as InterviewMode)
    : null;
}

function parseRequestedSessionId(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const sessionId = value.trim();
  return sessionId.length > 0 ? sessionId : null;
}

export default async function InterviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string; sessionId?: string }>;
}) {
  const user = await requireWorkspaceUser("/interview");
  const repository = await createWorkspaceInterviewRepository();
  const sessionService = createInterviewSessionService(
    await createWorkspaceInterviewSessionStore(),
  );
  const workspace = await repository.getWorkspaceSnapshot(user.id);
  const candidateLabel = workspace.profile?.fullName ?? user.email ?? "Candidate";
  const shellHeadline =
    workspace.profile?.headline ??
    "Live interview rehearsal with transcript evidence and persisted follow-ups.";

  if (!workspace.targetRole || !workspace.profile) {
    return (
      <CandidateShell
        activeHref="/interview"
        userLabel={candidateLabel}
        headline={shellHeadline}
        railNote="The live room needs onboarding context so prompts, scoring, and reports stay grounded."
      >
        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-end">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-[rgba(20,63,134,0.12)] text-[color:var(--curator-navy)]">
                Curator live room
              </Badge>
              <span className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--curator-orange)]">
                {INTERVIEW_ROUTE_COPY.eyebrow}
              </span>
            </div>
            <h1 className="curator-display max-w-4xl text-5xl text-[color:var(--curator-ink)] sm:text-6xl">
              Keep the rehearsal grounded in transcript evidence and background follow-through.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-700">
              The interview room needs a target role and saved profile context
              before the live transcript, voice transport, and report processing
              can stay tied to real candidate data.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    className:
                      "h-12 bg-[color:var(--curator-navy)] px-6 text-[color:var(--primary-foreground)] hover:bg-[color:var(--curator-navy-strong)]",
                  }),
                )}
              >
                Open onboarding
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className:
                      "h-12 border-[color:var(--curator-line)] bg-white/72 px-6",
                  }),
                )}
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          <Card className="curator-card-dark">
            <CardHeader className="space-y-4 border-b border-white/10">
              <Badge className="w-fit rounded-full bg-white/10 text-white">
                Room requirements
              </Badge>
              <CardTitle className="curator-display text-4xl text-white">
                A complete profile unlocks the live room.
              </CardTitle>
              <CardDescription className="text-base leading-7 text-slate-200">
                Role context, interview targets, and resume details shape the
                prompt ladder, the persisted transcript, and the scorecard
                generated after the session ends.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </CandidateShell>
    );
  }

  const resolvedSearchParams = await searchParams;
  const requestedMode = parseRequestedMode(resolvedSearchParams?.mode);
  const requestedSessionId = parseRequestedSessionId(resolvedSearchParams?.sessionId);
  const mode = requestedMode ?? workspace.activeMode;
  const existingSession = (await repository.listWorkspaceSessions(user.id)).find(
    (session) =>
      session.targetRoleId === workspace.targetRole?.id &&
      session.mode === mode &&
      session.status !== "completed" &&
      session.status !== "archived",
  );
  const activeSessionId = requestedSessionId ?? existingSession?.id ?? null;
  const hydratedSession = activeSessionId
    ? await sessionService.getSession({
        userId: user.id,
        sessionId: activeSessionId,
      })
    : null;

  if (!hydratedSession) {
    const modePreset = getInterviewModePreset(mode);

    return (
      <CandidateShell
        activeHref="/interview"
        userLabel={candidateLabel}
        headline={shellHeadline}
        railNote="Session bootstrap now runs as an explicit user action, keeping the interview route fully read-only."
      >
        <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr] xl:items-end">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-[rgba(20,63,134,0.12)] text-[color:var(--curator-navy)]">
                Curator live room
              </Badge>
              <span className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--curator-orange)]">
                {modePreset.label}
              </span>
            </div>
            <h1 className="curator-display max-w-4xl text-5xl text-[color:var(--curator-ink)] sm:text-6xl">
              Start a new interview session when you are ready to persist transcript turns.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-700">
              This page now stays read-only until you explicitly start a session.
              Reopening the same mode reuses any unfinished session for the current
              target role.
            </p>
          </div>

          <Card className="curator-card">
            <CardHeader className="space-y-4">
              <Badge className="w-fit rounded-full bg-[rgba(20,63,134,0.12)] text-[color:var(--curator-navy)]">
                Session bootstrap
              </Badge>
              <CardTitle className="text-2xl tracking-[-0.04em] text-[color:var(--curator-ink)]">
                {workspace.targetRole.title}
              </CardTitle>
              <CardDescription className="text-base leading-7 text-slate-600">
                {modePreset.focus}
              </CardDescription>
              <form action={bootstrapInterviewSessionAction} className="space-y-3">
                <input type="hidden" name="mode" value={mode} />
                <input
                  type="hidden"
                  name="targetRoleId"
                  value={workspace.targetRole.id}
                />
                <input
                  type="hidden"
                  name="title"
                  value={`${workspace.targetRole.title} interview`}
                />
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({
                      className:
                        "h-12 w-full rounded-full bg-[color:var(--curator-navy)] px-6 text-white hover:bg-[color:var(--curator-navy-strong)]",
                    }),
                  )}
                >
                  Start interview session
                </button>
              </form>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    className:
                      "h-12 w-full rounded-full border-[color:var(--curator-line)] bg-white/80",
                  }),
                )}
              >
                Back to dashboard
              </Link>
            </CardHeader>
          </Card>
        </section>
      </CandidateShell>
    );
  }

  const session = buildInterviewSessionStateFromView({
    view: hydratedSession,
    candidateName: workspace.profile.fullName,
    targetRole: workspace.targetRole.title,
    realtime: createRealtimeSessionSnapshot(),
  });
  const modePreset = getInterviewModePreset(session.mode);

  return (
    <CandidateShell
      activeHref="/interview"
      userLabel={candidateLabel}
      headline={shellHeadline}
      railNote="The reducer-driven session remains deterministic while the route moves into the signed-in Curator shell."
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-[rgba(20,63,134,0.12)] text-[color:var(--curator-navy)]">
              Curator live room
            </Badge>
            <span className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--curator-orange)]">
              {modePreset.label}
            </span>
          </div>
          <h1 className="curator-display max-w-4xl text-5xl text-[color:var(--curator-ink)] sm:text-6xl">
            Practice like the transcript is already under editorial review.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-700">
            The Curator keeps a timed interview loop, transcript evidence,
            and background report publishing in the same workspace so the whole rehearsal
            reads like a deliberate production workflow.
          </p>
        </div>

        <Card className="curator-card">
          <CardHeader className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(20,63,134,0.09)] text-[color:var(--curator-navy)]">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="curator-kicker">Session at a glance</p>
                <CardTitle className="mt-2 text-2xl tracking-[-0.04em] text-[color:var(--curator-ink)]">
                  {workspace.targetRole.title}
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-base leading-7 text-slate-600">
              The live room keeps transcript turns, transport state, and
              background report publishing in one deterministic loop.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <InterviewWorkspace initialSession={session} />
    </CandidateShell>
  );
}
