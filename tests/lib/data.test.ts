import { describe, expect, it } from "vitest";
import { SEED_QUESTION_BANK, SEED_RUBRIC_DIMENSIONS } from "@/db/seed";
import { createSeededInterviewRepository } from "@/lib/data/repository";
import { getWorkspaceMetricCopy } from "@/lib/data/workspace";

describe("seeded interview repository", () => {
  it("returns deterministic question bank entries by mode", async () => {
    const repository = createSeededInterviewRepository();

    const systemDesignQuestions = await repository.listQuestionBank("system-design");

    expect(systemDesignQuestions).toHaveLength(1);
    expect(systemDesignQuestions[0]?.id).toBe("question_system_design_capacity");
    expect(systemDesignQuestions[0]?.prompt).toContain("notification service");
  });

  it("builds a workspace snapshot with stable counts", async () => {
    const repository = createSeededInterviewRepository(undefined, {
      profile: {
        id: "profile_1",
        userId: "user_1",
        fullName: "Aung Htet Paing",
        headline: "Mid-level software engineer",
        targetRole: "Platform engineer",
        createdAt: new Date("2026-03-19T00:00:00.000Z"),
        updatedAt: new Date("2026-03-19T00:00:00.000Z"),
      },
      targetRoles: [
        {
          id: "target_1",
          userId: "user_1",
          title: "Platform engineer",
          companyType: "startup",
          level: "mid",
          focusAreas: ["systems-thinking", "technical-depth"],
          active: true,
          createdAt: new Date("2026-03-19T00:00:00.000Z"),
        },
      ],
      sessions: [
        {
          id: "session_1",
          userId: "user_1",
          targetRoleId: "target_1",
          mode: "system-design",
          status: "completed",
          title: "Notification service drill",
          overallScore: 82,
          durationSeconds: 20 * 60,
          startedAt: new Date("2026-03-18T00:00:00.000Z"),
          endedAt: new Date("2026-03-18T00:20:00.000Z"),
          createdAt: new Date("2026-03-18T00:00:00.000Z"),
          updatedAt: new Date("2026-03-18T00:20:00.000Z"),
        },
      ],
    });

    const snapshot = await repository.getWorkspaceSnapshot("user_1");
    const metrics = getWorkspaceMetricCopy(snapshot);

    expect(snapshot.questionCount).toBe(SEED_QUESTION_BANK.length);
    expect(snapshot.rubricCount).toBe(SEED_RUBRIC_DIMENSIONS.length);
    expect(snapshot.recentSessionCount).toBe(1);
    expect(snapshot.activeMode).toBe("system-design");
    expect(metrics[0]?.value).toBe("Platform engineer");
    expect(metrics[2]?.value).toBe(`${SEED_RUBRIC_DIMENSIONS.length} criteria`);
  });
});
