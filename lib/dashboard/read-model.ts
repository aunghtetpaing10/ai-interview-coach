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

export interface DashboardReadModel {
  firstName: string;
  headline: string;
  targetRole: string;
  heroDescription: string;
  stats: Array<{
    label: string;
    value: string;
    copy: string;
    icon: "target" | "voice" | "report" | "plan";
  }>;
  nextDrillTitle: string;
  nextDrillDescription: string;
  latestReport: {
    id: string;
    title: string;
    score: number;
    band: string;
    summary: string;
  } | null;
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

export function buildDashboardReadModel(input: {
  workspace: WorkspaceSnapshot;
  reportOverviews: readonly ReportOverview[];
  latestReport: InterviewReport | null;
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

  return {
    firstName,
    headline: input.workspace.profile?.headline ?? "Interview practice dashboard",
    targetRole,
    heroDescription: latestReport
      ? `${strongestTrack} is currently your strongest track, while ${weakestTrack.toLowerCase()} still needs a tighter explanation of constraints and tradeoffs.`
      : "Save onboarding data, complete your first interview, and the dashboard will replace these placeholders with persisted score trends and a practice plan.",
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
        copy: input.reportOverviews.length > 0
          ? "Each report is stored and can be reopened from the report catalog."
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
      latestReport?.practicePlan.steps[0]?.title ??
      `Start a ${input.workspace.activeMode.replace("-", " ")} session`,
    nextDrillDescription:
      latestReport?.practicePlan.steps[0]
        ? `${latestReport.practicePlan.steps[0].drill} ${latestReport.practicePlan.steps[0].outcome}`.trim()
        : "Use the interview room to create the first persisted transcript and report.",
    latestReport: latestReport
      ? {
          id: latestReport.id,
          title: latestReport.title,
          score: latestReport.scorecard.overallScore,
          band: latestReport.summary.band,
          summary: latestReport.summary.headline,
        }
      : null,
    scorecards: buildModeCards(input.reportOverviews),
    practicePlan:
      latestReport?.practicePlan.steps.map((step) => ({
        title: step.title,
        description: `${step.drill} ${step.outcome}`.trim(),
        length: `${step.minutes} min`,
      })) ?? [],
  };
}
