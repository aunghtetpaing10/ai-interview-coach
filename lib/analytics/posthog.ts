import { PostHog } from "posthog-node";

export interface AnalyticsEvent {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}

export interface PostHogTelemetryStatus {
  provider: "PostHog";
  enabled: boolean;
  label: string;
  detail: string;
  nextStep: string;
  host: string;
}

export interface AnalyticsReporter {
  enabled: boolean;
  capture(event: AnalyticsEvent): Promise<void>;
  identify(distinctId: string, properties?: Record<string, unknown>): Promise<void>;
  flush(): Promise<void>;
}

function readPostHogSettings(env: Record<string, string | undefined>) {
  const key = env.POSTHOG_KEY ?? env.NEXT_PUBLIC_POSTHOG_KEY ?? null;
  const host = env.POSTHOG_HOST ?? env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  return {
    key,
    host,
  };
}

export function getPostHogTelemetryStatus(
  env: Record<string, string | undefined> = process.env,
): PostHogTelemetryStatus {
  const settings = readPostHogSettings(env);
  const enabled = Boolean(settings.key);

  return {
    provider: "PostHog",
    enabled,
    label: enabled ? "Tracking ready" : "Tracking disabled",
    detail: enabled
      ? `Events will stream to ${settings.host}.`
      : "Set POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_KEY to enable event capture.",
    nextStep: enabled ? "Ready for session analytics" : "Connect a key to turn on product analytics",
    host: settings.host,
  };
}

function createNoopReporter(): AnalyticsReporter {
  return {
    enabled: false,
    capture: async () => undefined,
    identify: async () => undefined,
    flush: async () => undefined,
  };
}

export function createPostHogReporter(
  env: Record<string, string | undefined> = process.env,
): AnalyticsReporter {
  const settings = readPostHogSettings(env);

  if (!settings.key) {
    return createNoopReporter();
  }

  const client = new PostHog(settings.key, {
    host: settings.host,
  });

  return {
    enabled: true,
    capture: async ({ distinctId, event, properties }) => {
      client.capture({
        distinctId,
        event,
        properties,
      });
    },
    identify: async (distinctId, properties) => {
      client.identify({
        distinctId,
        properties,
      });
    },
    flush: async () => {
      await client.flush();
    },
  };
}
