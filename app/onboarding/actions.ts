"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceUser } from "@/lib/auth/session";
import type { OnboardingSubmissionState } from "@/lib/intake/types";
import { makeOnboardingStateMessage, saveOnboardingDraftForUser } from "@/lib/intake/persistence";
import { buildOnboardingFormValues } from "@/lib/intake/state";
import { buildOnboardingSummary } from "@/lib/intake/summary";
import {
  readOnboardingFormValues,
  safeParseOnboardingDraftFromFormData,
} from "@/lib/intake/validation";

export async function submitOnboardingDraft(
  previousState: OnboardingSubmissionState,
  formData: FormData,
): Promise<OnboardingSubmissionState> {
  const parsed = safeParseOnboardingDraftFromFormData(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.message,
      formValues: readOnboardingFormValues(formData),
      summary: previousState.summary,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const user = await requireWorkspaceUser("/onboarding");
  const draft = parsed.draft;
  const summary = buildOnboardingSummary(draft);

  try {
    const resumeFile = formData.get("resumeFile");

    await saveOnboardingDraftForUser({
      userId: user.id,
      email: user.email,
      draft,
      file: resumeFile instanceof File && resumeFile.size > 0 ? resumeFile : null,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to save onboarding draft.",
      formValues: buildOnboardingFormValues(draft),
      summary: previousState.summary,
      fieldErrors: {},
    };
  }

  revalidatePath("/onboarding");
  revalidatePath("/workspace");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: makeOnboardingStateMessage(summary.completion),
    formValues: buildOnboardingFormValues(draft),
    summary,
    fieldErrors: {},
  };
}
