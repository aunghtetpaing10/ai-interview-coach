import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  INNGEST_APP_ID: z.string().min(1).default("ai-interview-coach"),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  INNGEST_DEV: z.string().min(1).optional(),
  E2E_DEMO_MODE: z
    .enum(["0", "1"])
    .default("0")
    .transform((value) => value === "1"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  POSTGRES_URL: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_REALTIME_MODEL: z.string().min(1).default("gpt-realtime"),
  OPENAI_RESPONSES_MODEL: z.string().min(1).default("gpt-5.2"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  POSTHOG_KEY: z.string().min(1).optional(),
  POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

function normalizeEnv(input: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (typeof value !== "string") {
        return [key, value];
      }

      const trimmed = value.trim();
      return [key, trimmed === "" ? undefined : trimmed];
    }),
  );
}

export function parseEnv(input: Record<string, string | undefined>): AppEnv {
  const parsed = envSchema.safeParse(normalizeEnv(input));

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
}

export function getEnv() {
  return parseEnv(process.env);
}

export function isE2EDemoMode() {
  return getEnv().E2E_DEMO_MODE;
}

export interface ReportJobRuntimeConfig {
  appId: string;
  eventKey: string;
  signingKey: string;
  openaiResponsesModel: string;
  openaiApiKey: string;
}

export function getReportJobRuntimeConfig(): ReportJobRuntimeConfig | null {
  const env = getEnv();

  if (!env.INNGEST_EVENT_KEY || !env.INNGEST_SIGNING_KEY || !env.OPENAI_API_KEY) {
    return null;
  }

  return {
    appId: env.INNGEST_APP_ID,
    eventKey: env.INNGEST_EVENT_KEY,
    signingKey: env.INNGEST_SIGNING_KEY,
    openaiResponsesModel: env.OPENAI_RESPONSES_MODEL,
    openaiApiKey: env.OPENAI_API_KEY,
  };
}

export function isReportJobRuntimeConfigured() {
  return getReportJobRuntimeConfig() !== null;
}
