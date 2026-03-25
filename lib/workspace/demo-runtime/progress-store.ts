import "server-only";

import type { ProgressSession } from "@/lib/analytics/progress";
import type { ProgressStore } from "@/lib/progress-service/progress-service";
import { demoRuntime, DEMO_USER } from "./state";

export function createDemoProgressStore(): ProgressStore {
  return {
    listProgressSessions: async (userId: string) => {
      const state = demoRuntime.readState();

      if (userId !== DEMO_USER.id) {
        return [];
      }

      const sessions = state.sessions
        .filter((session) => session.status === "completed")
        .map<ProgressSession>((session) => {
          const reportId = state.reportIdBySessionId.get(session.id);
          const reportRecord = reportId ? state.reportsById.get(reportId) ?? null : null;
          const transcript = state.transcriptTurnsBySessionId.get(session.id) ?? [];
          const summary = reportRecord?.report.summary;

          return {
            id: session.id,
            completedAt: (session.endedAt ?? session.updatedAt).toISOString(),
            track: session.mode,
            score: reportRecord?.report.scorecard.overallScore ?? session.overallScore ?? 0,
            durationMinutes: Math.max(1, Math.round(session.durationSeconds / 60)),
            followUps: Math.max(0, transcript.length - 1),
            focus: summary?.growthAreas[0] ?? session.title,
            note: summary?.headline ?? session.title,
          };
        });

      return sessions.sort(
        (left, right) =>
          new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime(),
      );
    },
  };
}
