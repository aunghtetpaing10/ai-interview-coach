import { describe, expect, it, vi } from "vitest";
import type {
  InterviewMode,
  InterviewSessionRow,
  JobTargetRow,
  ProfileRow,
  QuestionBankRow,
  ResumeAssetRow,
  RubricDimensionRow,
  TargetRoleRow,
} from "@/db/schema";
import { createDatabaseInterviewRepository } from "@/lib/data/database-repository";

vi.mock("server-only", () => ({}));

function makeRepositoryFixture() {
  const profile: ProfileRow = {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    fullName: "Aung Htet Paing",
    headline: "Backend engineer",
    targetRole: "Platform engineer",
    createdAt: new Date("2026-03-19T00:00:00.000Z"),
    updatedAt: new Date("2026-03-19T00:00:00.000Z"),
  };

  const targetRole: TargetRoleRow = {
    id: "22222222-2222-2222-2222-222222222222",
    userId: profile.userId,
    title: "Platform engineer",
    companyType: "startup",
    level: "mid-level",
    focusAreas: ["systems-thinking", "technical-depth"],
    active: true,
    createdAt: new Date("2026-03-19T00:00:00.000Z"),
  };

  const jobTarget: JobTargetRow = {
    id: "33333333-3333-3333-3333-333333333333",
    userId: profile.userId,
    targetRoleId: targetRole.id,
    companyName: "Northstar",
    jobTitle: "Software Engineer",
    jobUrl: "https://example.com/jobs/software-engineer",
    jobDescription: "Build APIs and improve system reliability.",
    createdAt: new Date("2026-03-19T00:00:00.000Z"),
    updatedAt: new Date("2026-03-19T00:00:00.000Z"),
  };

  const resumeAsset: ResumeAssetRow = {
    id: "44444444-4444-4444-4444-444444444444",
    userId: profile.userId,
    fileName: "resume.pdf",
    storagePath: "resumes/aung.pdf",
    mimeType: "application/pdf",
    summary: "Scaled backend services and improved reliability.",
    uploadedAt: new Date("2026-03-19T00:00:00.000Z"),
  };

  const rubricDimensions: readonly RubricDimensionRow[] = [
    {
      id: "55555555-5555-5555-5555-555555555555",
      key: "clarity",
      label: "Clarity",
      description: "How clearly the answer communicates scope and tradeoffs.",
      maxScore: 5,
    },
  ];

  const questionBank: readonly QuestionBankRow[] = [
    {
      id: "66666666-6666-6666-6666-666666666666",
      mode: "system-design",
      prompt: "Design a notification service.",
      followUps: ["How do you handle retries?"],
      rubricKeys: ["technical-depth", "systems-thinking"],
      sourceTag: "seed",
      orderIndex: 1,
    },
    {
      id: "77777777-7777-7777-7777-777777777777",
      mode: "behavioral",
      prompt: "Tell me about a time you owned a problem.",
      followUps: ["What changed because of your decision?"],
      rubricKeys: ["ownership", "communication"],
      sourceTag: "seed",
      orderIndex: 2,
    },
  ];

  const sessions: readonly InterviewSessionRow[] = [
    {
      id: "88888888-8888-8888-8888-888888888888",
      userId: profile.userId,
      targetRoleId: targetRole.id,
      mode: "system-design",
      status: "completed",
      title: "Notification service drill",
      overallScore: 84,
      startedAt: new Date("2026-03-18T10:00:00.000Z"),
      endedAt: new Date("2026-03-18T10:18:00.000Z"),
      durationSeconds: 18 * 60,
      createdAt: new Date("2026-03-18T09:59:00.000Z"),
      updatedAt: new Date("2026-03-18T10:18:00.000Z"),
    },
  ];

  return createDatabaseInterviewRepository({
    async getProfile(userId) {
      return userId === profile.userId ? profile : null;
    },
    async listTargetRoles(userId) {
      return userId === profile.userId ? [targetRole] : [];
    },
    async listSessions(userId) {
      return userId === profile.userId ? sessions : [];
    },
    async listQuestionBank(mode?: InterviewMode) {
      return mode
        ? questionBank.filter((question) => question.mode === mode)
        : questionBank;
    },
    async listRubricDimensions() {
      return rubricDimensions;
    },
    async getLatestResumeAsset(userId) {
      return userId === profile.userId ? resumeAsset : null;
    },
    async getActiveJobTarget(userId) {
      return userId === profile.userId ? jobTarget : null;
    },
  });
}

describe("database interview repository", () => {
  it("builds a workspace snapshot from persisted user-owned rows", async () => {
    const repository = makeRepositoryFixture();

    const snapshot = await repository.getWorkspaceSnapshot(
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    );

    expect(snapshot.profile?.fullName).toBe("Aung Htet Paing");
    expect(snapshot.targetRole?.title).toBe("Platform engineer");
    expect(snapshot.activeMode).toBe("system-design");
    expect(snapshot.recentSessionCount).toBe(1);
    expect(snapshot.jobTarget?.companyName).toBe("Northstar");
    expect(snapshot.resumeAsset?.fileName).toBe("resume.pdf");
  });

  it("filters the question bank by interview mode", async () => {
    const repository = makeRepositoryFixture();
    const questions = await repository.listQuestionBank("behavioral");

    expect(questions).toHaveLength(1);
    expect(questions[0]?.mode).toBe("behavioral");
  });
});
