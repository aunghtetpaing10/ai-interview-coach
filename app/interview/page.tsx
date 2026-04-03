import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/auth/session";
import {
  getDefaultInterviewBlueprint,
  getInterviewModePreset,
  INTERVIEW_COMPANY_STYLES,
  INTERVIEW_DIFFICULTIES,
  INTERVIEW_PRACTICE_STYLES,
  listQuestionBankEntries,
} from "@/lib/interview-session/catalog";
import { INTERVIEW_ROUTE_COPY } from "@/lib/interview-session/fixtures";
import { buildInterviewSessionStateFromView } from "@/lib/interview-session/persisted";
import { createRealtimeSessionSnapshot } from "@/lib/openai/realtime-session";
import { createInterviewSessionService } from "@/lib/session-service/session-service";
import {
  companyStyleSchema,
  interviewDifficultySchema,
  interviewModeSchema,
  practiceStyleSchema,
} from "@/lib/session-service/validation";
import type {
  CompanyStyle,
  InterviewDifficulty,
  InterviewMode,
  PracticeStyle,
} from "@/lib/types/interview";
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

  const parsed = interviewModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseRequestedPracticeStyle(
  value: string | string[] | undefined,
): PracticeStyle | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = practiceStyleSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseRequestedDifficulty(
  value: string | string[] | undefined,
): InterviewDifficulty | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = interviewDifficultySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseRequestedCompanyStyle(
  value: string | string[] | undefined,
): CompanyStyle | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = companyStyleSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseRequestedSessionId(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const sessionId = value.trim();
  return sessionId.length > 0 ? sessionId : null;
}

function parseRequestedQuestionId(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const questionId = value.trim();
  return questionId.length > 0 ? questionId : null;
}

function buildSearchHref(input: {
  mode: InterviewMode;
  practiceStyle: PracticeStyle;
  difficulty: InterviewDifficulty;
  companyStyle: CompanyStyle | null;
  questionId?: string | null;
}) {
  const search = new URLSearchParams({
    mode: input.mode,
    practiceStyle: input.practiceStyle,
    difficulty: input.difficulty,
  });

  if (input.companyStyle) {
    search.set("companyStyle", input.companyStyle);
  }

  if (input.questionId) {
    search.set("questionId", input.questionId);
  }

  return `/interview?${search.toString()}`;
}

function scoreQuestion(
  question: ReturnType<typeof listQuestionBankEntries>[number],
  context: string,
  activeMode: InterviewMode,
) {
  let score = question.mode === activeMode ? 5 : 0;
  const haystack = [
    question.title,
    question.prompt,
    question.questionFamily,
    ...(question.companyTags ?? []),
    ...(question.coachingOutline ?? []),
  ]
    .join(" ")
    .toLowerCase();

  for (const token of context.split(/\W+/).filter((part) => part.length > 3)) {
    if (haystack.includes(token)) {
      score += 1;
    }
  }

  return score;
}

export default async function InterviewPage({
  searchParams,
}: {
  searchParams?: Promise<{
    mode?: string;
    sessionId?: string;
    practiceStyle?: string;
    difficulty?: string;
    companyStyle?: string;
    questionId?: string;
  }>;
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
                blueprint, the persisted transcript, and the scorecard
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
  const mode = requestedMode ?? workspace.activeMode;
  const preset = getInterviewModePreset(mode);
  const practiceStyle =
    parseRequestedPracticeStyle(resolvedSearchParams?.practiceStyle) ??
    preset.defaultPracticeStyle;
  const difficulty =
    parseRequestedDifficulty(resolvedSearchParams?.difficulty) ??
    preset.defaultDifficulty;
  const companyStyle = parseRequestedCompanyStyle(resolvedSearchParams?.companyStyle);
  const requestedQuestionId = parseRequestedQuestionId(resolvedSearchParams?.questionId);
  const contextText = [
    workspace.targetRole.title,
    workspace.targetRole.level,
    workspace.targetRole.companyType,
    ...(workspace.targetRole.focusAreas ?? []),
    workspace.jobTarget?.jobDescription ?? "",
    workspace.profile.headline,
  ]
    .join(" ")
    .toLowerCase();
  const rankedQuestions = listQuestionBankEntries(mode)
    .slice()
    .sort(
      (left, right) =>
        scoreQuestion(right, contextText, workspace.activeMode) -
          scoreQuestion(left, contextText, workspace.activeMode) ||
        left.orderIndex - right.orderIndex,
    );
  const selectedQuestion =
    rankedQuestions.find((question) => question.id === requestedQuestionId) ??
    rankedQuestions[0] ??
    listQuestionBankEntries(mode)[0];

  if (!selectedQuestion) {
    throw new Error(`No interview questions found for mode ${mode}.`);
  }

  const requestedSessionId = parseRequestedSessionId(resolvedSearchParams?.sessionId);
  const existingSession = (await repository.listWorkspaceSessions(user.id)).find(
    (session) =>
      session.targetRoleId === workspace.targetRole?.id &&
      session.mode === mode &&
      session.practiceStyle === practiceStyle &&
      session.difficulty === difficulty &&
      (session.companyStyle ?? null) === (companyStyle ?? null) &&
      (session.questionId ?? null) === selectedQuestion.id &&
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
    const blueprint = getDefaultInterviewBlueprint({
      mode,
      practiceStyle,
      difficulty,
      companyStyle,
      questionId: selectedQuestion.id,
    });

    return (
      <CandidateShell
        activeHref="/interview"
        userLabel={candidateLabel}
        headline={shellHeadline}
        railNote="Session bootstrap stays explicit so the route can recommend the next best drill before any transcript is persisted."
      >
        <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr] xl:items-start">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-[rgba(20,63,134,0.12)] text-[color:var(--curator-navy)]">
                Curator live room
              </Badge>
              <span className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--curator-orange)]">
                {preset.label}
              </span>
            </div>
            <h1 className="curator-display max-w-4xl text-5xl text-[color:var(--curator-ink)] sm:text-6xl">
              Start the next interview from a real question, not a generic mode tab.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-700">
              Choose the practice style, pressure level, and question before the
              session starts. The staged blueprint, report artifacts, and replay
              actions all key off this setup.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {(["behavioral", "coding", "system-design", "resume", "project"] as const).map(
                (candidateMode) => {
                  const candidatePreset = getInterviewModePreset(candidateMode);

                  return (
                    <Link
                      key={candidateMode}
                      href={buildSearchHref({
                        mode: candidateMode,
                        practiceStyle,
                        difficulty,
                        companyStyle,
                      })}
                      className={cn(
                        "rounded-[1.4rem] border px-4 py-4 text-sm leading-6 transition",
                        candidateMode === mode
                          ? "border-[color:var(--curator-navy)] bg-[rgba(20,63,134,0.08)] text-[color:var(--curator-ink)]"
                          : "border-[color:var(--curator-line)] bg-white/80 text-slate-600 hover:bg-white",
                      )}
                    >
                      <span className="block font-semibold text-[color:var(--curator-ink)]">
                        {candidatePreset.label}
                      </span>
                      <span className="mt-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                        {candidatePreset.defaultPracticeStyle}
                      </span>
                    </Link>
                  );
                },
              )}
            </div>
          </div>

          <Card className="curator-card">
            <CardHeader className="space-y-4">
              <Badge className="w-fit rounded-full bg-[rgba(20,63,134,0.12)] text-[color:var(--curator-navy)]">
                Session bootstrap
              </Badge>
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(20,63,134,0.09)] text-[color:var(--curator-navy)]">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-2xl tracking-[-0.04em] text-[color:var(--curator-ink)]">
                    {selectedQuestion.title}
                  </CardTitle>
                  <CardDescription className="mt-2 text-base leading-7 text-slate-600">
                    {selectedQuestion.prompt}
                  </CardDescription>
                </div>
              </div>
              <form action={bootstrapInterviewSessionAction} className="space-y-4">
                <input type="hidden" name="mode" value={mode} />
                <input type="hidden" name="targetRoleId" value={workspace.targetRole.id} />
                <input type="hidden" name="questionId" value={selectedQuestion.id} />
                <input
                  type="hidden"
                  name="title"
                  value={`${selectedQuestion.title} interview`}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-600">
                    <span className="font-medium text-[color:var(--curator-ink)]">
                      Practice style
                    </span>
                    <select
                      name="practiceStyle"
                      defaultValue={practiceStyle}
                      className="h-11 w-full rounded-2xl border border-[color:var(--curator-line)] bg-white px-4"
                    >
                      {INTERVIEW_PRACTICE_STYLES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-slate-600">
                    <span className="font-medium text-[color:var(--curator-ink)]">
                      Difficulty
                    </span>
                    <select
                      name="difficulty"
                      defaultValue={difficulty}
                      className="h-11 w-full rounded-2xl border border-[color:var(--curator-line)] bg-white px-4"
                    >
                      {INTERVIEW_DIFFICULTIES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-[color:var(--curator-ink)]">
                    Company style
                  </span>
                  <select
                    name="companyStyle"
                    defaultValue={companyStyle ?? "general"}
                    className="h-11 w-full rounded-2xl border border-[color:var(--curator-line)] bg-white px-4"
                  >
                    {INTERVIEW_COMPANY_STYLES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-[1.5rem] border border-[color:var(--curator-line)] bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--curator-orange)]">
                    Blueprint preview
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {preset.summary}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {practiceStyle === "guided"
                      ? preset.guidedDescription
                      : preset.liveDescription}
                  </p>
                  <div className="mt-4 grid gap-2">
                    {blueprint.stages.slice(0, 3).map((stage) => (
                      <div
                        key={stage.id}
                        className="rounded-[1.2rem] border border-[color:var(--curator-line)] bg-[rgba(20,63,134,0.04)] p-3 text-sm leading-6 text-slate-700"
                      >
                        <strong>{stage.label}:</strong> {stage.prompt}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Recommended questions
                  </p>
                  <div className="grid gap-2">
                    {rankedQuestions.slice(0, 4).map((question) => (
                      <label
                        key={question.id}
                        className={cn(
                          "rounded-[1.25rem] border bg-white/80 p-4 text-sm leading-6 text-slate-700",
                          question.id === selectedQuestion.id
                            ? "border-[color:var(--curator-navy)]"
                            : "border-[color:var(--curator-line)]",
                        )}
                      >
                        <input
                          type="radio"
                          name="questionId"
                          value={question.id}
                          defaultChecked={question.id === selectedQuestion.id}
                          className="mr-3"
                        />
                        <span className="font-medium text-[color:var(--curator-ink)]">
                          {question.title}
                        </span>
                        <span className="mt-1 block text-slate-500">
                          {question.questionFamily}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

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
      railNote="The reducer-driven session remains deterministic while the route carries track, style, difficulty, and question identity through the workspace."
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
            The Curator keeps a timed interview loop, stage-aware blueprint,
            transcript evidence, and background report publishing in the same
            workspace so the rehearsal feels like a real training product.
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
                  {session.questionTitle}
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-base leading-7 text-slate-600">
              {modePreset.summary}
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <InterviewWorkspace initialSession={session} />
    </CandidateShell>
  );
}
