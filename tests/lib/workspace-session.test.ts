import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClientMock, redirectMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import {
  getWorkspaceUser,
  requireWorkspaceUser,
} from "@/lib/auth/session";

describe("workspace session helpers", () => {
  beforeEach(() => {
    createSupabaseServerClientMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns null when Supabase is not configured", async () => {
    createSupabaseServerClientMock.mockResolvedValue(null);

    await expect(getWorkspaceUser()).resolves.toBeNull();
  });

  it("redirects when auth is required but Supabase is not configured", async () => {
    createSupabaseServerClientMock.mockResolvedValue(null);

    await expect(requireWorkspaceUser("/workspace")).rejects.toThrow(
      "REDIRECT:/sign-in?next=%2Fdashboard",
    );
  });

  it("redirects anonymous users when Supabase is configured but no session exists", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });

    await expect(requireWorkspaceUser("/workspace")).rejects.toThrow(
      "REDIRECT:/sign-in?next=%2Fdashboard",
    );
  });

  it("normalizes a signed-in Supabase user for the workspace layout", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "supabase-user",
              email: "candidate@example.com",
            },
          },
          error: null,
        }),
      },
    });

    await expect(getWorkspaceUser()).resolves.toEqual({
      id: "supabase-user",
      email: "candidate@example.com",
      source: "supabase",
    });
  });
});
