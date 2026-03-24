import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { ReportProcessingPanel } from "@/components/reports/report-processing-panel";
import { CandidateShell } from "@/components/workspace/candidate-shell";
import { createReportService, ReportServiceError } from "@/lib/report-service/report-service";
import {
  createWorkspaceInterviewRepository,
  createWorkspaceReportStore,
} from "@/lib/workspace/runtime";

export const dynamic = "force-dynamic";

type ProcessingPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ReportProcessingPage({
  params,
}: ProcessingPageProps) {
  const user = await requireWorkspaceUser("/reports");
  const { sessionId } = await params;
  const repository = await createWorkspaceInterviewRepository();
  const reportService = createReportService(await createWorkspaceReportStore());
  const workspace = await repository.getWorkspaceSnapshot(user.id);
  const userLabel = workspace.profile?.fullName ?? user.email ?? "Candidate";

  const state = await reportService
    .getReportGenerationState(user.id, sessionId)
    .catch((error) => {
      if (
        error instanceof ReportServiceError &&
        (error.code === "not_found" || error.code === "invalid_state")
      ) {
        return null;
      }

      throw error;
    });

  if (!state) {
    redirect("/reports");
  }

  if (state.status === "completed" && state.reportId) {
    redirect(`/reports/${state.reportId}`);
  }

  return (
    <CandidateShell
      activeHref="/reports"
      userLabel={userLabel}
      headline="Follow the background report job from queue to completion without leaving the signed-in workspace."
      railNote="The latest completed session now routes through a processing page until the background report job publishes a stable report."
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_360px]">
        <ReportProcessingPanel sessionId={sessionId} initialState={state} />
      </section>
    </CandidateShell>
  );
}
