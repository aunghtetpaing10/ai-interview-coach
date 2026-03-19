import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createPostgresReportStore } from "@/lib/report-service/database-store";
import { createReportService } from "@/lib/report-service/report-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const reportService = createReportService(createPostgresReportStore());
  const report = await reportService.getReportById(user.id, id);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({
    report,
  });
}
