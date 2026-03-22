import { buildOnboardingSummary, createEmptyOnboardingDraft } from "@/lib/intake/summary";
import { makeOnboardingStateMessage } from "@/lib/intake/persistence";
import type {
  OnboardingDraft,
  OnboardingFormValues,
  OnboardingSubmissionState,
} from "@/lib/intake/types";

export function buildOnboardingFormValues(draft: OnboardingDraft): OnboardingFormValues {
  return {
    roleTitle: draft.roleTitle,
    seniority: draft.seniority,
    companyType: draft.companyType,
    focusAreas: draft.focusAreas.join(", "),
    companyName: draft.companyName,
    jobTitle: draft.jobTitle,
    jobUrl: draft.jobUrl,
    jobDescription: draft.jobDescription,
    resumeNotes: draft.resumeNotes,
  };
}

export function createInitialOnboardingState(
  draft: OnboardingDraft = createEmptyOnboardingDraft(),
): OnboardingSubmissionState {
  const summary = buildOnboardingSummary(draft);

  return {
    status: "idle",
    message: makeOnboardingStateMessage(summary.completion),
    formValues: buildOnboardingFormValues(draft),
    summary,
    fieldErrors: {},
  };
}
