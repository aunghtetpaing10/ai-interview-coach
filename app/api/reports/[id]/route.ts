import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createReportService } from "@/lib/report-service/report-service";
import { createWorkspaceReportStore } from "@/lib/workspace/runtime";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const reportService = createReportService(await createWorkspaceReportStore());
  const report = await reportService.getReportById(user.id, id);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({
    report,
  });
}
