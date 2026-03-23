import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createReportService } from "@/lib/report-service/report-service";
import { createWorkspaceReportStore } from "@/lib/workspace/runtime";

export async function GET() {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const reportService = createReportService(await createWorkspaceReportStore());
  const reports = await reportService.listReportOverviews(user.id);

  return NextResponse.json({
    reports,
  });
}
