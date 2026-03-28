import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { getEnv, isE2EDemoMode, isReportJobRuntimeConfigured } from "@/lib/env";
import { enqueueReportGenerationRequestedEvent } from "@/lib/inngest/report-generation";
import { buildRateLimitResponse } from "@/lib/rate-limit/http";
import { evaluateRateLimit, getRequestIp } from "@/lib/rate-limit/upstash";
import {
  createReportService,
  type ReportGenerationWorkflow,
  ReportServiceError,
} from "@/lib/report-service/report-service";
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
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  throw error;
}

function toApiWorkflow(state: ReportGenerationWorkflow) {
  return {
    status: state.status,
    job:
      state.jobId && state.status !== "not_requested"
        ? {
            id: state.jobId,
            attemptCount: 0,
            queuedAt: null,
            startedAt: null,
            finishedAt: null,
          }
        : null,
    report: state.reportId ? { id: state.reportId, href: `/reports/${state.reportId}` } : null,
    failure: state.error ? { message: state.error } : null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Unauthorized." } },
      { status: 401 },
    );
  }

  const { sessionId } = await context.params;
  const reportService = createReportService(await createWorkspaceReportStore());

  try {
    const result = await reportService.getReportGenerationState(user.id, sessionId);

    return NextResponse.json({ data: toApiWorkflow(result) }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Unauthorized." } },
      { status: 401 },
    );
  }
  const rateLimitEvaluation = await evaluateRateLimit("report_generation", {
    ip: getRequestIp(_request),
    user: user.id,
  });
  if (!rateLimitEvaluation.success && rateLimitEvaluation.enforced) {
    return buildRateLimitResponse(rateLimitEvaluation);
  }
  const rateLimitHeaders = rateLimitEvaluation.headers;

  const { sessionId } = await context.params;
  const reportService = createReportService(await createWorkspaceReportStore(), {
    backgroundProcessingAvailable: isBackgroundProcessingAvailable(),
    publishReportGenerationRequestedEvent: async (payload) => {
      await enqueueReportGenerationRequestedEvent(payload);
    },
  });

  try {
    const result = await reportService.requestReportGeneration(user.id, sessionId);

    return NextResponse.json(
      { data: toApiWorkflow(result) },
      {
        status: result.status === "completed" ? 200 : 202,
        headers: rateLimitHeaders,
      },
    );
  } catch (error) {
    const response = toErrorResponse(error);
    for (const [key, value] of Object.entries(rateLimitHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }
}
