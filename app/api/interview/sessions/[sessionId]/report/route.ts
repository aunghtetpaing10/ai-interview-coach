import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { getEnv, isE2EDemoMode, isReportJobRuntimeConfigured } from "@/lib/env";
import { enqueueReportGenerationRequestedEvent } from "@/lib/inngest/report-generation";
import { createReportService, ReportServiceError } from "@/lib/report-service/report-service";
import { createWorkspaceReportStore } from "@/lib/workspace/runtime";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

function isBackgroundProcessingAvailable() {
  if (isE2EDemoMode() || getEnv().NODE_ENV === "test") {
    return true;
  }

  return isReportJobRuntimeConfigured();
}

function toErrorResponse(error: unknown) {
  if (error instanceof ReportServiceError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  throw error;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const reportService = createReportService(await createWorkspaceReportStore());

  try {
    const result = await reportService.getReportGenerationState(user.id, sessionId);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const reportService = createReportService(await createWorkspaceReportStore(), {
    backgroundProcessingAvailable: isBackgroundProcessingAvailable(),
    publishReportGenerationRequestedEvent: async (payload) => {
      await enqueueReportGenerationRequestedEvent(payload);
    },
  });

  try {
    const result = await reportService.requestReportGeneration(user.id, sessionId);

    return NextResponse.json(result, {
      status: result.status === "completed" ? 200 : 202,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
