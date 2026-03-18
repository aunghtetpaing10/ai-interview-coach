import type { InterviewMode } from "@/lib/types/interview";
import type { InterviewModePreset } from "@/lib/interview-session/types";

export const INTERVIEW_MODE_PRESETS: Record<InterviewMode, InterviewModePreset> =
  {
    behavioral: {
      mode: "behavioral",
      label: "Behavioral",
      focus: "Ownership, clarity, and impact framing.",
      openingPrompt:
        "Tell me about a time you inherited something messy and had to make it reliable.",
      followUpPrompts: [
        "What evidence shows you personally drove the turnaround?",
        "What changed in the system after your decision?",
        "What would you do differently if the team was twice as large?",
      ],
      closingPrompt:
        "Summarize the tradeoffs you would want a hiring manager to remember.",
    },
    resume: {
      mode: "resume",
      label: "Resume deep dive",
      focus: "Resume claims, scope, and technical credibility.",
      openingPrompt:
        "Walk me through the most recent project on your resume and the decisions you owned.",
      followUpPrompts: [
        "Which part of that work was most difficult to debug or scale?",
        "How did you verify that your change actually helped users?",
        "What claim on your resume would you be ready to defend in detail?",
      ],
      closingPrompt:
        "Give me the one resume bullet that best shows your seniority.",
    },
    project: {
      mode: "project",
      label: "Project walkthrough",
      focus: "Architecture choices, tradeoffs, and delivery evidence.",
      openingPrompt:
        "Choose one project and explain the architecture as if I had not seen the codebase.",
      followUpPrompts: [
        "Which dependency or boundary was the riskiest choice?",
        "How did you keep the project maintainable as it grew?",
        "What did you cut because it was not worth the complexity?",
      ],
      closingPrompt:
        "What part of the project would you defend if I challenged the design?",
    },
    "system-design": {
      mode: "system-design",
      label: "System design",
      focus: "Capacity, failure modes, and constraints under load.",
      openingPrompt:
        "Design a real-time notification service for a product with millions of active users.",
      followUpPrompts: [
        "Where are your hardest bottlenecks and why?",
        "How would you handle backpressure during a traffic spike?",
        "What breaks first if the requirements double overnight?",
      ],
      closingPrompt:
        "Now summarize the design in the shortest possible production-ready pitch.",
    },
  };

export function getInterviewModePreset(mode: InterviewMode) {
  return INTERVIEW_MODE_PRESETS[mode];
}
