import type {
  InterviewMode,
  InterviewSessionRow,
  JobTargetRow,
  ProfileRow,
  QuestionBankRow,
  ResumeAssetRow,
  RubricDimensionRow,
  TargetRoleRow,
} from "@/db/schema";
import { INTERVIEW_SEED } from "@/db/seed";
import { deriveActiveMode } from "@/lib/data/active-mode";

const CORE_TRACKS: InterviewMode[] = ["behavioral", "coding", "system-design"];

function tokenize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
}

export function selectQuestionPreview(input: {
  questions: readonly QuestionBankRow[];
  activeMode: InterviewMode;
  profile: ProfileRow | null;
  targetRole: TargetRoleRow | null;
  jobTarget: JobTargetRow | null;
  limit?: number;
}) {
  const contextTokens = new Set([
    ...tokenize(input.profile?.headline),
    ...tokenize(input.profile?.targetRole),
    ...tokenize(input.targetRole?.title),
    ...(input.targetRole?.focusAreas ?? []).flatMap((area) => tokenize(area)),
    ...tokenize(input.jobTarget?.companyName),
    ...tokenize(input.jobTarget?.jobTitle),
    ...tokenize(input.jobTarget?.jobDescription),
  ]);

  const scored = input.questions.map((question) => {
    const haystack = [
      question.title,
      question.prompt,
      question.questionFamily,
      question.interviewerGoal,
      question.followUpPolicy,
      ...(question.companyTags ?? []),
      ...(question.rubricKeys ?? []),
    ]
      .join(" ")
      .toLowerCase();

    let score = 0;

    if (question.mode === input.activeMode) {
      score += 6;
    }

    if (CORE_TRACKS.includes(question.mode)) {
      score += 3;
    }

    if (question.difficulty === "challenging") {
      score += 2;
    } else if (question.difficulty === "standard") {
      score += 1;
    }

    if (
      input.jobTarget?.companyName &&
      (question.companyTags ?? []).some(
        (tag) => tag.toLowerCase() === input.jobTarget?.companyName.toLowerCase(),
      )
    ) {
      score += 4;
    }

    for (const token of contextTokens) {
      if (haystack.includes(token)) {
        score += 1;
      }
    }

    return {
      question,
      score,
    };
  });

  return scored
    .sort((left, right) => right.score - left.score || left.question.orderIndex - right.question.orderIndex)
    .slice(0, input.limit ?? 3)
    .map((entry) => entry.question);
}

export interface WorkspaceSnapshot {
  profile: ProfileRow | null;
  targetRole: TargetRoleRow | null;
  jobTarget: JobTargetRow | null;
  resumeAsset: ResumeAssetRow | null;
  activeMode: InterviewMode;
  questionCount: number;
  rubricCount: number;
  recentSessionCount: number;
  questionPreview: readonly QuestionBankRow[];
}

export interface InterviewDataRepository {
  listRubricDimensions(): Promise<readonly RubricDimensionRow[]>;
  listQuestionBank(mode?: InterviewMode): Promise<readonly QuestionBankRow[]>;
  listTargetRoles(userId: string): Promise<readonly TargetRoleRow[]>;
  listWorkspaceSessions(userId: string): Promise<readonly InterviewSessionRow[]>;
  getWorkspaceSnapshot(userId: string): Promise<WorkspaceSnapshot>;
}

export function createSeededInterviewRepository(
  seed: typeof INTERVIEW_SEED | undefined = INTERVIEW_SEED,
  workspace: {
    profile?: ProfileRow | null;
    targetRoles?: readonly TargetRoleRow[];
    sessions?: readonly InterviewSessionRow[];
    jobTarget?: JobTargetRow | null;
    resumeAsset?: ResumeAssetRow | null;
  } = {},
): InterviewDataRepository {
  const resolvedSeed = seed ?? INTERVIEW_SEED;
  const targetRoles = workspace.targetRoles ?? [];
  const sessions = workspace.sessions ?? [];
  const listRubricDimensions = async () => resolvedSeed.rubricDimensions;
  const listQuestionBank = async (mode?: InterviewMode) =>
    mode
      ? resolvedSeed.questionBank.filter((question) => question.mode === mode)
      : resolvedSeed.questionBank;
  const listTargetRoles = async (userId: string) =>
    targetRoles.filter((targetRole) => targetRole.userId === userId);
  const listWorkspaceSessions = async (userId: string) =>
    sessions.filter((session) => session.userId === userId);

  return {
    listRubricDimensions,
    listQuestionBank,
    listTargetRoles,
    listWorkspaceSessions,
    async getWorkspaceSnapshot(userId: string) {
      const [rubrics, questions, userTargetRoles, userSessions] =
        await Promise.all([
          listRubricDimensions(),
          listQuestionBank(),
          listTargetRoles(userId),
          listWorkspaceSessions(userId),
        ]);

      const activeTargetRole =
        userTargetRoles.find((targetRole) => targetRole.active) ?? userTargetRoles[0] ?? null;
      const activeMode = deriveActiveMode(userSessions);

      return {
        profile: workspace.profile ?? null,
        targetRole: activeTargetRole,
        jobTarget: workspace.jobTarget ?? null,
        resumeAsset: workspace.resumeAsset ?? null,
        activeMode,
        questionCount: questions.length,
        rubricCount: rubrics.length,
        recentSessionCount: userSessions.length,
        questionPreview: selectQuestionPreview({
          questions,
          activeMode,
          profile: workspace.profile ?? null,
          targetRole: activeTargetRole,
          jobTarget: workspace.jobTarget ?? null,
        }),
      };
    },
  };
}
