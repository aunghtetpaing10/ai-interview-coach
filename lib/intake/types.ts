import type { ResumeUploadPreview } from "@/lib/resume/types";

export type SeniorityLevel =
  | "intern"
  | "junior"
  | "mid-level"
  | "senior"
  | "staff";

export type CompanyType =
  | "startup"
  | "scale-up"
  | "enterprise"
  | "product-led"
  | "agency";

export type InterviewTrack =
  | "behavioral"
  | "resume"
  | "project"
  | "system-design";

export type OnboardingFieldName =
  | "roleTitle"
  | "seniority"
  | "companyType"
  | "focusAreas"
  | "companyName"
  | "jobTitle"
  | "jobUrl"
  | "jobDescription"
  | "resumeNotes"
  | "resumeFile";

export interface OnboardingDraft {
  roleTitle: string;
  seniority: SeniorityLevel;
  companyType: CompanyType;
  focusAreas: string[];
  companyName: string;
  jobTitle: string;
  jobUrl: string;
  jobDescription: string;
  resumeNotes: string;
  resumePreview: ResumeUploadPreview;
}

export interface OnboardingFormValues {
  roleTitle: string;
  seniority: string;
  companyType: string;
  focusAreas: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string;
  jobDescription: string;
  resumeNotes: string;
}

export interface OnboardingSummary {
  completion: number;
  readinessLabel: string;
  recommendedTracks: InterviewTrack[];
  focusAreas: string[];
  missingPieces: string[];
  coachingHeadline: string;
  nextSteps: string[];
  resumePreview: ResumeUploadPreview;
}

export interface OnboardingSubmissionState {
  status: "idle" | "success" | "error";
  message: string;
  formValues: OnboardingFormValues;
  summary: OnboardingSummary;
  fieldErrors: Partial<Record<OnboardingFieldName, string>>;
}

