import { NextResponse } from "next/server";
import {
  GET as getReportGenerationWorkflow,
  POST as postReportGenerationWorkflow,
} from "../report-generation/route";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

async function unwrapWorkflowResponse(response: NextResponse<unknown>) {
  const payload = await response.json().catch(() => null);
  const body = (() => {
    if (payload && typeof payload === "object") {
      if ("data" in payload) {
        const data = (payload as { data: unknown }).data;
        if (data && typeof data === "object" && "status" in data) {
          const workflow = data as {
            status: string;
            job?: { id?: string | null } | null;
            report?: { id?: string | null } | null;
            failure?: { message?: string | null } | null;
          };
          const reportId = workflow.report?.id ?? undefined;

          return {
            jobId:
              workflow.job?.id ??
              (workflow.status === "completed" ? reportId : undefined),
            status: workflow.status,
            reportId,
            error: workflow.failure?.message ?? undefined,
          };
        }

        return data;
      }

      if ("error" in payload) {
        const errorPayload = (payload as { error?: { code?: string; message?: string } })
          .error;
        if (errorPayload && typeof errorPayload === "object") {
          return {
            error: errorPayload.message ?? "Request failed.",
            code: errorPayload.code ?? "error",
          };
        }
      }
    }

    return payload;
  })();

  return NextResponse.json(body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(request: Request, context: RouteContext) {
  const response = await getReportGenerationWorkflow(request, context);
  return unwrapWorkflowResponse(response);
}

export async function POST(request: Request, context: RouteContext) {
  const response = await postReportGenerationWorkflow(request, context);
  return unwrapWorkflowResponse(response);
}
