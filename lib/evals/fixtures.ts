import type { ReportEvalCase, ReportPromptFixture } from "@/lib/reporting/types";

export const REPORT_PROMPT_FIXTURES: readonly ReportPromptFixture[] = [
  {
    id: "report-rubric-v1",
    title: "Scorecard rubric",
    version: "2026-03-19",
    objective: "Turn transcript evidence into stable competency scoring.",
    guardrails: [
      "Cite the exact transcript turn for every score change.",
      "Prefer grounded language over generic praise.",
      "Keep the output structurally stable for snapshot testing.",
    ],
  },
  {
    id: "report-rewrite-v1",
    title: "Stronger answer rewrites",
    version: "2026-03-19",
    objective: "Rewrite weak answers while preserving the candidate's real evidence.",
    guardrails: [
      "Keep the original claim recognizable.",
      "Do not invent metrics that are not present in the transcript.",
      "Use concise coaching language suitable for a report card.",
    ],
  },
  {
    id: "report-plan-v1",
    title: "Practice plan",
    version: "2026-03-19",
    objective: "Convert the weakest signals into a concrete follow-up plan.",
    guardrails: [
      "Keep each drill short and repeatable.",
      "Tie the drill back to a specific weakness.",
      "Limit the plan to actions a candidate can do in one day.",
    ],
  },
] as const;

export const REPORT_EVAL_CASES: readonly ReportEvalCase[] = [
  {
    id: "eval-scorecard-ownership",
    label: "Scorecard explains ownership signals",
    category: "scorecard",
    input: "Candidate says they 'helped the team' but never names their own decision.",
    expected: [
      "ownership is called out as a growth area",
      "the explanation references transcript evidence",
    ],
  },
  {
    id: "eval-citation-turn-02",
    label: "Citation blocks preserve the exact turn",
    category: "citation",
    input: "Use the candidate's answer about scaling the payments queue.",
    expected: [
      "turn id is linked to the timestamp",
      "quote is grounded in the transcript",
    ],
  },
  {
    id: "eval-rewrite-ledger",
    label: "Rewrite keeps evidence but tightens language",
    category: "rewrite",
    input: "Rewrite the vague project explanation into a stronger answer.",
    expected: [
      "original evidence is preserved",
      "the rewrite sounds more decisive",
    ],
  },
  {
    id: "eval-practice-system-thinking",
    label: "Practice plan targets system thinking gaps",
    category: "practice-plan",
    input: "System design answers need stronger framing and bottleneck analysis.",
    expected: [
      "plan includes a constraint-setting drill",
      "plan includes a fallback-path drill",
    ],
  },
] as const;
