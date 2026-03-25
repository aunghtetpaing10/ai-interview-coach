import { isE2EDemoMode } from "@/lib/env";
import type { OnboardingDraft } from "@/lib/intake/types";
import { createDemoInterviewRepository, createDemoInterviewSessionStore, createDemoProgressStore, createDemoReportStore, loadDemoOnboardingDraftForUser, saveDemoOnboardingDraftForUser } from "@/lib/workspace/demo-runtime";
import { createPostgresInterviewRepository } from "@/lib/data/database-repository";
import { createDatabaseInterviewSessionStore } from "@/lib/session-service/database-store";
import { createPostgresProgressStore } from "@/lib/progress-service/database-store";
import { createPostgresReportStore } from "@/lib/report-service/database-store";
import { loadOnboardingDraftForUser, saveOnboardingDraftForUser } from "@/lib/intake/persistence";

export async function createWorkspaceInterviewRepository() {
  if (isE2EDemoMode()) {
    return createDemoInterviewRepository();
  }
  return createPostgresInterviewRepository();
}

export async function createWorkspaceInterviewSessionStore() {
  if (isE2EDemoMode()) {
    return createDemoInterviewSessionStore();
  }
  return createDatabaseInterviewSessionStore();
}

export async function createWorkspaceProgressStore() {
  if (isE2EDemoMode()) {
    return createDemoProgressStore();
  }
  return createPostgresProgressStore();
}

export async function createWorkspaceReportStore() {
  if (isE2EDemoMode()) {
    return createDemoReportStore();
  }
  return createPostgresReportStore();
}

export async function loadWorkspaceOnboardingDraftForUser(userId: string) {
  if (isE2EDemoMode()) {
    return loadDemoOnboardingDraftForUser(userId);
  }
  return loadOnboardingDraftForUser(userId);
}

export async function saveWorkspaceOnboardingDraftForUser(input: {
  userId: string;
  email: string | null;
  draft: OnboardingDraft;
  file: File | null;
}) {
  if (isE2EDemoMode()) {
    return saveDemoOnboardingDraftForUser(input);
  }
  return saveOnboardingDraftForUser(input);
}
