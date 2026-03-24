import { describe, expect, it } from "vitest";
import {
  getReportJobRuntimeConfig,
  isReportJobRuntimeConfigured,
  parseEnv,
} from "@/lib/env";

describe("parseEnv", () => {
  it("uses safe defaults for local development", () => {
    const env = parseEnv({});

    expect(env.NODE_ENV).toBe("development");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(env.OPENAI_REALTIME_MODEL).toBe("gpt-realtime");
    expect(env.OPENAI_RESPONSES_MODEL).toBe("gpt-5.2");
  });

  it("rejects invalid URLs", () => {
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_APP_URL: "not-a-url",
      }),
    ).toThrow(/Invalid environment configuration/);
  });

  it("treats blank optional variables as unset", () => {
    const env = parseEnv({
      POSTGRES_URL: "   ",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: " ",
      OPENAI_API_KEY: "",
    });

    expect(env.POSTGRES_URL).toBeUndefined();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBeUndefined();
  });

  it("parses demo mode as a boolean flag", () => {
    expect(parseEnv({ E2E_DEMO_MODE: "1" }).E2E_DEMO_MODE).toBe(true);
    expect(parseEnv({ E2E_DEMO_MODE: "0" }).E2E_DEMO_MODE).toBe(false);
  });

  it("returns null report job runtime config until all required variables exist", () => {
    const previous = {
      INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
      INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    };

    process.env.INNGEST_EVENT_KEY = "event-key";
    delete process.env.INNGEST_SIGNING_KEY;
    delete process.env.OPENAI_API_KEY;

    expect(getReportJobRuntimeConfig()).toBeNull();
    expect(isReportJobRuntimeConfigured()).toBe(false);

    process.env.INNGEST_EVENT_KEY = previous.INNGEST_EVENT_KEY;
    process.env.INNGEST_SIGNING_KEY = previous.INNGEST_SIGNING_KEY;
    process.env.OPENAI_API_KEY = previous.OPENAI_API_KEY;
  });

  it("recognizes when the report job runtime is fully configured", () => {
    const previous = {
      INNGEST_APP_ID: process.env.INNGEST_APP_ID,
      INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
      INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_RESPONSES_MODEL: process.env.OPENAI_RESPONSES_MODEL,
    };

    process.env.INNGEST_APP_ID = "ai-interview-coach";
    process.env.INNGEST_EVENT_KEY = "event-key";
    process.env.INNGEST_SIGNING_KEY = "signing-key";
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.OPENAI_RESPONSES_MODEL = "gpt-5.2";

    const config = getReportJobRuntimeConfig();

    expect(config).toEqual({
      appId: "ai-interview-coach",
      eventKey: "event-key",
      signingKey: "signing-key",
      openaiApiKey: "openai-key",
      openaiResponsesModel: "gpt-5.2",
    });
    expect(isReportJobRuntimeConfigured()).toBe(true);

    process.env.INNGEST_APP_ID = previous.INNGEST_APP_ID;
    process.env.INNGEST_EVENT_KEY = previous.INNGEST_EVENT_KEY;
    process.env.INNGEST_SIGNING_KEY = previous.INNGEST_SIGNING_KEY;
    process.env.OPENAI_API_KEY = previous.OPENAI_API_KEY;
    process.env.OPENAI_RESPONSES_MODEL = previous.OPENAI_RESPONSES_MODEL;
  });
});
