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

      return {
        profile: workspace.profile ?? null,
        targetRole: activeTargetRole,
        jobTarget: workspace.jobTarget ?? null,
        resumeAsset: workspace.resumeAsset ?? null,
        activeMode: deriveActiveMode(userSessions),
        questionCount: questions.length,
        rubricCount: rubrics.length,
        recentSessionCount: userSessions.length,
        questionPreview: questions.slice(0, 3),
      };
    },
  };
}
