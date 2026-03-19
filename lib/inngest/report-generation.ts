import "server-only";

import type { ReportService } from "@/lib/report-service/report-service";

export interface ReportGenerationQueue {
  enqueueReportGeneration(
    userId: string,
    sessionId: string,
  ): Promise<{ queued: true; sessionId: string }>;
}

export function createReportGenerationQueue(
  reportService: ReportService,
): ReportGenerationQueue {
  return {
    async enqueueReportGeneration(userId, sessionId) {
      setTimeout(() => {
        void reportService.generateAndStoreReport(userId, sessionId).catch((error) => {
          console.error("Report generation failed.", error);
        });
      }, 0);

      return {
        queued: true,
        sessionId,
      };
    },
  };
}
