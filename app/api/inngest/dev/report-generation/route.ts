import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv, isE2EDemoMode } from "@/lib/env";
import { createReportService, ReportServiceError } from "@/lib/report-service/report-service";
import { createWorkspaceReportStore } from "@/lib/workspace/runtime";

export const runtime = "nodejs";

const requestBodySchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  reportJobId: z.string().min(1).optional(),
  attemptCount: z.number().int().min(1),
  maxAttempts: z.number().int().min(1).max(10).default(3),
});

function isDevWorkerRouteEnabled() {
  const env = getEnv();

  return env.NODE_ENV === "test" || isE2EDemoMode() || Boolean(env.INNGEST_DEV);
}

export async function POST(request: Request) {
  if (!isDevWorkerRouteEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const parsedBody = requestBodySchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid request body.",
        details: parsedBody.error.flatten(),
      },
      { status: 400 },
    );
  }

  const reportService = createReportService(await createWorkspaceReportStore());

  try {
    const state = await reportService.processQueuedReportGeneration(parsedBody.data);

    return NextResponse.json(
      {
        state,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ReportServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error ? error.message : "Report generation failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
