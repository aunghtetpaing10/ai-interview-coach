import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getEnvMock,
  getWorkspaceUserMock,
  createRealtimeOpenAIClientMock,
  createRealtimeClientSecretMock,
} = vi.hoisted(() => ({
  getEnvMock: vi.fn(),
  getWorkspaceUserMock: vi.fn(),
  createRealtimeOpenAIClientMock: vi.fn(),
  createRealtimeClientSecretMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  getEnv: getEnvMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceUser: getWorkspaceUserMock,
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
    getWorkspaceUserMock.mockReset();
    createRealtimeOpenAIClientMock.mockReset();
    createRealtimeClientSecretMock.mockReset();
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
});
