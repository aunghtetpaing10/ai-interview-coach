import "server-only";

import { buildProgressDashboardSnapshot } from "@/lib/analytics/progress";
import type {
  ProgressDashboardSnapshot,
  ProgressSession,
} from "@/lib/analytics/progress";

export interface ProgressStore {
  listProgressSessions(userId: string): Promise<readonly ProgressSession[]>;
}

export function createProgressService(store: ProgressStore) {
  return {
    listProgressSessions(userId: string) {
      return store.listProgressSessions(userId);
    },

    async getProgressSnapshot(userId: string): Promise<ProgressDashboardSnapshot | null> {
      const sessions = await store.listProgressSessions(userId);

      if (sessions.length === 0) {
        return null;
      }

      return buildProgressDashboardSnapshot([...sessions]);
    },
  };
}

export type ProgressService = ReturnType<typeof createProgressService>;
