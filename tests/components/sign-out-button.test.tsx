import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const signOutActionMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/app/(auth)/actions", () => ({
  signOutAction: signOutActionMock,
}));

import { SignOutButton } from "@/components/auth/sign-out-button";

describe("SignOutButton", () => {
  it("renders a submit button bound to the server sign-out action", () => {
    render(<SignOutButton />);

    expect(screen.getByRole("button", { name: /sign out/i })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});
