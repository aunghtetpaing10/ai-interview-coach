import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createSupabaseServerClientMock,
  resolvePostAuthDestinationMock,
  revalidateProtectedPathsMock,
  redirectMock,
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  resolvePostAuthDestinationMock: vi.fn(),
  revalidateProtectedPathsMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("@/lib/auth/destination", () => ({
  resolvePostAuthDestination: resolvePostAuthDestinationMock,
}));

vi.mock("@/lib/auth/cache", () => ({
  revalidateProtectedPaths: revalidateProtectedPathsMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import {
  signInAction,
  signOutAction,
  signUpAction,
} from "@/app/(auth)/actions";

function createSignInFormData(next = "/dashboard") {
  const formData = new FormData();
  formData.set("email", "candidate@example.com");
  formData.set("password", "password123");
  formData.set("next", next);
  return formData;
}

function createSignUpFormData(next = "/workspace") {
  const formData = new FormData();
  formData.set("fullName", "Aung Htet Paing");
  formData.set("email", "candidate@example.com");
  formData.set("password", "password123");
  formData.set("next", next);
  return formData;
}

describe("auth actions", () => {
  beforeEach(() => {
    createSupabaseServerClientMock.mockReset();
    resolvePostAuthDestinationMock.mockReset();
    revalidateProtectedPathsMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns field errors when sign-in validation fails", async () => {
    const formData = new FormData();
    formData.set("email", "invalid");
    formData.set("password", "short");

    const state = await signInAction(undefined, formData);

    expect(state).toEqual(
      expect.objectContaining({
        status: "error",
        message: "Check the fields and try again.",
        fieldErrors: expect.objectContaining({
          email: expect.any(Array),
          password: expect.any(Array),
        }),
      }),
    );
  });

  it("redirects signed-in users to the resolved post-auth destination", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
      error: null,
    });

    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signInWithPassword,
      },
    });
    resolvePostAuthDestinationMock.mockResolvedValue("/dashboard");

    await signInAction(undefined, createSignInFormData());

    expect(createSupabaseServerClientMock).toHaveBeenCalledWith({ writeCookies: true });
    expect(resolvePostAuthDestinationMock).toHaveBeenCalledWith("user-1", "/dashboard");
    expect(revalidateProtectedPathsMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("surfaces provider errors during sign-in", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
          error: new Error("Invalid login credentials"),
        }),
      },
    });

    const state = await signInAction(undefined, createSignInFormData());

    expect(state).toEqual({
      status: "error",
      message: "Invalid login credentials",
      fieldErrors: undefined,
    });
  });

  it("returns a confirmation state when sign-up requires email verification", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            session: null,
            user: {
              id: "user-1",
            },
          },
          error: null,
        }),
      },
    });

    const state = await signUpAction(undefined, createSignUpFormData());

    expect(state).toEqual({
      status: "needs_confirmation",
      message: "Check your inbox to confirm the account before signing in.",
      fieldErrors: undefined,
    });
  });

  it("redirects newly created sessions into the post-auth flow", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "token",
            },
            user: {
              id: "user-1",
            },
          },
          error: null,
        }),
      },
    });
    resolvePostAuthDestinationMock.mockResolvedValue("/onboarding");

    await signUpAction(undefined, createSignUpFormData());

    expect(resolvePostAuthDestinationMock).toHaveBeenCalledWith("user-1", "/workspace");
    expect(revalidateProtectedPathsMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  });

  it("signs out and redirects to sign-in", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signOut,
      },
    });

    await signOutAction();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(revalidateProtectedPathsMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });
});
