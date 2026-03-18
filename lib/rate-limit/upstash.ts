import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitTelemetryStatus {
  provider: "Upstash";
  enabled: boolean;
  label: string;
  detail: string;
  nextStep: string;
  window: string;
  limit: number;
}

export interface ProgressRateLimiter {
  enabled: boolean;
  limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
    pending: Promise<unknown>;
  }>;
}

function readRateLimitSettings(env: Record<string, string | undefined>) {
  const url = env.UPSTASH_REDIS_REST_URL ?? null;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? null;

  return {
    url,
    token,
    window: "1 h" as const,
    limit: 60,
  };
}

export function getRateLimitTelemetryStatus(
  env: Record<string, string | undefined> = process.env,
): RateLimitTelemetryStatus {
  const settings = readRateLimitSettings(env);
  const enabled = Boolean(settings.url && settings.token);

  return {
    provider: "Upstash",
    enabled,
    label: enabled ? "Quota enforcement ready" : "Quota enforcement disabled",
    detail: enabled
      ? `Requests are budgeted at ${settings.limit} per ${settings.window}.`
      : "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable limits.",
    nextStep: enabled ? "Ready to enforce request budgets" : "Connect Upstash to enforce quotas",
    window: settings.window,
    limit: settings.limit,
  };
}

export function createProgressRateLimiter(
  env: Record<string, string | undefined> = process.env,
): ProgressRateLimiter {
  const settings = readRateLimitSettings(env);

  if (!settings.url || !settings.token) {
    return {
      enabled: false,
      limit: async () => ({
        success: true,
        limit: Number.MAX_SAFE_INTEGER,
        remaining: Number.MAX_SAFE_INTEGER,
        reset: Date.now() + 60_000,
        pending: Promise.resolve(),
      }),
    };
  }

  const redis = new Redis({
    url: settings.url,
    token: settings.token,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(settings.limit, settings.window),
  });

  return {
    enabled: true,
    limit: async (identifier: string) => ratelimit.limit(identifier),
  };
}
