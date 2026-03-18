"use server";

import type { OnboardingSubmissionState } from "@/lib/intake/types";
import {
  buildOnboardingSummary,
  createEmptyOnboardingDraft,
} from "@/lib/intake/summary";
import {
  safeParseOnboardingDraftFromFormData,
} from "@/lib/intake/validation";

export async function submitOnboardingDraft(
  _previousState: OnboardingSubmissionState,
  formData: FormData,
): Promise<OnboardingSubmissionState> {
  const parsed = safeParseOnboardingDraftFromFormData(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.message,
      summary: buildOnboardingSummary(createEmptyOnboardingDraft()),
      fieldErrors: parsed.fieldErrors,
    };
  }

  const draft = parsed.draft;
  const summary = buildOnboardingSummary(draft);

  return {
    status: "success",
    message:
      "Draft captured. The coach can now anchor questions to your role, resume, and target job.",
    summary,
    fieldErrors: {},
  };
}
