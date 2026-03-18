import { describe, expect, it } from "vitest";
import { buildAuthActionState, parseFormData, signInSchema } from "@/lib/auth/forms";
import { buildSignInPath, resolvePostAuthPath } from "@/lib/auth/paths";

describe("auth helpers", () => {
  it("sanitizes post-auth redirect targets", () => {
    expect(resolvePostAuthPath("/workspace?tab=sessions")).toBe("/workspace?tab=sessions");
    expect(resolvePostAuthPath("https://example.com/workspace")).toBe("/workspace");
    expect(resolvePostAuthPath(undefined)).toBe("/workspace");
  });

  it("builds a sign-in path with a safe next parameter", () => {
    expect(buildSignInPath("/workspace")).toBe("/sign-in?next=%2Fworkspace");
  });

  it("parses sign-in form data with zod", () => {
    const formData = new FormData();
    formData.set("email", "you@example.com");
    formData.set("password", "password123");

    const parsed = parseFormData(signInSchema, formData);

    expect(parsed.success).toBe(true);
  });

  it("builds a stable auth action state", () => {
    expect(buildAuthActionState("Missing fields", { email: ["invalid"] })).toEqual({
      message: "Missing fields",
      fieldErrors: { email: ["invalid"] },
    });
  });
});
