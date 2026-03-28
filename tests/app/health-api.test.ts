import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getEnvMock,
  getReportJobRuntimeConfigMock,
  isE2EDemoModeMock,
  getSqlClientMock,
  sqlUnsafeMock,
  getPostHogTelemetryStatusMock,
  getSentryTelemetryStatusMock,
  getRateLimitTelemetryStatusMock,
} = vi.hoisted(() => ({
  getEnvMock: vi.fn(),
  getReportJobRuntimeConfigMock: vi.fn(),
  isE2EDemoModeMock: vi.fn(),
  getSqlClientMock: vi.fn(),
  sqlUnsafeMock: vi.fn(),
  getPostHogTelemetryStatusMock: vi.fn(),
  getSentryTelemetryStatusMock: vi.fn(),
  getRateLimitTelemetryStatusMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: getEnvMock,
  getReportJobRuntimeConfig: getReportJobRuntimeConfigMock,
  isE2EDemoMode: isE2EDemoModeMock,
}));

vi.mock("@/lib/db/client", () => ({
  getSqlClient: getSqlClientMock,
}));

vi.mock("@/lib/analytics/posthog", () => ({
  getPostHogTelemetryStatus: getPostHogTelemetryStatusMock,
}));

vi.mock("@/lib/observability/sentry", () => ({
  getSentryTelemetryStatus: getSentryTelemetryStatusMock,
}));

vi.mock("@/lib/rate-limit/upstash", () => ({
  getRateLimitTelemetryStatus: getRateLimitTelemetryStatusMock,
}));

import { GET as getHealthRoute } from "@/app/api/health/route";

describe("health api route", () => {
  beforeEach(() => {
    getEnvMock.mockReset();
    getReportJobRuntimeConfigMock.mockReset();
    isE2EDemoModeMock.mockReset();
    getSqlClientMock.mockReset();
    sqlUnsafeMock.mockReset();
    getPostHogTelemetryStatusMock.mockReset();
    getSentryTelemetryStatusMock.mockReset();
    getRateLimitTelemetryStatusMock.mockReset();

    getSqlClientMock.mockReturnValue({
      unsafe: sqlUnsafeMock,
    });
    isE2EDemoModeMock.mockReturnValue(false);
    getPostHogTelemetryStatusMock.mockReturnValue({
      provider: "PostHog",
      enabled: false,
      label: "disabled",
      detail: "disabled",
      nextStep: "configure",
    });
    getSentryTelemetryStatusMock.mockReturnValue({
      provider: "Sentry",
      enabled: false,
      label: "disabled",
      detail: "disabled",
      nextStep: "configure",
      environment: "test",
    });
    getRateLimitTelemetryStatusMock.mockReturnValue({
      provider: "Upstash",
      enabled: false,
      mode: "off",
      label: "disabled",
      detail: "disabled",
      nextStep: "configure",
      window: "1 h",
      limit: 6,
    });
  });

  it("returns healthy dependencies when postgres probe succeeds and report jobs are configured", async () => {
    getEnvMock.mockReturnValue({
      POSTGRES_URL: "postgres://localhost:5432/app",
      INNGEST_EVENT_KEY: "event",
      INNGEST_SIGNING_KEY: "signing",
      OPENAI_API_KEY: "sk-test",
    });
    getReportJobRuntimeConfigMock.mockReturnValue({
      appId: "ai-interview-coach",
      eventKey: "event",
      signingKey: "signing",
      openaiApiKey: "sk-test",
      openaiResponsesModel: "gpt-5.2",
    });
    sqlUnsafeMock.mockResolvedValue([{ ok: 1 }]);

    const response = await getHealthRoute();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(sqlUnsafeMock).toHaveBeenCalledWith("select 1 as ok");
    expect(payload).toMatchObject({
      status: "ok",
      mode: "live",
      dependencies: {
        database: {
          required: true,
          status: "healthy",
        },
        reportJobs: {
          required: true,
          status: "ready",
        },
      },
    });
  });

  it("returns degraded status when postgres readiness probe fails", async () => {
    getEnvMock.mockReturnValue({
      POSTGRES_URL: "postgres://localhost:5432/app",
      INNGEST_EVENT_KEY: undefined,
      INNGEST_SIGNING_KEY: undefined,
      OPENAI_API_KEY: undefined,
    });
    getReportJobRuntimeConfigMock.mockReturnValue(null);
    sqlUnsafeMock.mockRejectedValue(new Error("database unavailable"));

    const response = await getHealthRoute();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      status: "degraded",
      dependencies: {
        database: {
          required: true,
          status: "degraded",
          detail: "database unavailable",
        },
        reportJobs: {
          required: false,
          status: "skipped",
          detail:
            "Set INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY, and OPENAI_API_KEY to enable report jobs.",
        },
      },
    });
  });

  it("skips database and report background checks in demo mode without postgres", async () => {
    getEnvMock.mockReturnValue({
      POSTGRES_URL: undefined,
      INNGEST_EVENT_KEY: undefined,
      INNGEST_SIGNING_KEY: undefined,
      OPENAI_API_KEY: undefined,
    });
    getReportJobRuntimeConfigMock.mockReturnValue(null);
    isE2EDemoModeMock.mockReturnValue(true);

    const response = await getHealthRoute();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getSqlClientMock).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      status: "ok",
      mode: "demo",
      dependencies: {
        database: {
          required: false,
          status: "skipped",
          detail: "POSTGRES_URL is unset, so the app is running without a live database.",
        },
        reportJobs: {
          required: false,
          status: "skipped",
          detail: "Demo mode skips background report jobs.",
        },
      },
    });
  });
});
