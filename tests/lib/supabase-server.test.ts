import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cookieStore,
  cookiesMock,
  createServerClientMock,
  getSupabaseConfigMock,
} = vi.hoisted(() => ({
  cookieStore: {
    getAll: vi.fn(() => []),
    set: vi.fn(),
  },
  cookiesMock: vi.fn(),
  createServerClientMock: vi.fn(),
  getSupabaseConfigMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("server-only", () => ({}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: getSupabaseConfigMock,
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";

describe("createSupabaseServerClient", () => {
  beforeEach(() => {
    cookiesMock.mockResolvedValue(cookieStore);
    cookieStore.getAll.mockReturnValue([]);
    cookieStore.set.mockReset();
    createServerClientMock.mockReset();
    getSupabaseConfigMock.mockReset();
    getSupabaseConfigMock.mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      serviceRoleKey: null,
    });
  });

  it("skips cookie writes by default so server component reads stay safe", async () => {
    let cookieAdapter:
      | {
          getAll: () => unknown[];
          setAll: (cookieValues: Array<{ name: string; value: string; options?: object }>) => void;
        }
      | undefined;

    createServerClientMock.mockImplementation((_url, _anonKey, options) => {
      cookieAdapter = options.cookies;
      return { auth: {} };
    });

    await createSupabaseServerClient();
    cookieAdapter?.setAll([{ name: "sb-access-token", value: "token" }]);

    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("allows cookie writes when called from a mutation context", async () => {
    let cookieAdapter:
      | {
          getAll: () => unknown[];
          setAll: (cookieValues: Array<{ name: string; value: string; options?: object }>) => void;
        }
      | undefined;

    createServerClientMock.mockImplementation((_url, _anonKey, options) => {
      cookieAdapter = options.cookies;
      return { auth: {} };
    });

    await createSupabaseServerClient({ writeCookies: true });
    cookieAdapter?.setAll([
      {
        name: "sb-access-token",
        value: "token",
        options: { path: "/" },
      },
    ]);

    expect(cookieStore.set).toHaveBeenCalledWith(
      "sb-access-token",
      "token",
      { path: "/" },
    );
  });
});
