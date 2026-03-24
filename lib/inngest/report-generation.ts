import { z } from "zod";
import type { ReportGenerationStatus as DatabaseReportGenerationStatus } from "@/db/schema";

export const REPORT_GENERATION_EVENT_NAME = "report/generation.requested" as const;

export const REPORT_GENERATION_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const satisfies readonly DatabaseReportGenerationStatus[];

export type ReportGenerationStatus = DatabaseReportGenerationStatus;

export const reportGenerationRequestedEventSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  reportJobId: z.string().uuid().optional(),
});

export type ReportGenerationRequestedEvent = z.infer<
  typeof reportGenerationRequestedEventSchema
>;
