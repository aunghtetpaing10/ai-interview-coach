import { INTERVIEW_SEED } from "@/db/seed";
import type { CompanyStyle, InterviewDifficulty, InterviewMode, PracticeStyle } from "@/lib/types/interview";
import type {
  InterviewBlueprint,
  InterviewBlueprintStage,
  InterviewModePreset,
} from "@/lib/interview-session/types";

type QuestionBankEntry = (typeof INTERVIEW_SEED.questionBank)[number];

type StageTemplate = {
  id: string;
  label: string;
  buildPrompt(input: {
    question: QuestionBankEntry;
    practiceStyle: PracticeStyle;
    difficulty: InterviewDifficulty;
  }): string;
  buildHint(input: { question: QuestionBankEntry }): string;
};

export const INTERVIEW_PRACTICE_STYLES = [
  { value: "guided", label: "Guided drill" },
  { value: "live", label: "Live mock" },
] as const satisfies ReadonlyArray<{ value: PracticeStyle; label: string }>;

export const INTERVIEW_DIFFICULTIES = [
  { value: "standard", label: "Standard" },
  { value: "challenging", label: "Challenging" },
  { value: "stretch", label: "Stretch" },
] as const satisfies ReadonlyArray<{ value: InterviewDifficulty; label: string }>;

export const INTERVIEW_COMPANY_STYLES = [
  { value: "general", label: "Generalist" },
  { value: "amazon", label: "Amazon-style" },
  { value: "google", label: "Google-style" },
  { value: "meta", label: "Meta-style" },
  { value: "stripe", label: "Stripe-style" },
] as const satisfies ReadonlyArray<{ value: CompanyStyle; label: string }>;

export const INTERVIEW_MODE_PRESETS: Record<InterviewMode, InterviewModePreset> = {
  behavioral: {
    mode: "behavioral",
    label: "Behavioral",
    focus: "Ownership, structure, and measurable impact under follow-up pressure.",
    summary: "Practice stories that survive interruption and skeptical follow-ups.",
    defaultPracticeStyle: "guided",
    defaultDifficulty: "standard",
    guidedDescription: "Hints keep the STAR spine visible while you rebuild the story.",
    liveDescription: "The interviewer probes without giving the story structure away.",
  },
  coding: {
    mode: "coding",
    label: "Coding",
    focus: "Reasoning-first algorithm interviews with explicit edge cases and trade-offs.",
    summary: "Practice clarifying, designing, validating, and optimizing without an editor.",
    defaultPracticeStyle: "guided",
    defaultDifficulty: "challenging",
    guidedDescription: "Hints reveal what a strong coding answer should cover next.",
    liveDescription: "The interviewer pressures correctness and optimization without helping.",
  },
  resume: {
    mode: "resume",
    label: "Resume deep dive",
    focus: "Resume claims, ownership boundaries, and credibility under challenge.",
    summary: "Defend the bullets on your resume with specific technical detail.",
    defaultPracticeStyle: "guided",
    defaultDifficulty: "standard",
    guidedDescription: "The coach surfaces where the answer still sounds vague.",
    liveDescription: "The interviewer challenges claims the way a real screen would.",
  },
  project: {
    mode: "project",
    label: "Project walkthrough",
    focus: "Architecture choices, delivery trade-offs, and measurable outcomes.",
    summary: "Turn project walkthroughs into credible, pressure-tested stories.",
    defaultPracticeStyle: "live",
    defaultDifficulty: "challenging",
    guidedDescription: "Hints keep the walkthrough grounded in decisions and results.",
    liveDescription: "The interviewer presses on scope, trade-offs, and execution proof.",
  },
  "system-design": {
    mode: "system-design",
    label: "System design",
    focus: "Requirements, architecture, failure modes, and scaling trade-offs.",
    summary: "Practice production-style design answers with explicit constraints.",
    defaultPracticeStyle: "live",
    defaultDifficulty: "challenging",
    guidedDescription: "Hints reveal the next missing layer of the design answer.",
    liveDescription: "The interviewer expects you to surface assumptions without prompting.",
  },
};

const MODE_STAGE_TEMPLATES: Record<InterviewMode, readonly StageTemplate[]> = {
  behavioral: [
    {
      id: "context",
      label: "Context",
      buildPrompt: ({ question, practiceStyle }) =>
        practiceStyle === "guided"
          ? `Start with the setup and stakes: ${question.prompt}`
          : question.prompt,
      buildHint: () => "Name the situation, the stakes, and why the problem mattered before jumping into the action.",
    },
    {
      id: "action",
      label: "Action",
      buildPrompt: ({ question, practiceStyle }) =>
        practiceStyle === "guided"
          ? `Now isolate your action. ${question.followUps?.[0] ?? "What exactly did you do?"}`
          : question.followUps?.[0] ?? "What exactly did you do?",
      buildHint: () => "Use first-person language and explain the decision you personally drove.",
    },
    {
      id: "impact",
      label: "Impact",
      buildPrompt: ({ question, practiceStyle }) =>
        practiceStyle === "guided"
          ? `Close the loop with impact. ${question.followUps?.[1] ?? "What changed because of your decision?"}`
          : question.followUps?.[1] ?? "What changed because of your decision?",
      buildHint: () => "Add a metric, user result, or operational change to prove the story mattered.",
    },
    {
      id: "probe",
      label: "Probe",
      buildPrompt: ({ question }) =>
        question.followUps?.[2] ?? "What would I challenge if I were unconvinced by that answer?",
      buildHint: () => "Answer the skeptical version of the story without restarting from the top.",
    },
    {
      id: "counterfactual",
      label: "Counterfactual",
      buildPrompt: () => "What would you do differently if the context were twice as messy or the team twice as large?",
      buildHint: () => "Show adaptability by revising the plan, not by saying you would 'communicate more.'",
    },
    {
      id: "close",
      label: "Close",
      buildPrompt: () => "Give me the 30-second version a hiring manager should remember.",
      buildHint: () => "End with ownership, trade-off, and measurable outcome in one tight close.",
    },
  ],
  coding: [
    {
      id: "clarify",
      label: "Clarify requirements",
      buildPrompt: ({ question, practiceStyle }) =>
        practiceStyle === "guided"
          ? `Start by clarifying requirements and constraints for this coding problem: ${question.prompt}`
          : question.prompt,
      buildHint: () => "Restate input, output, constraints, and any ambiguous edge cases before designing the approach.",
    },
    {
      id: "approach",
      label: "Outline approach",
      buildPrompt: () => "Talk me through the core approach before you touch pseudocode.",
      buildHint: () => "Name the main idea, the data structures, and why this is your starting point.",
    },
    {
      id: "solution",
      label: "Verbal pseudocode",
      buildPrompt: () => "Now give the solution as verbal pseudocode with the key steps in order.",
      buildHint: () => "Keep the flow high-signal: setup, loop/recursion, decisions, and returned result.",
    },
    {
      id: "edges",
      label: "Edge cases",
      buildPrompt: () => "What edge cases break this first draft, and how do you repair them?",
      buildHint: () => "Check empties, duplicates, boundaries, invalid input, and off-by-one behavior.",
    },
    {
      id: "testing",
      label: "Testing",
      buildPrompt: () => "Test the solution with one normal case, one edge case, and one failure case.",
      buildHint: () => "Use examples that prove correctness instead of only describing them abstractly.",
    },
    {
      id: "optimization",
      label: "Optimization",
      buildPrompt: ({ difficulty }) =>
        difficulty === "stretch"
          ? "Assume scale doubles. What is the optimization path and what trade-off do you accept?"
          : "What is the time and space complexity, and is there a better trade-off worth mentioning?",
      buildHint: () => "State complexity clearly and justify why the final trade-off matches the problem constraints.",
    },
    {
      id: "close",
      label: "Close",
      buildPrompt: () => "Give me the final interviewer-ready summary of the algorithm in under 45 seconds.",
      buildHint: () => "Summarize approach, complexity, and the edge case you handled explicitly.",
    },
  ],
  resume: [
    {
      id: "scope",
      label: "Scope",
      buildPrompt: ({ question }) => question.prompt,
      buildHint: () => "Pick one claim and explain the system or project scope before defending it.",
    },
    {
      id: "ownership",
      label: "Ownership",
      buildPrompt: ({ question }) => question.followUps?.[0] ?? "What exactly did you own within that work?",
      buildHint: () => "Separate your decision from the broader team effort.",
    },
    {
      id: "decision-quality",
      label: "Decision quality",
      buildPrompt: ({ question }) => question.followUps?.[1] ?? "Why did you make that technical decision?",
      buildHint: () => "Contrast the choice against a realistic alternative instead of asserting it was better.",
    },
    {
      id: "technical-depth",
      label: "Technical depth",
      buildPrompt: ({ question }) => question.followUps?.[2] ?? "How does the underlying system actually work?",
      buildHint: () => "Defend the implementation detail, not just the outcome.",
    },
    {
      id: "impact",
      label: "Impact",
      buildPrompt: () => "What changed because of that work, and how would you prove it?",
      buildHint: () => "End with user, revenue, reliability, or delivery impact.",
    },
    {
      id: "close",
      label: "Close",
      buildPrompt: () => "Now give me the resume-ready answer in one tight paragraph.",
      buildHint: () => "The close should sound credible enough to survive a skeptical follow-up.",
    },
  ],
  project: [
    {
      id: "scope",
      label: "Scope",
      buildPrompt: ({ question }) => question.prompt,
      buildHint: () => "Start with the project boundary and the riskiest decision inside it.",
    },
    {
      id: "ownership",
      label: "Ownership",
      buildPrompt: ({ question }) => question.followUps?.[0] ?? "What decision did you personally own?",
      buildHint: () => "Name the call you made, not just the work the team shipped.",
    },
    {
      id: "decision-quality",
      label: "Decision quality",
      buildPrompt: ({ question }) => question.followUps?.[1] ?? "Which trade-off mattered most?",
      buildHint: () => "Explain the trade-off before the implementation details.",
    },
    {
      id: "technical-depth",
      label: "Technical depth",
      buildPrompt: ({ question }) => question.followUps?.[2] ?? "Where did the technical complexity show up?",
      buildHint: () => "Walk through the system, dependency, or failure mode that made the work hard.",
    },
    {
      id: "impact",
      label: "Impact",
      buildPrompt: () => "How did you know the project actually helped?",
      buildHint: () => "Name the metric, operational result, or delivery improvement that changed.",
    },
    {
      id: "close",
      label: "Close",
      buildPrompt: () => "Give me the strongest senior-level defense of this project in 30 seconds.",
      buildHint: () => "The close should sound deliberate, not like a timeline recap.",
    },
  ],
  "system-design": [
    {
      id: "requirements",
      label: "Requirements",
      buildPrompt: ({ question, practiceStyle }) =>
        practiceStyle === "guided"
          ? `Start with requirements and constraints for this design: ${question.prompt}`
          : question.prompt,
      buildHint: () => "Clarify users, throughput, latency, and correctness assumptions first.",
    },
    {
      id: "constraints",
      label: "Constraints",
      buildPrompt: () => "What are the non-negotiable constraints and scale assumptions that shape the design?",
      buildHint: () => "Put numbers on the workload or explain which properties matter most.",
    },
    {
      id: "api-data-model",
      label: "API and data model",
      buildPrompt: () => "What does the API look like, and what data model sits behind it?",
      buildHint: () => "Use interfaces and stored state to anchor the rest of the system.",
    },
    {
      id: "high-level-design",
      label: "High-level design",
      buildPrompt: () => "Walk me through the high-level architecture and main data flow.",
      buildHint: () => "Describe components in the order a request moves through the system.",
    },
    {
      id: "deep-dive",
      label: "Deep dive",
      buildPrompt: () => "Which subsystem deserves the deepest attention, and how does it work under load?",
      buildHint: () => "Pick the most failure-prone or scale-sensitive component, not the easiest one.",
    },
    {
      id: "scale-reliability",
      label: "Scale and reliability",
      buildPrompt: () => "Where do scale and reliability break first, and what is the mitigation path?",
      buildHint: () => "Name bottlenecks, backpressure, and degraded behavior explicitly.",
    },
    {
      id: "trade-offs",
      label: "Trade-offs",
      buildPrompt: () => "What trade-offs did you make, and what alternative did you reject?",
      buildHint: () => "A strong answer defends one meaningful trade-off instead of listing every option.",
    },
    {
      id: "close",
      label: "Close",
      buildPrompt: () => "Close with the production-ready pitch for this design in under a minute.",
      buildHint: () => "Summarize requirements, architecture, bottlenecks, and the key trade-off.",
    },
  ],
};

function getWrapUpPrompt(practiceStyle: PracticeStyle) {
  return practiceStyle === "guided"
    ? "Tighten the weakest part of that answer once more or end the session when you are ready."
    : "You have covered the core loop. End the session or keep sharpening the answer without new hints.";
}

export function getInterviewModePreset(mode: InterviewMode) {
  return INTERVIEW_MODE_PRESETS[mode];
}

export function listQuestionBankEntries(mode?: InterviewMode) {
  return mode
    ? INTERVIEW_SEED.questionBank.filter((question) => question.mode === mode)
    : INTERVIEW_SEED.questionBank;
}

export function findQuestionBankEntry(questionId: string | null | undefined) {
  if (!questionId) {
    return null;
  }

  return INTERVIEW_SEED.questionBank.find((question) => question.id === questionId) ?? null;
}

export function getDefaultQuestionBankEntry(mode: InterviewMode) {
  return listQuestionBankEntries(mode)[0] ?? INTERVIEW_SEED.questionBank[0]!;
}

function buildStages(input: {
  question: QuestionBankEntry;
  practiceStyle: PracticeStyle;
  difficulty: InterviewDifficulty;
}): InterviewBlueprintStage[] {
  return MODE_STAGE_TEMPLATES[input.question.mode].map((stage) => ({
    id: stage.id,
    label: stage.label,
    prompt: stage.buildPrompt(input),
    interviewerGoal: input.question.interviewerGoal,
    hint: stage.buildHint({ question: input.question }),
  }));
}

export function createInterviewBlueprint(input: {
  question: QuestionBankEntry;
  practiceStyle: PracticeStyle;
  difficulty: InterviewDifficulty;
  companyStyle: CompanyStyle | null;
}): InterviewBlueprint {
  const stages = buildStages({
    question: input.question,
    practiceStyle: input.practiceStyle,
    difficulty: input.difficulty,
  });
  const rotationQuestionIds = listQuestionBankEntries(input.question.mode)
    .filter(
      (candidate) =>
        candidate.id !== input.question.id &&
        candidate.questionFamily === input.question.questionFamily,
    )
    .map((candidate) => candidate.id);

  return {
    id: `${input.question.id}:${input.practiceStyle}:${input.difficulty}:${input.companyStyle ?? "general"}`,
    questionId: input.question.id,
    questionTitle: input.question.title,
    questionFamily: input.question.questionFamily,
    mode: input.question.mode,
    practiceStyle: input.practiceStyle,
    difficulty: input.difficulty,
    companyStyle: input.companyStyle,
    interviewerGoal: input.question.interviewerGoal,
    followUpPolicy: input.question.followUpPolicy,
    coachingOutline: [...(input.question.coachingOutline ?? [])],
    openingPrompt: stages[0]?.prompt ?? input.question.prompt,
    wrapUpPrompt: getWrapUpPrompt(input.practiceStyle),
    stages,
    rotationQuestionIds,
  };
}

export function getDefaultInterviewBlueprint(input: {
  mode: InterviewMode;
  practiceStyle?: PracticeStyle;
  difficulty?: InterviewDifficulty;
  companyStyle?: CompanyStyle | null;
  questionId?: string | null;
}) {
  const preset = getInterviewModePreset(input.mode);
  const question =
    findQuestionBankEntry(input.questionId) ??
    getDefaultQuestionBankEntry(input.mode);

  return createInterviewBlueprint({
    question,
    practiceStyle: input.practiceStyle ?? preset.defaultPracticeStyle,
    difficulty: input.difficulty ?? preset.defaultDifficulty,
    companyStyle: input.companyStyle ?? null,
  });
}
