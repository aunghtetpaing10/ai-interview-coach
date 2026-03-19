import { buildOnboardingSummary, createEmptyOnboardingDraft } from "@/lib/intake/summary";
import { makeOnboardingStateMessage } from "@/lib/intake/persistence";
import type { OnboardingDraft, OnboardingSubmissionState } from "@/lib/intake/types";

export function createInitialOnboardingState(
  draft: OnboardingDraft = createEmptyOnboardingDraft(),
): OnboardingSubmissionState {
  const summary = buildOnboardingSummary(draft);

  return {
    status: "idle",
    message: makeOnboardingStateMessage(summary.completion),
    summary,
    fieldErrors: {},
  };
}
