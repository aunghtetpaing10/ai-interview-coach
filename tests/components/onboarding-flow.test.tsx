import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useActionStateMock } = vi.hoisted(() => ({
  useActionStateMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useActionState: useActionStateMock,
  };
});

vi.mock("@/app/onboarding/actions", () => ({
  submitOnboardingDraft: vi.fn(),
}));

vi.mock("@/components/intake/summary-panel", () => ({
  SummaryPanel: () => <div data-testid="summary-panel" />,
}));

import { OnboardingFlow } from "@/components/intake/onboarding-flow";
import { createInitialOnboardingState } from "@/lib/intake/state";

describe("OnboardingFlow", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useActionStateMock.mockReset();
  });

  it("renders submitted values after a failed save instead of resetting to the initial draft", () => {
    const initialState = createInitialOnboardingState({
      roleTitle: "Initial role",
      seniority: "junior",
      companyType: "startup",
      focusAreas: ["apis"],
      companyName: "Initial company",
      jobTitle: "Initial title",
      jobUrl: "https://example.com/initial",
      jobDescription:
        "Initial description that is long enough to satisfy the onboarding draft requirements.",
      resumeNotes: "Initial resume notes",
      resumePreview: {
        source: "paste",
        fileName: "Pasted resume notes",
        kind: "txt",
        sizeLabel: "Inline notes",
        supported: true,
        summary: "Initial resume notes",
      },
    });

    useActionStateMock.mockReturnValue([
      {
        ...initialState,
        status: "error",
        message: "Paste at least a short job description.",
        formValues: {
          roleTitle: "Typed role",
          seniority: "staff",
          companyType: "enterprise",
          focusAreas: "systems, leadership",
          companyName: "Typed company",
          jobTitle: "Typed title",
          jobUrl: "https://example.com/typed",
          jobDescription: "",
          resumeNotes: "Typed resume notes",
        },
        fieldErrors: {
          jobDescription: "Paste at least a short job description.",
        },
      },
      vi.fn(),
      false,
    ]);

    render(<OnboardingFlow initialState={initialState} />);

    expect(screen.getByDisplayValue("Typed role")).toBeInTheDocument();
    expect(screen.getByDisplayValue("systems, leadership")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Typed company")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Typed title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/typed")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Typed resume notes")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Initial role")).not.toBeInTheDocument();
  });

  it("keeps the selected resume file when missing fields block the submit locally", async () => {
    const user = userEvent.setup();
    const initialState = createInitialOnboardingState();

    useActionStateMock.mockReturnValue([initialState, vi.fn(), false]);

    render(<OnboardingFlow initialState={initialState} />);

    const resumeFileInput = screen.getByLabelText(/resume file/i) as HTMLInputElement;
    const file = new File(["resume"], "resume.pdf", { type: "application/pdf" });

    await user.upload(resumeFileInput, file);
    await user.click(screen.getByRole("button", { name: /save onboarding draft/i }));

    expect(screen.getAllByText(/add the target role title/i).length).toBeGreaterThan(0);
    expect(resumeFileInput.files).toHaveLength(1);
    expect(resumeFileInput.files?.[0]?.name).toBe("resume.pdf");
  });
});
