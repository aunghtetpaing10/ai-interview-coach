import { isE2EDemoMode } from "@/lib/env";
import type { OnboardingDraft } from "@/lib/intake/types";

export async function createWorkspaceInterviewRepository() {
  if (isE2EDemoMode()) {
    const { createDemoInterviewRepository } = await import("@/lib/workspace/demo-runtime");

    return createDemoInterviewRepository();
  }

  const { createPostgresInterviewRepository } = await import(
    "@/lib/data/database-repository"
  );

  return createPostgresInterviewRepository();
}

export async function createWorkspaceInterviewSessionStore() {
  if (isE2EDemoMode()) {
    const { createDemoInterviewSessionStore } = await import(
      "@/lib/workspace/demo-runtime"
    );

    return createDemoInterviewSessionStore();
  }

  const { createDatabaseInterviewSessionStore } = await import(
    "@/lib/session-service/database-store"
  );

  return createDatabaseInterviewSessionStore();
}

export async function createWorkspaceProgressStore() {
  if (isE2EDemoMode()) {
    const { createDemoProgressStore } = await import("@/lib/workspace/demo-runtime");

    return createDemoProgressStore();
  }

  const { createPostgresProgressStore } = await import(
    "@/lib/progress-service/database-store"
  );

  return createPostgresProgressStore();
}

export async function createWorkspaceReportStore() {
  if (isE2EDemoMode()) {
    const { createDemoReportStore } = await import("@/lib/workspace/demo-runtime");

    return createDemoReportStore();
  }

  const { createPostgresReportStore } = await import("@/lib/report-service/database-store");

  return createPostgresReportStore();
}

export async function loadWorkspaceOnboardingDraftForUser(userId: string) {
  if (isE2EDemoMode()) {
    const { loadDemoOnboardingDraftForUser } = await import("@/lib/workspace/demo-runtime");

    return loadDemoOnboardingDraftForUser(userId);
  }

  const { loadOnboardingDraftForUser } = await import("@/lib/intake/persistence");

  return loadOnboardingDraftForUser(userId);
}

export async function saveWorkspaceOnboardingDraftForUser(input: {
  userId: string;
  email: string | null;
  draft: OnboardingDraft;
  file: File | null;
}) {
  if (isE2EDemoMode()) {
    const { saveDemoOnboardingDraftForUser } = await import("@/lib/workspace/demo-runtime");

    return saveDemoOnboardingDraftForUser(input);
  }

  const { saveOnboardingDraftForUser } = await import("@/lib/intake/persistence");

  return saveOnboardingDraftForUser(input);
}
