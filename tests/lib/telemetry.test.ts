import { describe, expect, it } from "vitest";
import { createPostHogReporter, getPostHogTelemetryStatus } from "@/lib/analytics/posthog";
import { createSentryBridge, getSentryTelemetryStatus } from "@/lib/observability/sentry";
import {
  createProgressRateLimiter,
  getRateLimitTelemetryStatus,
} from "@/lib/rate-limit/upstash";

describe("telemetry wrappers", () => {
  it("falls back to no-op analytics when PostHog is not configured", async () => {
    const reporter = createPostHogReporter({});

    expect(reporter.enabled).toBe(false);
    await expect(
      reporter.capture({
        distinctId: "candidate-1",
        event: "progress_viewed",
      }),
    ).resolves.toBeUndefined();
    expect(getPostHogTelemetryStatus({}).enabled).toBe(false);
  });

  it("reports Sentry and Upstash as disabled when credentials are missing", async () => {
    const sentry = createSentryBridge({});
    const limiter = createProgressRateLimiter({});

    expect(sentry.enabled).toBe(false);
    expect(getSentryTelemetryStatus({}).enabled).toBe(false);
    expect(getRateLimitTelemetryStatus({}).enabled).toBe(false);
    await expect(limiter.limit("candidate-1")).resolves.toEqual(
      expect.objectContaining({
        success: true,
      }),
    );
  });

  it("marks the wrappers as enabled when configuration is present", () => {
    expect(
      getPostHogTelemetryStatus({
        POSTHOG_KEY: "phc_test",
        POSTHOG_HOST: "https://us.i.posthog.com",
      }).enabled,
    ).toBe(true);

    expect(
      getSentryTelemetryStatus({
        SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        SENTRY_ENVIRONMENT: "production",
      }).enabled,
    ).toBe(true);

    expect(
      getRateLimitTelemetryStatus({
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "secret",
      }).enabled,
    ).toBe(true);
  });
});
