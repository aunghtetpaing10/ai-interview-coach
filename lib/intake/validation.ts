import { z } from "zod";
import {
  buildResumePreviewFromFile,
  buildResumePreviewFromText,
} from "@/lib/resume/parser";
import type {
  OnboardingDraft,
  OnboardingFormValues,
  OnboardingFieldName,
} from "@/lib/intake/types";

const onboardingFormSchema = z.object({
  roleTitle: z.string().trim().min(3, "Add the target role title."),
  seniority: z.enum(["intern", "junior", "mid-level", "senior", "staff"]),
  companyType: z.enum([
    "startup",
    "scale-up",
    "enterprise",
    "product-led",
    "agency",
  ]),
  focusAreas: z.string().default(""),
  companyName: z.string().default(""),
  jobTitle: z.string().default(""),
  jobUrl: z.string().default(""),
  jobDescription: z
    .string()
    .trim()
    .min(60, "Paste at least a short job description."),
  resumeNotes: z.string().default(""),
});

function readTextField(formData: FormData, key: OnboardingFieldName) {
  const value = formData.get(key);

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

export function normalizeCommaSeparatedList(value: string) {
  return Array.from(
    new Map(
      value
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => [item.toLowerCase(), item]),
    ).values(),
  );
}

export function readOnboardingFormValues(formData: FormData): OnboardingFormValues {
  return {
    roleTitle: readTextField(formData, "roleTitle"),
    seniority: readTextField(formData, "seniority"),
    companyType: readTextField(formData, "companyType"),
    focusAreas: readTextField(formData, "focusAreas"),
    companyName: readTextField(formData, "companyName"),
    jobTitle: readTextField(formData, "jobTitle"),
    jobUrl: readTextField(formData, "jobUrl"),
    jobDescription: readTextField(formData, "jobDescription"),
    resumeNotes: readTextField(formData, "resumeNotes"),
  };
}

export function createOnboardingDraftFromFormData(formData: FormData): OnboardingDraft {
  const parsed = safeParseOnboardingDraftFromFormData(formData);

  if (!parsed.success) {
    throw new Error(parsed.message);
  }

  return parsed.draft;
}

export function safeParseOnboardingDraftFromFormData(formData: FormData):
  | { success: true; draft: OnboardingDraft }
  | { success: false; message: string; fieldErrors: Partial<Record<OnboardingFieldName, string>> } {
  const formValues = readOnboardingFormValues(formData);
  const parsed = onboardingFormSchema.safeParse(formValues);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<OnboardingFieldName, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string") {
        fieldErrors[field as OnboardingFieldName] = issue.message;
      }
    }

    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Fix the onboarding fields and try again.",
      fieldErrors,
    };
  }

  const resumeFile = formData.get("resumeFile");
  const resumePreview =
    resumeFile instanceof File && resumeFile.size > 0
      ? buildResumePreviewFromFile(resumeFile.name, resumeFile.size)
      : buildResumePreviewFromText(parsed.data.resumeNotes);

  return {
    success: true,
    draft: {
      roleTitle: parsed.data.roleTitle,
      seniority: parsed.data.seniority,
      companyType: parsed.data.companyType,
      focusAreas: normalizeCommaSeparatedList(parsed.data.focusAreas),
      companyName: parsed.data.companyName,
      jobTitle: parsed.data.jobTitle,
      jobUrl: parsed.data.jobUrl,
      jobDescription: parsed.data.jobDescription,
      resumeNotes: parsed.data.resumeNotes,
      resumePreview,
    },
  };
}
