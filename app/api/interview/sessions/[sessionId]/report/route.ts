import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createReportService, ReportServiceError } from "@/lib/report-service/report-service";
import { createWorkspaceReportStore } from "@/lib/workspace/runtime";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const reportService = createReportService(await createWorkspaceReportStore());

  try {
    const result = await reportService.generateAndStoreReport(user.id, sessionId);

    return NextResponse.json(
      {
        reportId: result.report.id,
        status: result.status,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ReportServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    throw error;
  }
}
