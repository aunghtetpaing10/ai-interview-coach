import * as Sentry from "@sentry/nextjs";

export interface SentryTelemetryStatus {
  provider: "Sentry";
  enabled: boolean;
  label: string;
  detail: string;
  nextStep: string;
  environment: string;
}

export interface ObservabilityBridge {
  enabled: boolean;
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, context?: Record<string, unknown>): void;
  flush(timeoutMs?: number): Promise<boolean>;
}

interface SentrySettings {
  dsn: string | null;
  environment: string;
  tracesSampleRate: number;
}

function readSentrySettings(env: Record<string, string | undefined>): SentrySettings {
  const dsn = env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN ?? null;
  const environment =
    env.SENTRY_ENVIRONMENT ?? env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? env.NODE_ENV ?? "development";
  const tracesSampleRate = Number(env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1");

  return {
    dsn,
    environment,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
  };
}

export function getSentryTelemetryStatus(
  env: Record<string, string | undefined> = process.env,
): SentryTelemetryStatus {
  const settings = readSentrySettings(env);
  const enabled = Boolean(settings.dsn);

  return {
    provider: "Sentry",
    enabled,
    label: enabled ? "Error capture ready" : "Error capture disabled",
    detail: enabled
      ? `Tracing is configured for ${settings.environment}.`
      : "Set SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN to enable exception capture and tracing.",
    nextStep: enabled
      ? "Ready for release monitoring"
      : "Connect SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN to turn on alerts",
    environment: settings.environment,
  };
}

let browserBridgeInitialized = false;

function initializeBrowserBridge(settings: SentrySettings) {
  if (browserBridgeInitialized || typeof window === "undefined" || !settings.dsn) {
    return;
  }

  browserBridgeInitialized = true;
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    tracesSampleRate: settings.tracesSampleRate,
  });
}

export function createSentryBridge(
  env: Record<string, string | undefined> = process.env,
): ObservabilityBridge {
  const settings = readSentrySettings(env);

  if (!settings.dsn) {
    return {
      enabled: false,
      captureException: () => undefined,
      captureMessage: () => undefined,
      flush: async () => false,
    };
  }

  if (typeof window === "undefined") {
    Sentry.init({
      dsn: settings.dsn,
      environment: settings.environment,
      tracesSampleRate: settings.tracesSampleRate,
    });
  } else {
    initializeBrowserBridge(settings);
  }

  return {
    enabled: true,
    captureException: (error, context) => {
      Sentry.captureException(error, {
        extra: context,
      });
    },
    captureMessage: (message, context) => {
      Sentry.captureMessage(message, {
        extra: context,
      });
    },
    flush: async (timeoutMs = 2000) => {
      try {
        await Sentry.flush(timeoutMs);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function captureClientException(
  error: unknown,
  context?: Record<string, unknown>,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const settings = readSentrySettings(process.env);

  if (!settings.dsn) {
    return false;
  }

  initializeBrowserBridge(settings);
  Sentry.captureException(error, {
    extra: context,
  });

  return true;
}
