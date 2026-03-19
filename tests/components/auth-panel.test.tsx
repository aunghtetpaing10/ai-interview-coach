import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  useActionStateMock,
  createSupabaseBrowserClientMock,
  signInWithOAuthMock,
} = vi.hoisted(() => ({
  useActionStateMock: vi.fn(),
  createSupabaseBrowserClientMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useActionState: useActionStateMock,
  };
});

vi.mock("@/app/(auth)/actions", () => ({
  signInAction: vi.fn(),
  signUpAction: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: createSupabaseBrowserClientMock,
}));

import {
  SignInPanel,
  SignUpPanel,
} from "@/app/(auth)/_components/auth-panel";

describe("auth panels", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useActionStateMock.mockReset();
    createSupabaseBrowserClientMock.mockReset();
    signInWithOAuthMock.mockReset();
    useActionStateMock.mockImplementation(() => [undefined, vi.fn(), false]);
    createSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        signInWithOAuth: signInWithOAuthMock.mockResolvedValue({
          data: { url: "https://accounts.google.com/o/oauth2/v2/auth" },
          error: null,
        }),
      },
    });
  });

  it("preserves the next path and surfaces callback errors on sign-in", () => {
    render(
      <SignInPanel
        nextPath="/dashboard"
        initialMessage="Google sign-in could not be completed. Try again."
      />,
    );

    expect(
      screen.getByText(/Google sign-in could not be completed\. Try again\./i),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("/dashboard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toHaveAttribute(
      "type",
      "submit",
    );
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute(
      "href",
      "/sign-up?next=%2Fdashboard",
    );
  });

  it("starts Google OAuth with the callback URL and safe next path", async () => {
    const user = userEvent.setup();

    render(<SignInPanel nextPath="/dashboard" />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/auth/callback?next=%2Fdashboard",
      },
    });
  });

  it("shows confirmation state and preserves next on sign-up", () => {
    useActionStateMock.mockImplementationOnce(() => [
      {
        status: "needs_confirmation",
        message: "Check your inbox to confirm the account before signing in.",
      },
      vi.fn(),
      false,
    ]);

    render(<SignUpPanel nextPath="/reports" />);

    expect(
      screen.getByText(/check your inbox to confirm the account before signing in\./i),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("/reports")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toHaveAttribute(
      "type",
      "submit",
    );
    expect(screen.getByRole("link", { name: /^sign in$/i })).toHaveAttribute(
      "href",
      "/sign-in?next=%2Freports",
    );
  });
});
