import "server-only";

import { and, desc, eq } from "drizzle-orm";
import {
  feedbackReports,
  interviewSessions,
  jobTargets,
  practicePlans,
  profiles,
  promptVersions,
  targetRoles,
  transcriptTurns,
} from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { generatePracticePlan, summarizeScorecard } from "@/lib/reporting/reporting";
import { type InterviewReport, type ReportOverview } from "@/lib/reporting/types";
import { type ReportGenerationContext, type ReportStore } from "@/lib/report-service/report-service";
import { type TranscriptTurn } from "@/lib/types/interview";
import { type FeedbackReportRow,
  type InterviewSessionRow,
  type ProfileRow,
  type PromptVersionRow,
  type TargetRoleRow,
  type TranscriptTurnRow,
} from "@/db/schema";

function formatSessionDate(value: Date | null | undefined) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(value ?? new Date());
}

function toTranscriptTurns(rows: readonly TranscriptTurnRow[]): TranscriptTurn[] {
  return rows.map((row) => ({
    id: row.id,
    speaker: row.speaker,
    text: row.body,
    timestampSeconds: row.seconds,
  }));
}

function mapOverview(row: {
  report: FeedbackReportRow;
  session: InterviewSessionRow;
  profile: ProfileRow | null;
  targetRole: TargetRoleRow;
  promptVersion: PromptVersionRow | null;
}): ReportOverview {
  const summary = summarizeScorecard(row.report.scorecard);

  return {
    id: row.report.id,
    title: row.session.title,
    sessionDate: formatSessionDate(row.session.endedAt ?? row.report.createdAt),
    candidate: row.profile?.fullName ?? "Candidate",
    targetRole: row.targetRole.title,
    promptVersion: row.promptVersion?.label ?? "Generated prompt",
    scorecard: row.report.scorecard,
    summary,
    strengths: [...(row.report.strengths ?? summary.strengths)],
    growthAreas: [...(row.report.gaps ?? summary.growthAreas)],
  };
}

function mapReportDetail(row: {
  report: FeedbackReportRow;
  session: InterviewSessionRow;
  profile: ProfileRow | null;
  targetRole: TargetRoleRow;
  promptVersion: PromptVersionRow | null;
  transcript: readonly TranscriptTurnRow[];
}): InterviewReport {
  const overview = mapOverview(row);
  const transcript = toTranscriptTurns(row.transcript);
  const report: InterviewReport = {
    ...overview,
    transcript,
    citations: [...(row.report.citations ?? [])],
    rewrites: [...(row.report.rewrites ?? [])],
    practicePlan: generatePracticePlan({
      targetRole: overview.targetRole,
      scorecard: overview.scorecard,
      summary: overview.summary,
      focusAreas: overview.growthAreas,
    }),
  };

  return report;
}

export function createPostgresReportStore(): ReportStore {
  const db = getDb();

  return {
    async listReportOverviews(userId) {
      const rows = await db
        .select({
          report: feedbackReports,
          session: interviewSessions,
          profile: profiles,
          targetRole: targetRoles,
          promptVersion: promptVersions,
        })
        .from(feedbackReports)
        .innerJoin(
          interviewSessions,
          and(
            eq(feedbackReports.sessionId, interviewSessions.id),
            eq(interviewSessions.userId, userId),
          ),
        )
        .leftJoin(profiles, eq(profiles.userId, interviewSessions.userId))
        .innerJoin(targetRoles, eq(interviewSessions.targetRoleId, targetRoles.id))
        .leftJoin(promptVersions, eq(feedbackReports.promptVersionId, promptVersions.id))
        .orderBy(desc(feedbackReports.createdAt));

      return rows.map(mapOverview);
    },

    async getReportById(userId, reportId) {
      const [row] = await db
        .select({
          report: feedbackReports,
          session: interviewSessions,
          profile: profiles,
          targetRole: targetRoles,
          promptVersion: promptVersions,
        })
        .from(feedbackReports)
        .innerJoin(
          interviewSessions,
          and(
            eq(feedbackReports.sessionId, interviewSessions.id),
            eq(interviewSessions.userId, userId),
          ),
        )
        .leftJoin(profiles, eq(profiles.userId, interviewSessions.userId))
        .innerJoin(targetRoles, eq(interviewSessions.targetRoleId, targetRoles.id))
        .leftJoin(promptVersions, eq(feedbackReports.promptVersionId, promptVersions.id))
        .where(eq(feedbackReports.id, reportId))
        .limit(1);

      if (!row) {
        return null;
      }

      const transcript = await db
        .select()
        .from(transcriptTurns)
        .where(eq(transcriptTurns.sessionId, row.session.id))
        .orderBy(transcriptTurns.sequenceIndex);

      return mapReportDetail({
        ...row,
        transcript,
      });
    },

    async loadGenerationContext(userId, sessionId) {
      const [session] = await db
        .select()
        .from(interviewSessions)
        .where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.userId, userId)))
        .limit(1);

      if (!session) {
        return null;
      }

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

      const [targetRole] = await db
        .select()
        .from(targetRoles)
        .where(eq(targetRoles.id, session.targetRoleId))
        .limit(1);

      const [jobTarget] = await db
        .select()
        .from(jobTargets)
        .where(and(eq(jobTargets.userId, userId), eq(jobTargets.targetRoleId, session.targetRoleId)))
        .orderBy(desc(jobTargets.updatedAt))
        .limit(1);

      const [promptVersion] = await db
        .select()
        .from(promptVersions)
        .orderBy(desc(promptVersions.publishedAt))
        .limit(1);

      const transcript = await db
        .select()
        .from(transcriptTurns)
        .where(eq(transcriptTurns.sessionId, session.id))
        .orderBy(transcriptTurns.sequenceIndex);

      const [report] = await db
        .select()
        .from(feedbackReports)
        .where(eq(feedbackReports.sessionId, session.id))
        .orderBy(desc(feedbackReports.createdAt))
        .limit(1);

      const [practicePlan] = await db
        .select()
        .from(practicePlans)
        .where(eq(practicePlans.sessionId, session.id))
        .orderBy(desc(practicePlans.createdAt))
        .limit(1);

      return {
        session,
        profile: profile ?? null,
        targetRole: targetRole ?? null,
        jobTarget: jobTarget ?? null,
        promptVersion: promptVersion ?? null,
        transcript,
        report: report ?? null,
        practicePlan: practicePlan ?? null,
      } satisfies ReportGenerationContext;
    },

    async saveGeneratedReport(userId, context, report) {
      const [session] = await db
        .select()
        .from(interviewSessions)
        .where(and(eq(interviewSessions.id, context.session.id), eq(interviewSessions.userId, userId)))
        .limit(1);

      if (!session) {
        throw new Error("Session not found while saving the generated report.");
      }

      const existingRows = await db
        .select()
        .from(feedbackReports)
        .where(eq(feedbackReports.sessionId, session.id))
        .orderBy(desc(feedbackReports.createdAt))
        .limit(1);
      const existingReport = existingRows[0] ?? null;

      if (existingReport) {
        await db
          .update(feedbackReports)
          .set({
            promptVersionId: context.promptVersion?.id ?? null,
            summary: report.summary.headline,
            scorecard: report.scorecard,
            strengths: [...report.strengths],
            gaps: [...report.growthAreas],
            citations: [...report.citations],
            rewrites: [...report.rewrites],
          })
          .where(eq(feedbackReports.id, existingReport.id));
      } else {
        await db.insert(feedbackReports).values({
          id: report.id,
          sessionId: session.id,
          promptVersionId: context.promptVersion?.id ?? null,
          summary: report.summary.headline,
          scorecard: report.scorecard,
          strengths: [...report.strengths],
          gaps: [...report.growthAreas],
          citations: [...report.citations],
          rewrites: [...report.rewrites],
        });
      }

      const existingPracticePlanRows = await db
        .select()
        .from(practicePlans)
        .where(eq(practicePlans.sessionId, session.id))
        .orderBy(desc(practicePlans.createdAt))
        .limit(1);
      const existingPracticePlan = existingPracticePlanRows[0] ?? null;
      const planSteps = report.practicePlan.steps.map((step) => ({
        title: step.title,
        description: `${step.drill} ${step.outcome}`.trim(),
        length: `${step.minutes} min`,
      }));

      if (existingPracticePlan) {
        await db
          .update(practicePlans)
          .set({
            title: report.practicePlan.title,
            focus: report.practicePlan.focus,
            steps: planSteps,
          })
          .where(eq(practicePlans.id, existingPracticePlan.id));
      } else {
        await db.insert(practicePlans).values({
          sessionId: session.id,
          title: report.practicePlan.title,
          focus: report.practicePlan.focus,
          steps: planSteps,
        });
      }

      return report;
    },
  };
}
