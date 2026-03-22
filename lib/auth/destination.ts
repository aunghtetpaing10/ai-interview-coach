import "server-only";

import type { WorkspaceSnapshot } from "@/lib/data/repository";
import { createPostgresInterviewRepository } from "@/lib/data/database-repository";
import { resolvePostAuthPath } from "@/lib/auth/paths";

export function needsOnboarding(snapshot: WorkspaceSnapshot) {
  return !snapshot.profile || !snapshot.targetRole || !snapshot.jobTarget || !snapshot.resumeAsset;
}

export async function resolvePostAuthDestination(userId: string, nextPath?: string | null) {
  const repository = createPostgresInterviewRepository();
  const snapshot = await repository.getWorkspaceSnapshot(userId);

  if (needsOnboarding(snapshot)) {
    return "/onboarding";
  }

  return resolvePostAuthPath(nextPath);
}
