import "server-only";

import { and, desc, eq } from "drizzle-orm";
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
import {
  interviewSessions,
  jobTargets,
  profiles,
  questionBank,
  resumeAssets,
  rubricDimensions,
  targetRoles,
} from "@/db/schema";
import { deriveActiveMode } from "@/lib/data/active-mode";
import { getDb } from "@/lib/db/client";
import { selectQuestionPreview, type InterviewDataRepository } from "@/lib/data/repository";

export interface InterviewRepositoryStore {
  getProfile(userId: string): Promise<ProfileRow | null>;
  listTargetRoles(userId: string): Promise<readonly TargetRoleRow[]>;
  listSessions(userId: string): Promise<readonly InterviewSessionRow[]>;
  listQuestionBank(mode?: InterviewMode): Promise<readonly QuestionBankRow[]>;
  listRubricDimensions(): Promise<readonly RubricDimensionRow[]>;
  getLatestResumeAsset(userId: string): Promise<ResumeAssetRow | null>;
  getActiveJobTarget(userId: string): Promise<JobTargetRow | null>;
}

export function createDatabaseInterviewRepository(
  store: InterviewRepositoryStore,
): InterviewDataRepository {
  return {
    listRubricDimensions: () => store.listRubricDimensions(),
    listQuestionBank: (mode?: InterviewMode) => store.listQuestionBank(mode),
    listTargetRoles: (userId: string) => store.listTargetRoles(userId),
    listWorkspaceSessions: (userId: string) => store.listSessions(userId),
    async getWorkspaceSnapshot(userId: string) {
      const [
        profile,
        rubrics,
        questions,
        roles,
        sessions,
        resumeAsset,
        jobTarget,
      ] = await Promise.all([
        store.getProfile(userId),
        store.listRubricDimensions(),
        store.listQuestionBank(),
        store.listTargetRoles(userId),
        store.listSessions(userId),
        store.getLatestResumeAsset(userId),
        store.getActiveJobTarget(userId),
      ]);

      const activeTargetRole =
        roles.find((targetRole) => targetRole.active) ?? roles[0] ?? null;
      const activeMode = deriveActiveMode(sessions);

      return {
        profile,
        targetRole: activeTargetRole,
        jobTarget,
        resumeAsset,
        activeMode,
        questionCount: questions.length,
        rubricCount: rubrics.length,
        recentSessionCount: sessions.length,
        questionPreview: selectQuestionPreview({
          questions,
          activeMode,
          profile,
          targetRole: activeTargetRole,
          jobTarget,
        }),
      };
    },
  };
}

export function createPostgresInterviewRepository(): InterviewDataRepository {
  const db = getDb();

  return createDatabaseInterviewRepository({
    async getProfile(userId) {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

      return profile ?? null;
    },
    async listTargetRoles(userId) {
      return db
        .select()
        .from(targetRoles)
        .where(eq(targetRoles.userId, userId))
        .orderBy(desc(targetRoles.createdAt));
    },
    async listSessions(userId) {
      return db
        .select()
        .from(interviewSessions)
        .where(eq(interviewSessions.userId, userId))
        .orderBy(desc(interviewSessions.updatedAt));
    },
    async listQuestionBank(mode) {
      if (!mode) {
        return db.select().from(questionBank).orderBy(questionBank.orderIndex);
      }

      return db
        .select()
        .from(questionBank)
        .where(eq(questionBank.mode, mode))
        .orderBy(questionBank.orderIndex);
    },
    async listRubricDimensions() {
      return db.select().from(rubricDimensions);
    },
    async getLatestResumeAsset(userId) {
      const [resumeAsset] = await db
        .select()
        .from(resumeAssets)
        .where(eq(resumeAssets.userId, userId))
        .orderBy(desc(resumeAssets.uploadedAt))
        .limit(1);

      return resumeAsset ?? null;
    },
    async getActiveJobTarget(userId) {
      const [row] = await db
        .select({
          jobTarget: jobTargets,
        })
        .from(jobTargets)
        .innerJoin(
          targetRoles,
          and(
            eq(jobTargets.targetRoleId, targetRoles.id),
            eq(targetRoles.userId, userId),
          ),
        )
        .where(eq(jobTargets.userId, userId))
        .orderBy(desc(jobTargets.updatedAt))
        .limit(1);

      return row?.jobTarget ?? null;
    },
  });
}
