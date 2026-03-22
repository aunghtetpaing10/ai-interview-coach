import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, getSupabaseConfigMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getSupabaseConfigMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: getSupabaseConfigMock,
}));

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

describe("createSupabaseAdminClient", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getSupabaseConfigMock.mockReset();
  });

  it("returns null when the service role key is unavailable", () => {
    getSupabaseConfigMock.mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      serviceRoleKey: null,
    });

    expect(createSupabaseAdminClient()).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("creates a server-only admin client when the service role key is configured", () => {
    const client = { storage: {} };
    createClientMock.mockReturnValue(client);
    getSupabaseConfigMock.mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      serviceRoleKey: "service-role-key",
    });

    expect(createSupabaseAdminClient()).toBe(client);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  });
});
