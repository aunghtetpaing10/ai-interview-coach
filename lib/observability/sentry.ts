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

function readSentrySettings(env: Record<string, string | undefined>) {
  const dsn = env.SENTRY_DSN ?? null;
  const environment = env.SENTRY_ENVIRONMENT ?? env.NODE_ENV ?? "development";
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
      : "Set SENTRY_DSN to enable exception capture and tracing.",
    nextStep: enabled ? "Ready for release monitoring" : "Connect a DSN to turn on alerts",
    environment: settings.environment,
  };
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

  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    tracesSampleRate: settings.tracesSampleRate,
  });

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
