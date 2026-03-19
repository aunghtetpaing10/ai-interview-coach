import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createPostgresReportStore } from "@/lib/report-service/database-store";
import { createReportService } from "@/lib/report-service/report-service";
import { createReportGenerationQueue } from "@/lib/inngest/report-generation";

export async function POST(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const reportService = createReportService(createPostgresReportStore());
  const queue = createReportGenerationQueue(reportService);
  const result = await queue.enqueueReportGeneration(user.id, sessionId);

  return NextResponse.json(result, { status: 202 });
}
