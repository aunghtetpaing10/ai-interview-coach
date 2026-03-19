import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

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
});
