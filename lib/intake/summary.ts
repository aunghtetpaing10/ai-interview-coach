import type {
  InterviewTrack,
  OnboardingDraft,
  OnboardingSummary,
} from "@/lib/intake/types";
import { buildResumePreviewFromText } from "@/lib/resume/parser";

const TRACK_LABELS: Record<InterviewTrack, string> = {
  behavioral: "Behavioral",
  resume: "Resume deep dive",
  project: "Project walkthrough",
  "system-design": "System design",
};

const SYSTEM_DESIGN_KEYWORDS = [
  "system design",
  "architecture",
  "distributed",
  "scalability",
  "reliability",
  "platform",
  "api",
  "apis",
  "services",
];

const PROJECT_KEYWORDS = [
  "project",
  "launch",
  "delivery",
  "ownership",
  "feature",
  "roadmap",
  "impact",
];

function hasKeywords(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function formatFocusArea(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function createEmptyOnboardingDraft(): OnboardingDraft {
  return {
    roleTitle: "",
    seniority: "mid-level",
    companyType: "startup",
    focusAreas: [],
    companyName: "",
    jobTitle: "",
    jobUrl: "",
    jobDescription: "",
    resumeNotes: "",
    resumePreview: {
      source: "none",
      fileName: "No resume yet",
      kind: "unknown",
      sizeLabel: "0 chars",
      supported: false,
      summary: "Paste a resume summary to ground the interview.",
    },
  };
}

export function createDemoOnboardingDraft(): OnboardingDraft {
  return {
    roleTitle: "Backend Software Engineer",
    seniority: "mid-level",
    companyType: "startup",
    focusAreas: ["APIs", "Ownership", "Reliability"],
    companyName: "Northstar",
    jobTitle: "Software Engineer",
    jobUrl: "https://example.com/jobs/backend-engineer",
    jobDescription:
      "Build and own APIs that support product teams, improve service reliability, and scale core platform systems.",
    resumeNotes:
      "Scaled API services, shipped cross-functional product work, and improved reliability.",
    resumePreview: buildResumePreviewFromText(
      "Scaled API services, shipped cross-functional product work, and improved reliability.",
    ),
  };
}

export function inferRecommendedTracks(
  draft: Pick<OnboardingDraft, "roleTitle" | "focusAreas" | "jobDescription" | "resumePreview">,
) {
  const tracks: InterviewTrack[] = ["behavioral"];
  const haystack = [draft.roleTitle, ...draft.focusAreas, draft.jobDescription].join(" ");

  if (draft.resumePreview.source !== "none") {
    tracks.push("resume");
  }

  if (
    hasKeywords(haystack, SYSTEM_DESIGN_KEYWORDS) ||
    draft.roleTitle.toLowerCase().includes("platform")
  ) {
    tracks.push("system-design");
  }

  if (hasKeywords(haystack, PROJECT_KEYWORDS) || draft.focusAreas.length > 2) {
    tracks.push("project");
  }

  return Array.from(new Set(tracks));
}

export function estimateOnboardingCompletion(draft: OnboardingDraft) {
  const checkpoints = [
    Boolean(draft.roleTitle),
    Boolean(draft.seniority),
    Boolean(draft.companyType),
    draft.focusAreas.length > 0,
    Boolean(draft.companyName),
    Boolean(draft.jobTitle),
    draft.jobDescription.length >= 60,
    draft.resumePreview.source !== "none",
  ];

  const score = checkpoints.filter(Boolean).length;
  return Math.round((score / checkpoints.length) * 100);
}

export function buildOnboardingSummary(draft: OnboardingDraft): OnboardingSummary {
  const completion = estimateOnboardingCompletion(draft);
  const recommendedTracks = inferRecommendedTracks(draft);
  const missingPieces = [
    draft.roleTitle ? "" : "Target role title",
    draft.companyName ? "" : "Company name",
    draft.jobTitle ? "" : "Job title",
    draft.jobDescription.length >= 60 ? "" : "Job description",
    draft.resumePreview.source !== "none" ? "" : "Resume upload or pasted notes",
  ].filter(Boolean);

  const readinessLabel =
    completion >= 85
      ? "Ready for a live mock interview"
      : completion >= 60
        ? "Close to ready"
        : "Needs a stronger draft";

  const coachingHeadline = missingPieces.length
    ? `Add ${missingPieces.slice(0, 2).join(" and ")} to make the interview more grounded.`
    : recommendedTracks.includes("system-design")
      ? "You have enough signal for system design pressure-testing."
      : "This setup is ready for resume-grounded follow-ups.";

  const nextSteps = [
    `Start with ${TRACK_LABELS[recommendedTracks[0]]} to establish the baseline.`,
    recommendedTracks.includes("resume")
      ? "Ask the coach to challenge claims directly from the resume file or pasted notes."
      : "Upload a resume file or paste resume notes so the coach can cite specific evidence.",
    recommendedTracks.includes("system-design")
      ? "Include at least one scale or architecture question in the first session."
      : "Use the job description to generate follow-up questions around impact and ownership.",
  ];

  return {
    completion,
    readinessLabel,
    recommendedTracks,
    focusAreas: draft.focusAreas.map(formatFocusArea),
    missingPieces,
    coachingHeadline,
    nextSteps,
    resumePreview: draft.resumePreview,
  };
}
