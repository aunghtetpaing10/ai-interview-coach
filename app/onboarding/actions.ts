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

const ONBOARDING_SAVE_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T> | T, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

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

    await withTimeout(
      saveOnboardingDraftForUser({
        userId: user.id,
        email: user.email,
        draft,
        file: resumeFile instanceof File && resumeFile.size > 0 ? resumeFile : null,
      }),
      ONBOARDING_SAVE_TIMEOUT_MS,
      "Saving the onboarding draft timed out. Check Postgres and Supabase Storage, then try again.",
    );
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
