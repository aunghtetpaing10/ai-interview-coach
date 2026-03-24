import "server-only";

import { z } from "zod";
import type { ReportGenerationStatus as DatabaseReportGenerationStatus } from "@/db/schema";
import { inngest } from "@/lib/inngest/client";
import { createReportEvaluatorForRuntime } from "@/lib/openai/report-evaluator";
import { createReportService } from "@/lib/report-service/report-service";
import { createWorkspaceReportStore } from "@/lib/workspace/runtime";

export const REPORT_GENERATION_EVENT_NAME = "report/generation.requested" as const;

export const REPORT_GENERATION_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const satisfies readonly DatabaseReportGenerationStatus[];

export type ReportGenerationStatus = DatabaseReportGenerationStatus;

export const reportGenerationRequestedEventSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  reportJobId: z.string().min(1).optional(),
});

export type ReportGenerationRequestedEvent = z.infer<
  typeof reportGenerationRequestedEventSchema
>;

export async function enqueueReportGenerationRequestedEvent(
  payload: ReportGenerationRequestedEvent,
) {
  const parsedPayload = reportGenerationRequestedEventSchema.parse(payload);
  const response = await inngest.send({
    name: REPORT_GENERATION_EVENT_NAME,
    data: parsedPayload,
  });

  if (response.ids.length === 0) {
    throw new Error("Inngest did not accept the report generation event.");
  }

  return response.ids[0];
}

export const reportGenerationFunction = inngest.createFunction(
  {
    id: "report-generation",
    name: "Generate interview report",
    retries: 2,
    triggers: [{ event: REPORT_GENERATION_EVENT_NAME }],
  },
  async ({
    event,
    attempt,
    maxAttempts,
  }: {
    event: { data: unknown };
    attempt: number;
    maxAttempts?: number;
  }) => {
    const payload = reportGenerationRequestedEventSchema.parse(event.data);
    const reportStore = await createWorkspaceReportStore();
    const reportService = createReportService(reportStore, {
      evaluator: createReportEvaluatorForRuntime(),
    });

    return reportService.processQueuedReportGeneration({
      userId: payload.userId,
      sessionId: payload.sessionId,
      reportJobId: payload.reportJobId,
      attemptCount: attempt + 1,
      maxAttempts,
    });
  },
);
