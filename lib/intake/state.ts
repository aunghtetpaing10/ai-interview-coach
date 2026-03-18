import { buildOnboardingSummary, createDemoOnboardingDraft } from "@/lib/intake/summary";
import type { OnboardingSubmissionState } from "@/lib/intake/types";

export function createInitialOnboardingState(): OnboardingSubmissionState {
  return {
    status: "idle",
    message:
      "Review the defaults, then save a draft to generate a grounded interview plan.",
    summary: buildOnboardingSummary(createDemoOnboardingDraft()),
    fieldErrors: {},
  };
}
