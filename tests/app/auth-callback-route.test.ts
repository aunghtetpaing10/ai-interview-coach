import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createSupabaseServerClientMock,
  resolvePostAuthDestinationMock,
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  resolvePostAuthDestinationMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("@/lib/auth/destination", () => ({
  resolvePostAuthDestination: resolvePostAuthDestinationMock,
}));

import { GET } from "@/app/auth/callback/route";

describe("GET /auth/callback", () => {
  beforeEach(() => {
    createSupabaseServerClientMock.mockReset();
    resolvePostAuthDestinationMock.mockReset();
  });

  it("redirects back to sign-in when the auth code is missing", async () => {
    const response = await GET(
      new Request("http://localhost/auth/callback?next=%2Fdashboard"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/sign-in?next=%2Fdashboard&error=oauth_callback_missing_code",
    );
  });

  it("redirects back to sign-in when Supabase auth is not configured", async () => {
    createSupabaseServerClientMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/auth/callback?code=test-code&next=%2Fdashboard"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/sign-in?next=%2Fdashboard&error=supabase_not_configured",
    );
  });

  it("redirects back to sign-in when the code exchange fails", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          error: new Error("exchange failed"),
        }),
      },
    });

    const response = await GET(
      new Request("http://localhost/auth/callback?code=test-code&next=%2Fdashboard"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/sign-in?next=%2Fdashboard&error=oauth_callback_failed",
    );
  });

  it("redirects first-time users to onboarding", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
            },
          },
          error: null,
        }),
      },
    });
    resolvePostAuthDestinationMock.mockResolvedValue("/onboarding");

    const response = await GET(
      new Request("http://localhost/auth/callback?code=test-code&next=%2Fdashboard"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/onboarding");
    expect(resolvePostAuthDestinationMock).toHaveBeenCalledWith("user-1", "/dashboard");
  });

  it("falls back to the workspace when next is unsafe", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-2",
            },
          },
          error: null,
        }),
      },
    });
    resolvePostAuthDestinationMock.mockResolvedValue("/workspace");

    const response = await GET(
      new Request("http://localhost/auth/callback?code=test-code&next=https%3A%2F%2Fevil.example"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/workspace");
    expect(resolvePostAuthDestinationMock).toHaveBeenCalledWith("user-2", "https://evil.example");
  });
});
