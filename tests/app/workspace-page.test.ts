import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import WorkspacePage from "@/app/(workspace)/workspace/page";

describe("workspace route alias", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("redirects /workspace to the canonical dashboard route", async () => {
    await expect(WorkspacePage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });
});
