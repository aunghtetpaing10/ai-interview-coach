import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getEnvMock,
  isE2EDemoModeMock,
  getWorkspaceUserMock,
  createRealtimeOpenAIClientMock,
  createRealtimeClientSecretMock,
  evaluateRateLimitMock,
  getRequestIpMock,
  buildRateLimitResponseMock,
} = vi.hoisted(() => ({
  getEnvMock: vi.fn(),
  isE2EDemoModeMock: vi.fn(),
  getWorkspaceUserMock: vi.fn(),
  createRealtimeOpenAIClientMock: vi.fn(),
  createRealtimeClientSecretMock: vi.fn(),
  evaluateRateLimitMock: vi.fn(),
  getRequestIpMock: vi.fn(),
  buildRateLimitResponseMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  getEnv: getEnvMock,
  isE2EDemoMode: isE2EDemoModeMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceUser: getWorkspaceUserMock,
}));

vi.mock("@/lib/rate-limit/upstash", () => ({
  evaluateRateLimit: evaluateRateLimitMock,
  getRequestIp: getRequestIpMock,
}));

vi.mock("@/lib/rate-limit/http", () => ({
  buildRateLimitResponse: buildRateLimitResponseMock,
}));

vi.mock("@/lib/openai/realtime-session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/openai/realtime-session")>(
    "@/lib/openai/realtime-session",
  );

  return {
    ...actual,
    createRealtimeOpenAIClient: createRealtimeOpenAIClientMock,
    createRealtimeClientSecret: createRealtimeClientSecretMock,
  };
});

import { POST } from "@/app/api/realtime/session/route";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/realtime/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/realtime/session", () => {
  beforeEach(() => {
    getEnvMock.mockReset();
    isE2EDemoModeMock.mockReset();
    getWorkspaceUserMock.mockReset();
    createRealtimeOpenAIClientMock.mockReset();
    createRealtimeClientSecretMock.mockReset();
    evaluateRateLimitMock.mockReset();
    getRequestIpMock.mockReset();
    buildRateLimitResponseMock.mockReset();
    isE2EDemoModeMock.mockReturnValue(false);
    getRequestIpMock.mockReturnValue("198.51.100.20");
    evaluateRateLimitMock.mockResolvedValue({
      policy: "realtime_session",
      mode: "off",
      success: true,
      enforced: false,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: Date.now() + 60_000,
      retryAfterSeconds: 0,
      headers: {},
    });
    buildRateLimitResponseMock.mockImplementation(
      () =>
        new Response(
          JSON.stringify({
            error: {
              code: "rate_limited",
            },
          }),
          {
            status: 429,
            headers: {
              "Retry-After": "30",
            },
          },
        ),
    );
  });

  it("rejects unauthenticated requests", async () => {
    getWorkspaceUserMock.mockResolvedValue(null);
    getEnvMock.mockReturnValue({
      OPENAI_API_KEY: "sk-test",
      OPENAI_REALTIME_MODEL: "gpt-realtime",
    });

    const response = await POST(
      createRequest({
        candidateName: "Aung",
        targetRole: "Backend Software Engineer",
        mode: "system-design",
        focus: "systems",
        openingPrompt: "Start here.",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Authentication required.",
      }),
    );
    expect(createRealtimeClientSecretMock).not.toHaveBeenCalled();
  });

  it("returns a setup error when OpenAI is not configured", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user-1",
      email: "candidate@example.com",
      source: "supabase",
    });
    getEnvMock.mockReturnValue({
      OPENAI_API_KEY: undefined,
      OPENAI_REALTIME_MODEL: "gpt-realtime",
    });

    const response = await POST(
      createRequest({
        candidateName: "Aung",
        targetRole: "Backend Software Engineer",
        mode: "system-design",
        focus: "systems",
        openingPrompt: "Start here.",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "OpenAI Realtime is not configured.",
      }),
    );
    expect(createRealtimeClientSecretMock).not.toHaveBeenCalled();
  });

  it("short-circuits realtime setup in demo mode", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user-1",
      email: "candidate@example.com",
      source: "demo",
    });
    isE2EDemoModeMock.mockReturnValue(true);
    getEnvMock.mockReturnValue({
      OPENAI_API_KEY: "sk-test",
      OPENAI_REALTIME_MODEL: "gpt-realtime",
    });

    const response = await POST(
      createRequest({
        candidateName: "Aung",
        targetRole: "Backend Software Engineer",
        mode: "system-design",
        focus: "systems",
        openingPrompt: "Start here.",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "OpenAI Realtime is disabled in demo mode.",
      }),
    );
    expect(createRealtimeClientSecretMock).not.toHaveBeenCalled();
  });

  it("mints a realtime client secret and returns the effective session", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user-1",
      email: "candidate@example.com",
      source: "supabase",
    });
    getEnvMock.mockReturnValue({
      OPENAI_API_KEY: "sk-test",
      OPENAI_REALTIME_MODEL: "gpt-realtime",
    });
    createRealtimeOpenAIClientMock.mockReturnValue({
      realtime: {
        clientSecrets: {
          create: vi.fn(),
        },
      },
    });
    createRealtimeClientSecretMock.mockResolvedValue({
      value: "ek_test",
      expires_at: 1_700_000_000,
      session: {
        type: "realtime",
        model: "gpt-realtime",
      },
    });

    const response = await POST(
      createRequest({
        candidateName: "Aung",
        targetRole: "Backend Software Engineer",
        mode: "system-design",
        focus: "systems",
        openingPrompt: "Start here.",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        provider: "openai",
        clientSecret: {
          value: "ek_test",
          expiresAt: 1_700_000_000,
        },
        session: {
          type: "realtime",
          model: "gpt-realtime",
        },
      }),
    );
    expect(createRealtimeClientSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        openaiClient: expect.any(Object),
        input: expect.objectContaining({
          candidateName: "Aung",
          targetRole: "Backend Software Engineer",
          mode: "system-design",
        }),
        options: expect.objectContaining({
          model: "gpt-realtime",
        }),
      }),
    );
    expect(createRealtimeOpenAIClientMock).toHaveBeenCalledWith("sk-test");
  });

  it("returns 429 when realtime session rate limiting is enforced", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user-1",
      email: "candidate@example.com",
      source: "supabase",
    });
    evaluateRateLimitMock.mockResolvedValue({
      policy: "realtime_session",
      mode: "enforce",
      success: false,
      enforced: true,
      limit: 6,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
      headers: {
        "Retry-After": "30",
      },
    });

    const response = await POST(
      createRequest({
        candidateName: "Aung",
        targetRole: "Backend Software Engineer",
        mode: "system-design",
        focus: "systems",
        openingPrompt: "Start here.",
      }),
    );

    expect(response.status).toBe(429);
    expect(evaluateRateLimitMock).toHaveBeenCalledWith("realtime_session", {
      ip: "198.51.100.20",
      user: "user-1",
    });
    expect(buildRateLimitResponseMock).toHaveBeenCalledTimes(1);
    expect(createRealtimeClientSecretMock).not.toHaveBeenCalled();
  });

  it("returns field errors for invalid realtime request payloads and keeps rate-limit headers", async () => {
    getWorkspaceUserMock.mockResolvedValue({
      id: "user-1",
      email: "candidate@example.com",
      source: "supabase",
    });
    getEnvMock.mockReturnValue({
      OPENAI_API_KEY: "sk-test",
      OPENAI_REALTIME_MODEL: "gpt-realtime",
    });
    evaluateRateLimitMock.mockResolvedValue({
      policy: "realtime_session",
      mode: "enforce",
      success: true,
      enforced: false,
      limit: 6,
      remaining: 5,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 0,
      headers: {
        "X-RateLimit-Remaining": "5",
      },
    });

    const response = await POST(
      createRequest({
        candidateName: "Aung",
        targetRole: "Backend Software Engineer",
        mode: "system-design",
        openingPrompt: "Start here.",
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("5");
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Invalid realtime session request.",
        fieldErrors: expect.objectContaining({
          focus: expect.any(Array),
        }),
      }),
    );
    expect(createRealtimeClientSecretMock).not.toHaveBeenCalled();
  });
});
