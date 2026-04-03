import type { InterviewSessionRow } from "@/db/schema";
import {
  buildDimensionTrend,
  deriveReadinessState,
  getInterviewDifficultyLabel,
  getInterviewModeLabel,
} from "@/lib/domain/interview";
import type { ProgressDashboardSnapshot } from "@/lib/analytics/progress";
import type { WorkspaceSnapshot } from "@/lib/data/repository";
import type { InterviewReport, ReportOverview } from "@/lib/reporting/types";
import type { InterviewMode } from "@/lib/types/interview";

type DashboardModeCard = {
  mode: InterviewMode;
  label: string;
  averageScore: number;
  readiness: string;
  dimensions: Array<{
    label: string;
    score: number;
    note: string;
  }>;
  coachingTitle: string;
  coachingBody: string;
  href: string;
};

type DashboardPracticeStep = {
  title: string;
  description: string;
  length: string;
};

type DashboardQuestionPreview = {
  id: string;
  title: string;
  modeLabel: string;
  difficultyLabel: string;
  prompt: string;
  href: string;
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
  nextRecommendedQuestion: DashboardQuestionPreview | null;
  questionPreview: DashboardQuestionPreview[];
  scorecards: DashboardModeCard[];
  practicePlan: DashboardPracticeStep[];
}

const DASHBOARD_MODES: InterviewMode[] = [
  "behavioral",
  "coding",
  "system-design",
  "resume",
  "project",
];

const SESSION_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function deriveFirstName(snapshot: WorkspaceSnapshot) {
  const fullName = snapshot.profile?.fullName?.trim();
  if (fullName) {
    return fullName.split(/\s+/)[0] ?? "Candidate";
  }

  return "Candidate";
}

function buildModeCards(reportOverviews: readonly ReportOverview[]): DashboardModeCard[] {
  return DASHBOARD_MODES.map((mode) => {
    const reportsForMode = reportOverviews.filter((report) => report.scorecard.mode === mode);
    const trend = buildDimensionTrend(reportsForMode.map((report) => report.scorecard));
    const averageScore =
      reportsForMode.length === 0
        ? 0
        : Math.round(
            reportsForMode.reduce((sum, report) => sum + report.scorecard.overallScore, 0) /
              reportsForMode.length,
          );
    const leadDimension = trend[0];
    const focusDimension = trend.at(-1);
    const latestOverviewForMode = reportsForMode[0];
    const populated = reportsForMode.length > 0;

    return {
      mode,
      label: getInterviewModeLabel(mode),
      averageScore,
      readiness: populated ? deriveReadinessState(averageScore) : "training",
      dimensions: trend.slice(0, 3).map((item) => ({
        label: item.label,
        score: item.score,
        note:
          item.key === focusDimension?.key
            ? "This is the first repair target."
            : item.key === leadDimension?.key
              ? "This is carrying the track right now."
              : "This dimension is holding steady across recent reports.",
      })),
      coachingTitle: populated
        ? latestOverviewForMode?.summary.headline ?? "Keep tightening the answer."
        : `No ${getInterviewModeLabel(mode).toLowerCase()} report yet`,
      coachingBody: populated
        ? `Next focus: ${(latestOverviewForMode?.growthAreas ?? []).join(" | ")}`
        : `Run a ${mode === "behavioral" || mode === "coding" || mode === "system-design" ? "core-track" : "supporting"} session here to populate a track-specific scorecard.`,
      href: `/interview?mode=${mode}`,
    };
  });
}

function buildQuestionPreview(questions: WorkspaceSnapshot["questionPreview"]): DashboardQuestionPreview[] {
  return questions.map((question) => ({
    id: question.id,
    title: question.title,
    modeLabel: getInterviewModeLabel(question.mode),
    difficultyLabel: getInterviewDifficultyLabel(question.difficulty),
    prompt: question.prompt,
    href: `/interview?mode=${question.mode}&practiceStyle=guided&difficulty=${question.difficulty}&questionId=${question.id}`,
  }));
}

export function buildDashboardReadModel(input: {
  workspace: WorkspaceSnapshot;
  sessions: readonly InterviewSessionRow[];
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
    deriveReadinessState(input.reportOverviews[0]?.scorecard.overallScore ?? 0);
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
  const completedSessions = input.sessions.filter((session) => session.status === "completed");
  const guidedDrills = completedSessions.filter((session) => session.practiceStyle === "guided");
  const liveMocks = completedSessions.filter((session) => session.practiceStyle === "live");
  const questionPreview = buildQuestionPreview(input.workspace.questionPreview);
  const nextRecommendedQuestion = questionPreview[0] ?? null;
  const strongestTrack = input.progressSnapshot?.strongestTrack.label ?? "Behavioral";
  const weakestTrack = input.progressSnapshot?.weakestTrack.label ?? "System design";

  return {
    firstName,
    headline: input.workspace.profile?.headline ?? "Interview practice dashboard",
    activeModeLabel: getInterviewModeLabel(input.workspace.activeMode),
    targetRole,
    heroDescription: reportWorkflow
      ? reportWorkflow.status === "failed"
        ? "The latest interview finished, but report generation failed. Re-run the job to publish the new scorecard and replay actions."
        : "The latest interview finished and the report is still processing. The dashboard will promote the track-specific feedback as soon as it lands."
      : latestReport && nextRecommendedQuestion
        ? `${strongestTrack} is currently strongest, ${weakestTrack.toLowerCase()} still needs work, and the next recommended question is ${nextRecommendedQuestion.title.toLowerCase()}.`
        : "Complete guided drills and live mocks across behavioral, coding, and system design to turn this dashboard into a real readiness view.",
    reportWorkflow,
    stats: [
      {
        label: "Readiness band",
        value: readinessBand,
        copy: latestReport
          ? latestReport.summary.headline
          : "Your readiness band updates after the first completed report.",
        icon: "target",
      },
      {
        label: "Guided drills",
        value: String(guidedDrills.length),
        copy:
          guidedDrills.length > 0
            ? "Guided reps are landing and can be replayed into the same question family."
            : "No guided drills completed yet. Use guided mode to repair weak dimensions before live pressure.",
        icon: "plan",
      },
      {
        label: "Live mocks",
        value: String(liveMocks.length),
        copy:
          liveMocks.length > 0
            ? "Live mocks simulate interviewer pressure without leaking solutions."
            : "No live mocks completed yet. Switch to live mode once the answer spine is stable.",
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
            ? "Track-specific reports now keep artifacts, replay actions, and dimension-level scoring."
            : "Reports are generated after a session completes and persist as stable deep links.",
        icon: "report",
      },
    ],
    nextDrillTitle: reportWorkflow
      ? reportWorkflow.status === "failed"
        ? "Recover the failed report run"
        : "Wait for the latest report"
      : nextRecommendedQuestion?.title ??
        latestReport?.practicePlan.steps[0]?.title ??
        `Start a ${input.workspace.activeMode.replace("-", " ")} session`,
    nextDrillDescription: reportWorkflow
      ? reportWorkflow.description
      : nextRecommendedQuestion
        ? `${nextRecommendedQuestion.modeLabel} | ${nextRecommendedQuestion.difficultyLabel} | ${nextRecommendedQuestion.prompt}`
        : latestReport?.practicePlan.steps[0]
          ? `${latestReport.practicePlan.steps[0].drill} ${latestReport.practicePlan.steps[0].outcome}`.trim()
          : "Use the interview room to start a guided drill or live mock.",
    latestSession: input.progressSnapshot
      ? {
          trackLabel: getInterviewModeLabel(input.progressSnapshot.latestSession.track as InterviewMode),
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
    timeline:
      input.progressSnapshot?.timeline.slice(-5).map((point) => ({
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
    nextRecommendedQuestion,
    questionPreview,
    scorecards: buildModeCards(input.reportOverviews),
    practicePlan:
      latestReport?.practicePlan.steps.map((step) => ({
        title: step.title,
        description: `${step.drill} ${step.outcome}`.trim(),
        length: `${step.minutes} min`,
      })) ?? [],
  };
}
