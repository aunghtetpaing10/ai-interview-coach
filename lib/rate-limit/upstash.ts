import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitMode = "off" | "monitor" | "enforce";
export type RateLimitPolicyName =
  | "sign_in"
  | "sign_up"
  | "realtime_session"
  | "report_generation"
  | "transcript_append";
type RateLimitScope = "ip" | "account" | "user";

export interface RateLimitTelemetryStatus {
  provider: "Upstash";
  enabled: boolean;
  mode: RateLimitMode;
  label: string;
  detail: string;
  nextStep: string;
  window: string;
  limit: number;
}

export interface RateLimitIdentity {
  ip?: string | null;
  account?: string | null;
  user?: string | null;
}

export interface RateLimitEvaluation {
  policy: RateLimitPolicyName;
  mode: RateLimitMode;
  success: boolean;
  enforced: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds: number;
  headers: Record<string, string>;
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

type RateLimitPolicyConfig = {
  [scope in RateLimitScope]?: {
    limit: number;
    window: `${number} ${"s" | "m" | "h" | "d"}`;
  };
};

const RATE_LIMIT_POLICIES: Record<RateLimitPolicyName, RateLimitPolicyConfig> = {
  sign_in: {
    ip: { limit: 10, window: "10 m" },
    account: { limit: 5, window: "10 m" },
  },
  sign_up: {
    ip: { limit: 5, window: "1 h" },
    account: { limit: 3, window: "1 h" },
  },
  realtime_session: {
    ip: { limit: 20, window: "10 m" },
    user: { limit: 6, window: "10 m" },
  },
  report_generation: {
    ip: { limit: 20, window: "1 h" },
    user: { limit: 6, window: "1 h" },
  },
  transcript_append: {
    ip: { limit: 180, window: "5 m" },
    user: { limit: 60, window: "5 m" },
  },
};

function normalizeRateLimitMode(value: string | undefined): RateLimitMode {
  if (value === "monitor" || value === "enforce") {
    return value;
  }

  return "off";
}

function readRateLimitSettings(env: Record<string, string | undefined>) {
  const url = env.UPSTASH_REDIS_REST_URL ?? null;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? null;
  const mode = normalizeRateLimitMode(env.RATE_LIMIT_MODE);
  const namespace = env.RATE_LIMIT_NAMESPACE?.trim() || "aic";

  return {
    url,
    token,
    mode,
    namespace,
  };
}

function getDefaultPolicyWindow() {
  return RATE_LIMIT_POLICIES.report_generation.user?.window ?? "1 h";
}

function getDefaultPolicyLimit() {
  return RATE_LIMIT_POLICIES.report_generation.user?.limit ?? 6;
}

function buildRateLimitHeaders(evaluation: {
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds: number;
  success: boolean;
}) {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(evaluation.limit),
    "X-RateLimit-Remaining": String(Math.max(0, evaluation.remaining)),
    "X-RateLimit-Reset": String(evaluation.reset),
  };

  if (!evaluation.success) {
    headers["Retry-After"] = String(evaluation.retryAfterSeconds);
  }

  return headers;
}

function parseWindowToSeconds(window: string) {
  const [amountRaw, unitRaw] = window.split(" ");
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 60;
  }

  switch (unitRaw) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      return amount * 60;
  }
}

function parseIdentifier(identity: RateLimitIdentity, scope: RateLimitScope) {
  const value = identity[scope]?.trim();
  return value && value.length > 0 ? value : null;
}

export function getForwardedIp(headers: Headers | Record<string, string | undefined>) {
  const raw =
    headers instanceof Headers
      ? headers.get("x-forwarded-for")
      : headers["x-forwarded-for"] ?? headers["X-Forwarded-For"];

  if (!raw) {
    return null;
  }

  const firstHop = raw.split(",")[0]?.trim();
  return firstHop && firstHop.length > 0 ? firstHop : null;
}

export function getRequestIp(request?: Request | null) {
  if (!request) {
    return null;
  }

  return getForwardedIp(request.headers) ?? request.headers.get("x-real-ip") ?? null;
}

export function getRateLimitTelemetryStatus(
  env: Record<string, string | undefined> = process.env,
): RateLimitTelemetryStatus {
  const settings = readRateLimitSettings(env);
  const enabled = Boolean(settings.url && settings.token);
  const modeLabel =
    settings.mode === "off"
      ? "off"
      : settings.mode === "monitor"
        ? "monitor"
        : "enforce";

  return {
    provider: "Upstash",
    enabled,
    mode: settings.mode,
    label: enabled
      ? settings.mode === "enforce"
        ? "Quota enforcement active"
        : "Quota telemetry active"
      : "Quota enforcement disabled",
    detail: enabled
      ? `Rate limit mode is ${modeLabel}. Default policy is ${getDefaultPolicyLimit()} per ${getDefaultPolicyWindow()}.`
      : "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable limits.",
    nextStep: enabled
      ? settings.mode === "off"
        ? "Set RATE_LIMIT_MODE=monitor or enforce to apply policies"
        : "Ready to enforce request budgets"
      : "Connect Upstash to enforce quotas",
    window: getDefaultPolicyWindow(),
    limit: getDefaultPolicyLimit(),
  };
}

export async function evaluateRateLimit(
  policy: RateLimitPolicyName,
  identity: RateLimitIdentity,
  env: Record<string, string | undefined> = process.env,
): Promise<RateLimitEvaluation> {
  const settings = readRateLimitSettings(env);
  const policyConfig = RATE_LIMIT_POLICIES[policy];
  const fallbackReset = Date.now() + 60_000;

  if (!settings.url || !settings.token || settings.mode === "off") {
    const headers = buildRateLimitHeaders({
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: fallbackReset,
      retryAfterSeconds: 0,
      success: true,
    });

    return {
      policy,
      mode: settings.mode,
      success: true,
      enforced: false,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: fallbackReset,
      retryAfterSeconds: 0,
      headers,
    };
  }

  const redis = new Redis({
    url: settings.url,
    token: settings.token,
  });
  let success = true;
  let remaining = Number.MAX_SAFE_INTEGER;
  let limit = Number.MAX_SAFE_INTEGER;
  let reset = fallbackReset;
  let retryAfterSeconds = 0;
  let evaluatedScopes = 0;

  for (const [scopeKey, config] of Object.entries(policyConfig)) {
    const scope = scopeKey as RateLimitScope;
    if (!config) {
      continue;
    }

    const identifier = parseIdentifier(identity, scope);
    if (!identifier) {
      continue;
    }

    evaluatedScopes += 1;
    const ratelimit = new Ratelimit({
      redis,
      prefix: `${settings.namespace}:${policy}:${scope}`,
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
    });
    const result = await ratelimit.limit(identifier);

    limit = Math.min(limit, result.limit);
    remaining = Math.min(remaining, result.remaining);
    reset = Math.max(reset, result.reset);

    if (!result.success) {
      success = false;
      retryAfterSeconds = Math.max(
        retryAfterSeconds,
        Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      );
    }
  }

  if (evaluatedScopes === 0) {
    const headers = buildRateLimitHeaders({
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: fallbackReset,
      retryAfterSeconds: 0,
      success: true,
    });

    return {
      policy,
      mode: settings.mode,
      success: true,
      enforced: false,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: fallbackReset,
      retryAfterSeconds: 0,
      headers,
    };
  }

  const effectiveLimit = Number.isFinite(limit) ? limit : Number.MAX_SAFE_INTEGER;
  const effectiveRemaining = Number.isFinite(remaining)
    ? remaining
    : Number.MAX_SAFE_INTEGER;
  const headers = buildRateLimitHeaders({
    limit: effectiveLimit,
    remaining: effectiveRemaining,
    reset,
    retryAfterSeconds,
    success,
  });

  return {
    policy,
    mode: settings.mode,
    success,
    enforced: !success && settings.mode === "enforce",
    limit: effectiveLimit,
    remaining: effectiveRemaining,
    reset,
    retryAfterSeconds,
    headers,
  };
}

export function createProgressRateLimiter(
  env: Record<string, string | undefined> = process.env,
): ProgressRateLimiter {
  const settings = readRateLimitSettings(env);
  const fallbackReset = Date.now() + 60_000;

  if (!settings.url || !settings.token) {
    return {
      enabled: false,
      limit: async () => ({
        success: true,
        limit: Number.MAX_SAFE_INTEGER,
        remaining: Number.MAX_SAFE_INTEGER,
        reset: fallbackReset,
        pending: Promise.resolve(),
      }),
    };
  }

  const policy = RATE_LIMIT_POLICIES.report_generation.user ?? {
    limit: 6,
    window: "1 h",
  };
  const ratelimit = new Ratelimit({
    redis: new Redis({
      url: settings.url,
      token: settings.token,
    }),
    prefix: `${settings.namespace}:progress`,
    limiter: Ratelimit.slidingWindow(policy.limit, policy.window),
    timeout: parseWindowToSeconds(policy.window) * 1_000,
  });

  return {
    enabled: true,
    limit: async (identifier: string) => ratelimit.limit(identifier),
  };
}
