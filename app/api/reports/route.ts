import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createPostgresReportStore } from "@/lib/report-service/database-store";
import { createReportService } from "@/lib/report-service/report-service";

export async function GET() {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const reportService = createReportService(createPostgresReportStore());
  const reports = await reportService.listReportOverviews(user.id);

  return NextResponse.json({
    reports,
  });
}
