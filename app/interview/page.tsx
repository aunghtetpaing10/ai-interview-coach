import Link from "next/link";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { createPostgresInterviewRepository } from "@/lib/data/database-repository";
import { getInterviewModePreset } from "@/lib/interview-session/catalog";
import { INTERVIEW_ROUTE_COPY } from "@/lib/interview-session/fixtures";
import { buildInterviewSessionStateFromView } from "@/lib/interview-session/persisted";
import { createRealtimeSessionSnapshot } from "@/lib/openai/realtime-session";
import { createDatabaseInterviewSessionStore } from "@/lib/session-service/database-store";
import { createInterviewSessionService } from "@/lib/session-service/session-service";
import type { InterviewMode } from "@/lib/types/interview";
import { InterviewWorkspace } from "@/components/interview/interview-workspace";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function parseRequestedMode(value: string | string[] | undefined): InterviewMode | null {
  if (typeof value !== "string") {
    return null;
  }

  return ["behavioral", "resume", "project", "system-design"].includes(value)
    ? (value as InterviewMode)
    : null;
}

export default async function InterviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const user = await requireWorkspaceUser("/interview");
  const repository = createPostgresInterviewRepository();
  const sessionService = createInterviewSessionService(createDatabaseInterviewSessionStore());
  const workspace = await repository.getWorkspaceSnapshot(user.id);

  if (!workspace.targetRole || !workspace.profile) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 lg:px-10">
        <Card className="border-slate-200/70 bg-white/90 shadow-[0_24px_90px_-50px_rgba(15,23,42,0.45)]">
          <CardHeader className="space-y-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-[#1638d4]">
              {INTERVIEW_ROUTE_COPY.eyebrow}
            </p>
            <CardTitle className="text-3xl tracking-[-0.04em] text-slate-950">
              Finish onboarding before starting the live room.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 text-slate-600">
              The interview room needs a target role and saved profile context so the
              prompts, report, and follow-ups stay grounded in real candidate data.
            </CardDescription>
          </CardHeader>
          <CardHeader>
            <Link
              href="/onboarding"
              className={cn(
                buttonVariants({
                  className: "w-fit rounded-full bg-slate-950 text-white hover:bg-slate-800",
                }),
              )}
            >
              Open onboarding
            </Link>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const requestedMode = parseRequestedMode((await searchParams)?.mode);
  const mode = requestedMode ?? workspace.activeMode;
  const existingSession = (await repository.listWorkspaceSessions(user.id)).find(
    (session) =>
      session.targetRoleId === workspace.targetRole?.id &&
      session.mode === mode &&
      session.status !== "completed" &&
      session.status !== "archived",
  );
  const sessionView =
    existingSession
      ? await sessionService.getSession({
          userId: user.id,
          sessionId: existingSession.id,
        })
      : await sessionService.createSession({
          userId: user.id,
          targetRoleId: workspace.targetRole.id,
          mode,
          title: `${workspace.targetRole.title} interview`,
        });
  const hydratedSession =
    sessionView && sessionView.transcriptTurns.length === 0
      ? await sessionService.appendTranscriptTurns({
          userId: user.id,
          sessionId: sessionView.session.id,
          turns: [
            {
              speaker: "interviewer",
              body: getInterviewModePreset(mode).openingPrompt,
              seconds: 8,
            },
          ],
        })
      : sessionView;

  if (!hydratedSession) {
    throw new Error("Failed to load the interview room.");
  }

  const session = buildInterviewSessionStateFromView({
    view: hydratedSession,
    candidateName: workspace.profile.fullName,
    targetRole: workspace.targetRole.title,
    realtime: createRealtimeSessionSnapshot(),
  });

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
              description: `${Math.round(session.durationSeconds / 60)} minute interview block.`,
            },
            {
              title: "Transcript",
              description: `${hydratedSession.transcriptTurns.length} persisted turns loaded.`,
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
