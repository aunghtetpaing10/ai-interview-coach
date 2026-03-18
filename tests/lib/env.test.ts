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
});
