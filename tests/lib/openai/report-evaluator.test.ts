import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { openaiConstructor, parseMock } = vi.hoisted(() => {
  const parseMock = vi.fn();
  const openaiConstructor = vi.fn(function OpenAIConstructorMock() {
    return {
      responses: {
        parse: parseMock,
      },
    };
  });

  return { openaiConstructor, parseMock };
});

vi.mock("openai", () => ({
  default: openaiConstructor,
}));

import type { ReportEvaluation } from "@/lib/openai/report-evaluator";
import { createOpenAIResponsesReportEvaluator } from "@/lib/openai/report-evaluator";
import type { ReportGenerationContext } from "@/lib/report-service/report-service";
import { makeInterviewSessionRow, makeScorecard } from "@/tests/helpers/factories";

const parsedEvaluation: ReportEvaluation = {
  scorecard: makeScorecard("project"),
  summary: {
    score: 84,
    band: "strong",
    headline: "Strong and trending up with clear upside in systems thinking.",
    strengths: ["Technical depth 87%", "Clarity 84%"],
    growthAreas: ["Systems thinking 75%", "Ownership 78%"],
  },
  citations: [],
  rewrites: [],
  practicePlan: {
    title: "Platform engineer practice plan",
    focus: "Strong and trending up with clear upside in systems thinking.",
    steps: [],
  },
};

function makeTranscriptTurn(index: number) {
  const speaker = index === 1 ? "interviewer" : index % 2 === 0 ? "candidate" : "interviewer";

  return {
    id: `turn-${index}`,
    sessionId: "session-123",
    speaker,
    body:
      index === 1
        ? "Walk me through the project from the opening prompt."
        : `Turn ${index} evidence about the rollout, ownership, and follow-up.`,
    seconds: index * 10,
    sequenceIndex: index - 1,
    confidence: 100,
    createdAt: new Date("2026-03-19T10:00:00.000Z"),
  } as const;
}

function makeContext(overrides: Partial<ReportGenerationContext> = {}): ReportGenerationContext {
  return {
    session: {
      ...makeInterviewSessionRow({
        id: "session-123",
        userId: "user_1",
        targetRoleId: "target-1",
        mode: "project",
        status: "completed",
        title: "Queue scaling drill",
        overallScore: 84,
        durationSeconds: 18 * 60,
        startedAt: new Date("2026-03-19T10:00:00.000Z"),
        endedAt: new Date("2026-03-19T10:18:00.000Z"),
        createdAt: new Date("2026-03-19T09:59:00.000Z"),
        updatedAt: new Date("2026-03-19T10:18:00.000Z"),
      }),
    },
    profile: {
      id: "profile-1",
      userId: "user_1",
      fullName: "Aung Paing",
      headline: "Platform engineer",
      targetRole: "Platform engineer",
      createdAt: new Date("2026-03-19T09:00:00.000Z"),
      updatedAt: new Date("2026-03-19T09:00:00.000Z"),
    },
    targetRole: {
      id: "target-1",
      userId: "user_1",
      title: "Platform engineer",
      companyType: "startup",
      level: "mid-level",
      focusAreas: ["systems-thinking", "technical-depth"],
      active: true,
      createdAt: new Date("2026-03-19T09:00:00.000Z"),
    },
    jobTarget: {
      id: "job-1",
      userId: "user_1",
      targetRoleId: "target-1",
      companyName: "Northstar",
      jobTitle: "Platform engineer",
      jobUrl: "https://example.com/jobs/platform-engineer",
      jobDescription:
        "Own the interview budget. " +
        "The same job description repeats with more detail. ".repeat(180),
      createdAt: new Date("2026-03-19T09:00:00.000Z"),
      updatedAt: new Date("2026-03-19T09:00:00.000Z"),
    },
    promptVersion: {
      id: "prompt-1",
      label: "Scorecard v1",
      model: "gpt-5.2",
      hash: "sha256:scorecard-v1",
      notes: "Baseline scoring prompt.",
      publishedAt: new Date("2026-03-19T00:00:00.000Z"),
    },
    transcript: [
      makeTranscriptTurn(1),
      ...Array.from({ length: 29 }, (_, index) => makeTranscriptTurn(index + 2)),
    ],
    report: null,
    practicePlan: null,
    ...overrides,
  };
}

describe("openai report evaluator", () => {
  beforeEach(() => {
    parseMock.mockReset();
    openaiConstructor.mockClear();
    parseMock.mockResolvedValue({ output_parsed: parsedEvaluation });
  });

  it("keeps the opening prompt and newest turns within the transcript budget", async () => {
    const evaluator = createOpenAIResponsesReportEvaluator({
      apiKey: "test-api-key",
      model: "gpt-test",
    });

    await evaluator.evaluate(makeContext());

    const payload = JSON.parse(parseMock.mock.calls[0][0].input[1].content as string);

    expect(openaiConstructor).toHaveBeenCalledWith({ apiKey: "test-api-key" });
    expect(payload.transcript).toHaveLength(24);
    expect(payload.transcript[0].id).toBe("turn-1");
    expect(payload.transcript.at(-1)?.id).toBe("turn-30");
    expect(payload.transcript.some((turn: { id: string }) => turn.id === "turn-2")).toBe(false);
    expect(payload.transcript.some((turn: { id: string }) => turn.id === "turn-7")).toBe(false);
    expect(payload.transcript.some((turn: { id: string }) => turn.id === "turn-8")).toBe(true);

    expect(payload.truncation.transcript).toMatchObject({
      maxTurnCount: 24,
      maxCharCount: 12_000,
      originalTurnCount: 30,
      retainedTurnCount: 24,
      droppedTurnCount: 6,
      keptOpeningTurnId: "turn-1",
    });
    expect(payload.truncation.transcript.keptTurnIds).toEqual([
      "turn-1",
      ...Array.from({ length: 23 }, (_, index) => `turn-${index + 8}`),
    ]);
  });

  it("budgets the context payload and records truncation metadata", async () => {
    const evaluator = createOpenAIResponsesReportEvaluator({
      apiKey: "test-api-key",
      model: "gpt-test",
    });

    await evaluator.evaluate(makeContext());

    const payload = JSON.parse(parseMock.mock.calls[0][0].input[1].content as string);
    const retainedContextChars = payload.context.sections.reduce(
      (sum: number, section: { text: string }) => sum + section.text.length,
      0,
    );

    expect(retainedContextChars).toBeLessThanOrEqual(6_000);
    expect(payload.context.sections[0].key).toBe("profile");
    expect(payload.context.sections.some((section: { key: string }) => section.key === "jobTarget")).toBe(true);
    expect(payload.truncation.context).toMatchObject({
      maxCharCount: 6_000,
      sectionCount: payload.context.sections.length,
    });

    const jobTargetSection = payload.context.sections.find(
      (section: { key: string }) => section.key === "jobTarget",
    );
    const truncationEntry = payload.truncation.context.sections.find(
      (section: { key: string }) => section.key === "jobTarget",
    );

    expect(jobTargetSection?.text.length).toBeLessThan(
      makeContext().jobTarget!.jobDescription.length,
    );
    expect(truncationEntry).toMatchObject({
      truncated: true,
    });
  });

  it("handles empty transcript and optional context sections", async () => {
    const evaluator = createOpenAIResponsesReportEvaluator({
      apiKey: "test-api-key",
      model: "gpt-test",
    });

    await evaluator.evaluate(
      makeContext({
        profile: null,
        targetRole: null,
        jobTarget: null,
        promptVersion: null,
        transcript: [],
      }),
    );

    const payload = JSON.parse(parseMock.mock.calls[0][0].input[1].content as string);

    expect(payload.context.sections).toEqual([]);
    expect(payload.transcript).toEqual([]);
    expect(payload.truncation.transcript).toMatchObject({
      originalTurnCount: 0,
      retainedTurnCount: 0,
      keptOpeningTurnId: null,
      openingPromptTruncated: false,
    });
  });

  it("truncates oversized opening prompts to stay within transcript character budget", async () => {
    const evaluator = createOpenAIResponsesReportEvaluator({
      apiKey: "test-api-key",
      model: "gpt-test",
    });

    await evaluator.evaluate(
      makeContext({
        transcript: [
          {
            ...makeTranscriptTurn(1),
            body: "A".repeat(13_200),
          },
          makeTranscriptTurn(2),
          makeTranscriptTurn(3),
        ],
      }),
    );

    const payload = JSON.parse(parseMock.mock.calls[0][0].input[1].content as string);

    expect(payload.transcript[0].id).toBe("turn-1");
    expect(payload.transcript[0].text.length).toBeLessThanOrEqual(12_000);
    expect(payload.truncation.transcript).toMatchObject({
      openingPromptTruncated: true,
    });
    expect(payload.truncation.transcript.retainedCharCount).toBeLessThanOrEqual(12_000);
  });

  it("throws when OpenAI does not return parsed output", async () => {
    parseMock.mockResolvedValue({
      output_parsed: null,
    });

    const evaluator = createOpenAIResponsesReportEvaluator({
      apiKey: "test-api-key",
      model: "gpt-test",
    });

    await expect(evaluator.evaluate(makeContext())).rejects.toThrow(
      "OpenAI Responses did not return a parsed report evaluation.",
    );
  });

  it("falls back to callable OpenAI factory when constructor initialization fails", async () => {
    openaiConstructor.mockImplementationOnce(() => {
      throw new TypeError("not a constructor");
    });

    const evaluator = createOpenAIResponsesReportEvaluator({
      apiKey: "test-api-key",
      model: "gpt-test",
    });

    await evaluator.evaluate(makeContext());

    expect(openaiConstructor).toHaveBeenCalledTimes(2);
    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it("rethrows unexpected OpenAI initialization errors", () => {
    openaiConstructor.mockImplementationOnce(function OpenAIThrows() {
      throw new Error("constructor failed");
    });

    expect(() =>
      createOpenAIResponsesReportEvaluator({
        apiKey: "test-api-key",
        model: "gpt-test",
      }),
    ).toThrow("constructor failed");
  });
});
