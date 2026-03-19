import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import {
  feedbackReports,
  interviewSessions,
  transcriptTurns,
} from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { summarizeScorecard } from "@/lib/reporting/reporting";
import { type ProgressSession, type ProgressTrack } from "@/lib/analytics/progress";
import { type ProgressStore } from "@/lib/progress-service/progress-service";
import { type FeedbackReportRow } from "@/db/schema";

function toCompletedAt(value: Date | null | undefined, fallback: Date) {
  return (value ?? fallback).toISOString();
}

export function createPostgresProgressStore(): ProgressStore {
  const db = getDb();

  return {
    async listProgressSessions(userId) {
      const sessions = await db
        .select()
        .from(interviewSessions)
        .where(and(eq(interviewSessions.userId, userId), eq(interviewSessions.status, "completed")))
        .orderBy(desc(interviewSessions.updatedAt));

      if (sessions.length === 0) {
        return [];
      }

      const sessionIds = sessions.map((session) => session.id);

      const reports = await db
        .select({
          report: feedbackReports,
        })
        .from(feedbackReports)
        .innerJoin(
          interviewSessions,
          and(
            eq(feedbackReports.sessionId, interviewSessions.id),
            eq(interviewSessions.userId, userId),
          ),
        )
        .where(inArray(feedbackReports.sessionId, sessionIds))
        .orderBy(desc(feedbackReports.createdAt));

      const transcriptRows = await db
        .select({
          sessionId: transcriptTurns.sessionId,
          id: transcriptTurns.id,
        })
        .from(transcriptTurns)
        .where(inArray(transcriptTurns.sessionId, sessionIds));

      const reportBySessionId = new Map<string, FeedbackReportRow>();
      for (const row of reports) {
        if (!reportBySessionId.has(row.report.sessionId)) {
          reportBySessionId.set(row.report.sessionId, row.report);
        }
      }

      const transcriptCountBySessionId = new Map<string, number>();
      for (const row of transcriptRows) {
        transcriptCountBySessionId.set(
          row.sessionId,
          (transcriptCountBySessionId.get(row.sessionId) ?? 0) + 1,
        );
      }

      return sessions.map<ProgressSession>((session) => {
        const report = reportBySessionId.get(session.id);
        const summary = report ? summarizeScorecard(report.scorecard) : null;
        const transcriptCount = transcriptCountBySessionId.get(session.id) ?? 0;

        return {
          id: session.id,
          completedAt: toCompletedAt(session.endedAt, session.updatedAt),
          track: session.mode as ProgressTrack,
          score: report?.scorecard.overallScore ?? session.overallScore ?? 0,
          durationMinutes: Math.max(1, Math.round(session.durationSeconds / 60)),
          followUps: Math.max(0, transcriptCount - 1),
          focus: summary?.growthAreas[0] ?? session.title,
          note: summary?.headline ?? session.title,
        };
      });
    },
  };
}
