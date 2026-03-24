import { buildCompetencyTrend, deriveReadinessState, getInterviewModeLabel } from "@/lib/domain/interview";
import type { ProgressDashboardSnapshot } from "@/lib/analytics/progress";
import type { WorkspaceSnapshot } from "@/lib/data/repository";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";
import type { InterviewMode, Scorecard } from "@/lib/types/interview";

type DashboardModeCard = {
  mode: InterviewMode;
  label: string;
  competencies: Array<{
    label: string;
    score: number;
    note: string;
  }>;
  coachingTitle: string;
  coachingBody: string;
};

type DashboardPracticeStep = {
  title: string;
  description: string;
  length: string;
};

export interface DashboardReportWorkflow {
  sessionId: string;
  status: "queued" | "running" | "completed" | "failed";
  reportId?: string;
  error?: string;
}

export interface DashboardReadModel {
  firstName: string;
  headline: string;
  targetRole: string;
  activeModeLabel: string;
  heroDescription: string;
  reportWorkflow: {
    sessionId: string;
    href: string;
    label: string;
    description: string;
    status: DashboardReportWorkflow["status"];
    error?: string;
  } | null;
  stats: Array<{
    label: string;
    value: string;
    copy: string;
    icon: "target" | "voice" | "report" | "plan";
  }>;
  nextDrillTitle: string;
  nextDrillDescription: string;
  latestSession: {
    trackLabel: string;
    focus: string;
    note: string;
    score: number;
    durationMinutes: number;
    followUps: number;
    completedAtLabel: string;
  } | null;
  latestReport: {
    id: string;
    title: string;
    score: number;
    band: string;
    summary: string;
  } | null;
  timeline: Array<{
    label: string;
    score: number;
    trackLabel: string;
  }>;
  jobTarget: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
  } | null;
  resumeAsset: {
    fileName: string;
    summary: string;
  } | null;
  questionPreview: Array<{
    id: string;
    modeLabel: string;
    prompt: string;
  }>;
  scorecards: DashboardModeCard[];
  practicePlan: DashboardPracticeStep[];
}

const DASHBOARD_MODES: InterviewMode[] = [
  "behavioral",
  "resume",
  "project",
  "system-design",
];

function deriveFirstName(snapshot: WorkspaceSnapshot) {
  const fullName = snapshot.profile?.fullName?.trim();
  if (fullName) {
    return fullName.split(/\s+/)[0] ?? "Candidate";
  }

  return "Candidate";
}

function buildModeCards(reportOverviews: readonly ReportOverview[]): DashboardModeCard[] {
  return DASHBOARD_MODES.map((mode) => {
    const scorecards = reportOverviews
      .filter((report) => report.scorecard.mode === mode)
      .map((report) => report.scorecard);
    const competencyTrend = buildCompetencyTrend(scorecards as Scorecard[]);
    const latestOverviewForMode = reportOverviews.find((report) => report.scorecard.mode === mode);
    const populated = scorecards.length > 0;

    return {
      mode,
      label: getInterviewModeLabel(mode),
      competencies: competencyTrend.map((item) => ({
        label: item.label,
        score: item.score,
        note:
          !populated
            ? "No completed report yet. Finish a session in this track to populate the rubric."
            : item.score >= 80
              ? "This signal is holding up. Keep the evidence concrete."
              : "This still needs a tighter answer spine and clearer tradeoffs.",
      })),
      coachingTitle: populated
        ? latestOverviewForMode?.summary.headline ?? "Keep tightening the answer."
        : "No completed session yet",
      coachingBody: populated
        ? `Latest focus: ${(latestOverviewForMode?.growthAreas ?? []).join(" | ")}`
        : "Start a live session in this mode to replace the placeholder card with real report data.",
    };
  });
}

const SESSION_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function buildDashboardReadModel(input: {
  workspace: WorkspaceSnapshot;
  reportOverviews: readonly ReportOverview[];
  latestReport: InterviewReport | null;
  reportWorkflow?: DashboardReportWorkflow | null;
  progressSnapshot: ProgressDashboardSnapshot | null;
  completedSessionCount: number;
}): DashboardReadModel {
  const firstName = deriveFirstName(input.workspace);
  const targetRole =
    input.workspace.targetRole?.title ??
    input.workspace.profile?.targetRole ??
    "Target role";
  const readinessBand =
    input.progressSnapshot?.readinessBand ??
    deriveReadinessState(
      input.reportOverviews[0]?.scorecard.overallScore ?? 0,
    );
  const weakestTrack = input.progressSnapshot?.weakestTrack.label ?? "system design";
  const strongestTrack = input.progressSnapshot?.strongestTrack.label ?? "project walkthrough";
  const latestReport = input.latestReport;
  const reportWorkflow =
    input.reportWorkflow && input.reportWorkflow.status !== "completed"
      ? {
          sessionId: input.reportWorkflow.sessionId,
          href: `/reports/processing/${input.reportWorkflow.sessionId}`,
          label:
            input.reportWorkflow.status === "failed"
              ? "Retry report"
              : "Track report status",
          description:
            input.reportWorkflow.status === "failed"
              ? input.reportWorkflow.error ??
                "The latest report job failed. Retry it from the processing page."
              : "The latest completed session is still processing in the background.",
          status: input.reportWorkflow.status,
          error: input.reportWorkflow.error,
        }
      : null;

  return {
    firstName,
    headline: input.workspace.profile?.headline ?? "Interview practice dashboard",
    activeModeLabel: getInterviewModeLabel(input.workspace.activeMode),
    targetRole,
    heroDescription: reportWorkflow
      ? reportWorkflow.status === "failed"
        ? "The latest interview finished, but report generation failed. Re-run the job to publish a fresh scorecard and practice plan."
        : "The latest interview finished and the report is processing in the background. Keep the dashboard open or follow the processing page for completion."
      : latestReport
      ? `${strongestTrack} is currently your strongest track, while ${weakestTrack.toLowerCase()} still needs a tighter explanation of constraints and tradeoffs.`
      : "Save onboarding data, complete your first interview, and the dashboard will replace these placeholders with persisted score trends and a practice plan.",
    reportWorkflow,
    stats: [
      {
        label: "Readiness band",
        value: readinessBand,
        copy: latestReport
          ? latestReport.summary.headline
          : "Your readiness band will update after the first completed report.",
        icon: "target",
      },
      {
        label: "Live sessions completed",
        value: String(input.completedSessionCount),
        copy: input.completedSessionCount > 0
          ? "Completed sessions now persist and feed the rest of the product loop."
          : "No completed sessions yet. Start one from the interview room.",
        icon: "voice",
      },
      {
        label: "Reports generated",
        value: String(input.reportOverviews.length),
        copy: reportWorkflow
          ? reportWorkflow.status === "failed"
            ? "The latest report failed and needs a retry before the newest session can be reviewed."
            : "A background report job is still processing the newest completed session."
          : input.reportOverviews.length > 0
          ? "Each report is stored and can be reopened from the latest feedback surface."
          : "Reports are generated asynchronously after a session completes.",
        icon: "report",
      },
      {
        label: "Practice streak",
        value: input.progressSnapshot ? `${input.progressSnapshot.streakDays} days` : "0 days",
        copy: input.progressSnapshot
          ? "Repeated short drills now show up as real progress history."
          : "Your streak starts after the first completed session.",
        icon: "plan",
      },
    ],
    nextDrillTitle:
      reportWorkflow
        ? reportWorkflow.status === "failed"
          ? "Recover the failed report run"
          : "Wait for the latest report"
        : latestReport?.practicePlan.steps[0]?.title ??
      `Start a ${input.workspace.activeMode.replace("-", " ")} session`,
    nextDrillDescription:
      reportWorkflow
        ? reportWorkflow.description
        : latestReport?.practicePlan.steps[0]
        ? `${latestReport.practicePlan.steps[0].drill} ${latestReport.practicePlan.steps[0].outcome}`.trim()
        : "Use the interview room to create the first persisted transcript and report.",
    latestSession: input.progressSnapshot
      ? {
          trackLabel: getInterviewModeLabel(
            input.progressSnapshot.latestSession.track as InterviewMode,
          ),
          focus: input.progressSnapshot.latestSession.focus,
          note: input.progressSnapshot.latestSession.note,
          score: input.progressSnapshot.latestSession.score,
          durationMinutes: input.progressSnapshot.latestSession.durationMinutes,
          followUps: input.progressSnapshot.latestSession.followUps,
          completedAtLabel: SESSION_DATE_FORMATTER.format(
            new Date(input.progressSnapshot.latestSession.completedAt),
          ),
        }
      : null,
    latestReport: latestReport
      ? {
          id: latestReport.id,
          title: latestReport.title,
          score: latestReport.scorecard.overallScore,
          band: latestReport.summary.band,
          summary: latestReport.summary.headline,
        }
      : null,
    timeline: input.progressSnapshot?.timeline.slice(-4).map((point) => ({
      label: point.label,
      score: point.score,
      trackLabel: getInterviewModeLabel(point.track as InterviewMode),
    })) ?? [],
    jobTarget: input.workspace.jobTarget
      ? {
          companyName: input.workspace.jobTarget.companyName,
          jobTitle: input.workspace.jobTarget.jobTitle,
          jobDescription: input.workspace.jobTarget.jobDescription,
        }
      : null,
    resumeAsset: input.workspace.resumeAsset
      ? {
          fileName: input.workspace.resumeAsset.fileName,
          summary: input.workspace.resumeAsset.summary,
        }
      : null,
    questionPreview: input.workspace.questionPreview.map((question) => ({
      id: question.id,
      modeLabel: getInterviewModeLabel(question.mode),
      prompt: question.prompt,
    })),
    scorecards: buildModeCards(input.reportOverviews),
    practicePlan:
      latestReport?.practicePlan.steps.map((step) => ({
        title: step.title,
        description: `${step.drill} ${step.outcome}`.trim(),
        length: `${step.minutes} min`,
      })) ?? [],
  };
}
