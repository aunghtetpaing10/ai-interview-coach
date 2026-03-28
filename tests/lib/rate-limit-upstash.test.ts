import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  ratelimitLimitMock,
  ratelimitConstructorMock,
  slidingWindowMock,
  redisConstructorMock,
} = vi.hoisted(() => {
  const ratelimitLimitMock = vi.fn();
  const ratelimitConstructorMock = vi.fn(function RatelimitMock(
    config: unknown,
  ) {
    return {
      limit: (identifier: string) => ratelimitLimitMock(config, identifier),
    };
  });
  const slidingWindowMock = vi.fn((limit: number, window: string) => ({
    kind: "sliding-window",
    limit,
    window,
  }));
  const redisConstructorMock = vi.fn(function RedisMock() {
    return {};
  });

  return {
    ratelimitLimitMock,
    ratelimitConstructorMock,
    slidingWindowMock,
    redisConstructorMock,
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: redisConstructorMock,
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(ratelimitConstructorMock, {
    slidingWindow: slidingWindowMock,
  }),
}));

import {
  createProgressRateLimiter,
  evaluateRateLimit,
  getForwardedIp,
  getRateLimitTelemetryStatus,
  getRequestIp,
} from "@/lib/rate-limit/upstash";

describe("upstash rate-limit helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T00:00:00.000Z"));
    ratelimitLimitMock.mockReset();
    ratelimitConstructorMock.mockClear();
    slidingWindowMock.mockClear();
    redisConstructorMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses forwarded IP values from Headers and records", () => {
    expect(
      getForwardedIp(
        new Headers({
          "x-forwarded-for": "198.51.100.12, 203.0.113.9",
        }),
      ),
    ).toBe("198.51.100.12");

    expect(
      getForwardedIp({
        "X-Forwarded-For": " 203.0.113.15 ",
      }),
    ).toBe("203.0.113.15");

    expect(getForwardedIp({})).toBeNull();
  });

  it("falls back to x-real-ip when forwarded headers are absent", () => {
    const request = new Request("http://localhost/test", {
      headers: {
        "x-real-ip": "203.0.113.42",
      },
    });

    expect(getRequestIp(request)).toBe("203.0.113.42");
    expect(getRequestIp(null)).toBeNull();
  });

  it("reports telemetry state for disabled, monitor, and enforce modes", () => {
    expect(getRateLimitTelemetryStatus({})).toMatchObject({
      enabled: false,
      mode: "off",
      label: "Quota enforcement disabled",
    });

    expect(
      getRateLimitTelemetryStatus({
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "secret",
        RATE_LIMIT_MODE: "monitor",
      }),
    ).toMatchObject({
      enabled: true,
      mode: "monitor",
      label: "Quota telemetry active",
    });

    expect(
      getRateLimitTelemetryStatus({
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "secret",
        RATE_LIMIT_MODE: "enforce",
      }),
    ).toMatchObject({
      enabled: true,
      mode: "enforce",
      label: "Quota enforcement active",
    });
  });

  it("bypasses quota evaluation when mode is off", async () => {
    const result = await evaluateRateLimit(
      "sign_in",
      {
        ip: "198.51.100.20",
        account: "candidate@example.com",
      },
      {
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "secret",
        RATE_LIMIT_MODE: "off",
      },
    );

    expect(result).toMatchObject({
      success: true,
      enforced: false,
      mode: "off",
      retryAfterSeconds: 0,
    });
    expect(ratelimitConstructorMock).not.toHaveBeenCalled();
  });

  it("tracks failures in monitor mode without enforcing request rejection", async () => {
    const now = Date.now();
    ratelimitLimitMock.mockImplementation((config: { prefix: string }) => {
      if (config.prefix.endsWith(":ip")) {
        return Promise.resolve({
          success: false,
          limit: 10,
          remaining: 0,
          reset: now + 30_000,
        });
      }

      return Promise.resolve({
        success: true,
        limit: 5,
        remaining: 4,
        reset: now + 10_000,
      });
    });

    const result = await evaluateRateLimit(
      "sign_in",
      {
        ip: "198.51.100.30",
        account: "candidate@example.com",
      },
      {
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "secret",
        RATE_LIMIT_MODE: "monitor",
        RATE_LIMIT_NAMESPACE: "test",
      },
    );

    expect(result).toMatchObject({
      policy: "sign_in",
      mode: "monitor",
      success: false,
      enforced: false,
      limit: 5,
      remaining: 0,
      retryAfterSeconds: 30,
    });
    expect(result.headers).toMatchObject({
      "X-RateLimit-Limit": "5",
      "X-RateLimit-Remaining": "0",
      "Retry-After": "30",
    });
    expect(redisConstructorMock).toHaveBeenCalledTimes(1);
    expect(ratelimitConstructorMock).toHaveBeenCalledTimes(2);
    expect(slidingWindowMock).toHaveBeenCalledWith(10, "10 m");
    expect(slidingWindowMock).toHaveBeenCalledWith(5, "10 m");
  });

  it("enforces failures when mode is enforce", async () => {
    const now = Date.now();
    ratelimitLimitMock.mockResolvedValue({
      success: false,
      limit: 6,
      remaining: 0,
      reset: now + 61_000,
    });

    const result = await evaluateRateLimit(
      "report_generation",
      {
        user: "user-1",
      },
      {
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "secret",
        RATE_LIMIT_MODE: "enforce",
      },
    );

    expect(result).toMatchObject({
      policy: "report_generation",
      mode: "enforce",
      success: false,
      enforced: true,
      retryAfterSeconds: 61,
    });
  });

  it("returns a no-op success result when no valid identifiers are provided", async () => {
    const result = await evaluateRateLimit(
      "transcript_append",
      {
        ip: " ",
        user: "",
      },
      {
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "secret",
        RATE_LIMIT_MODE: "enforce",
      },
    );

    expect(result).toMatchObject({
      success: true,
      enforced: false,
      retryAfterSeconds: 0,
    });
    expect(ratelimitConstructorMock).not.toHaveBeenCalled();
  });

  it("creates an enabled progress limiter when Upstash credentials exist", async () => {
    const pending = Promise.resolve("ok");
    ratelimitLimitMock.mockResolvedValue({
      success: true,
      limit: 6,
      remaining: 5,
      reset: Date.now() + 3_600_000,
      pending,
    });

    const limiter = createProgressRateLimiter({
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "secret",
      RATE_LIMIT_NAMESPACE: "scope",
    });
    const result = await limiter.limit("candidate-1");

    expect(limiter.enabled).toBe(true);
    expect(result).toMatchObject({
      success: true,
      limit: 6,
      remaining: 5,
    });
    expect(result.pending).toBe(pending);
    expect(ratelimitConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prefix: "scope:progress",
        timeout: 3_600_000,
      }),
    );
    expect(slidingWindowMock).toHaveBeenCalledWith(6, "1 h");
  });
});
