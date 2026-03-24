import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("report service evaluator construction", () => {
  it(
    "does not construct the evaluator for read-only operations",
    { timeout: 15000 },
    async () => {
      vi.resetModules();

      const createReportEvaluatorForRuntimeMock = vi.fn(() => {
        throw new Error("Evaluator should not be constructed for read-only operations.");
      });

      vi.doMock("@/lib/openai/report-evaluator", () => ({
        createReportEvaluatorForRuntime: createReportEvaluatorForRuntimeMock,
      }));

      const { createReportService } = await import("@/lib/report-service/report-service");

      const store = {
        listReportOverviews: vi.fn().mockResolvedValue([]),
        getReportById: vi.fn().mockResolvedValue(null),
        loadGenerationContext: vi.fn(),
        saveGeneratedReport: vi.fn(),
      };

      const service = createReportService(store);

      await expect(service.listReportOverviews("user-1")).resolves.toEqual([]);
      await expect(service.getReportById("user-1", "report-1")).resolves.toBeNull();
      expect(createReportEvaluatorForRuntimeMock).not.toHaveBeenCalled();
    },
  );
});
