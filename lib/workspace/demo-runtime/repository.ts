import "server-only";

import { INTERVIEW_SEED } from "@/db/seed";
import type { InterviewMode } from "@/db/schema";
import { deriveActiveMode } from "@/lib/data/active-mode";
import type { InterviewDataRepository, WorkspaceSnapshot } from "@/lib/data/repository";
import { clone, demoRuntime, DEMO_USER } from "./state";

function buildQuestionPreview(mode?: InterviewMode) {
  return mode
    ? INTERVIEW_SEED.questionBank.filter((question) => question.mode === mode)
    : INTERVIEW_SEED.questionBank;
}

export function createDemoInterviewRepository(): InterviewDataRepository {
  const listRubricDimensions = async () => clone(INTERVIEW_SEED.rubricDimensions);
  
  const listQuestionBank = async (mode?: InterviewMode) =>
    clone(buildQuestionPreview(mode));
    
  const listTargetRoles = async (userId: string) =>
    userId === DEMO_USER.id ? [clone(demoRuntime.readState().targetRole)] : [];
    
  const listWorkspaceSessions = async (userId: string) => {
    const state = demoRuntime.readState();

    if (userId !== DEMO_USER.id) {
      return [];
    }

    return [...state.sessions]
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map((session) => clone(session));
  };
  
  const getWorkspaceSnapshot = async (userId: string) => {
    const state = demoRuntime.readState();
    const rubrics = clone(INTERVIEW_SEED.rubricDimensions);
    const questions = clone(buildQuestionPreview());
    const targetRoles = userId === DEMO_USER.id ? [clone(state.targetRole)] : [];
    const sessions =
      userId === DEMO_USER.id
        ? [...state.sessions]
            .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
            .map((session) => clone(session))
        : [];

    return {
      profile: userId === DEMO_USER.id ? clone(state.profile) : null,
      targetRole: targetRoles.find((targetRole) => targetRole.active) ?? targetRoles[0] ?? null,
      jobTarget: userId === DEMO_USER.id ? clone(state.jobTarget) : null,
      resumeAsset: userId === DEMO_USER.id && state.resumeAsset ? clone(state.resumeAsset) : null,
      activeMode: deriveActiveMode(sessions),
      questionCount: questions.length,
      rubricCount: rubrics.length,
      recentSessionCount: sessions.length,
      questionPreview: questions.slice(0, 3),
    } satisfies WorkspaceSnapshot;
  };

  return {
    listRubricDimensions,
    listQuestionBank,
    listTargetRoles,
    listWorkspaceSessions,
    getWorkspaceSnapshot,
  };
}
