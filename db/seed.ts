import type {
  InterviewMode,
  NewEvalCaseRow,
  NewPromptVersionRow,
  NewQuestionBankRow,
  NewRubricDimensionRow,
} from "@/db/schema";

export const SEED_RUBRIC_DIMENSIONS = [
  {
    id: "rubric_clarity",
    key: "clarity",
    label: "Clarity",
    description: "How precisely the candidate explains decisions, scope, and outcomes.",
    maxScore: 5,
  },
  {
    id: "rubric_ownership",
    key: "ownership",
    label: "Ownership",
    description: "How clearly the candidate identifies personal responsibility and impact.",
    maxScore: 5,
  },
  {
    id: "rubric_technical_depth",
    key: "technical-depth",
    label: "Technical depth",
    description: "How well the candidate justifies tradeoffs, mechanisms, and constraints.",
    maxScore: 5,
  },
  {
    id: "rubric_communication",
    key: "communication",
    label: "Communication",
    description: "How structured, concise, and responsive the answer feels in conversation.",
    maxScore: 5,
  },
  {
    id: "rubric_systems_thinking",
    key: "systems-thinking",
    label: "Systems thinking",
    description: "How well the candidate connects architecture choices to scale and reliability.",
    maxScore: 5,
  },
] as const satisfies readonly NewRubricDimensionRow[];

export const SEED_QUESTION_BANK = [
  {
    id: "question_behavioral_ownership",
    mode: "behavioral",
    prompt: "Tell me about a time you took ownership of a problem that was not initially yours.",
    followUps: [
      "What changed because you stepped in?",
      "How did you measure the outcome?",
    ],
    rubricKeys: ["ownership", "communication"],
    sourceTag: "candidate_playbook",
    orderIndex: 1,
  },
  {
    id: "question_resume_scope",
    mode: "resume",
    prompt: "Walk me through the project on your resume that had the highest operational risk.",
    followUps: [
      "What exactly did you ship?",
      "What would break if your solution failed?",
    ],
    rubricKeys: ["clarity", "technical-depth"],
    sourceTag: "resume_review",
    orderIndex: 2,
  },
  {
    id: "question_project_tradeoffs",
    mode: "project",
    prompt: "Describe a project decision where you chose a worse short-term solution for a better long-term result.",
    followUps: [
      "What alternatives did you reject?",
      "What data supported your decision?",
    ],
    rubricKeys: ["technical-depth", "systems-thinking"],
    sourceTag: "project_walkthrough",
    orderIndex: 3,
  },
  {
    id: "question_system_design_capacity",
    mode: "system-design",
    prompt: "Design a notification service that must support spikes, retries, and user preferences.",
    followUps: [
      "Where do you store delivery state?",
      "How do you handle fan-out at scale?",
    ],
    rubricKeys: ["technical-depth", "systems-thinking"],
    sourceTag: "system_design_drill",
    orderIndex: 4,
  },
] as const satisfies readonly NewQuestionBankRow[];

export const SEED_PROMPT_VERSIONS = [
  {
    id: "prompt_voice_interviewer_v1",
    label: "Voice interviewer v1",
    model: "gpt-realtime",
    hash: "sha256:voice-interviewer-v1",
    notes: "Baseline realtime interviewer prompt for resume-grounded follow-ups.",
  },
  {
    id: "prompt_scorecard_v1",
    label: "Scorecard v1",
    model: "gpt-5.2",
    hash: "sha256:scorecard-v1",
    notes: "Structured scoring prompt for transcript evidence and rubric output.",
  },
] as const satisfies readonly NewPromptVersionRow[];

export const SEED_EVAL_CASES = [
  {
    id: "eval_behavioral_band",
    name: "Behavioral ownership baseline",
    mode: "behavioral",
    expectedBand: "improving",
    fixturePath: "tests/fixtures/evals/behavioral-ownership.json",
  },
  {
    id: "eval_system_design_band",
    name: "System design tradeoff baseline",
    mode: "system-design",
    expectedBand: "training",
    fixturePath: "tests/fixtures/evals/system-design-notification.json",
  },
] as const satisfies readonly NewEvalCaseRow[];

export const INTERVIEW_SEED = {
  rubricDimensions: SEED_RUBRIC_DIMENSIONS,
  questionBank: SEED_QUESTION_BANK,
  promptVersions: SEED_PROMPT_VERSIONS,
  evalCases: SEED_EVAL_CASES,
} as const;

export function getSeedQuestionBank(mode?: InterviewMode) {
  return mode
    ? SEED_QUESTION_BANK.filter((question) => question.mode === mode)
    : SEED_QUESTION_BANK;
}
