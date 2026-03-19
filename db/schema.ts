import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { AnswerRewrite, CitationBlock } from "@/lib/reporting/types";
import type { Scorecard } from "@/lib/types/interview";

export type InterviewMode =
  | "behavioral"
  | "resume"
  | "project"
  | "system-design";

export type RubricKey =
  | "clarity"
  | "ownership"
  | "technical-depth"
  | "communication"
  | "systems-thinking";

export type SessionStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type TranscriptSpeaker = "interviewer" | "candidate";
export type ScoreBand = "training" | "improving" | "ready";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  headline: text("headline").notNull(),
  targetRole: text("target_role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const targetRoles = pgTable("target_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  companyType: text("company_type").notNull(),
  level: text("level").notNull(),
  focusAreas: jsonb("focus_areas").$type<readonly string[]>(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const resumeAssets = pgTable("resume_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  summary: text("summary").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export const jobTargets = pgTable("job_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  targetRoleId: uuid("target_role_id")
    .notNull()
    .references(() => targetRoles.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  jobTitle: text("job_title").notNull(),
  jobUrl: text("job_url").notNull(),
  jobDescription: text("job_description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rubricDimensions = pgTable("rubric_dimensions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  maxScore: integer("max_score").notNull().default(5),
});

export const questionBank = pgTable("question_bank", {
  id: uuid("id").primaryKey().defaultRandom(),
  mode: text("mode").$type<InterviewMode>().notNull(),
  prompt: text("prompt").notNull(),
  followUps: jsonb("follow_ups").$type<readonly string[]>(),
  rubricKeys: jsonb("rubric_keys").$type<readonly RubricKey[]>(),
  sourceTag: text("source_tag").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const interviewSessions = pgTable("interview_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  targetRoleId: uuid("target_role_id")
    .notNull()
    .references(() => targetRoles.id, { onDelete: "cascade" }),
  mode: text("mode").$type<InterviewMode>().notNull(),
  status: text("status").$type<SessionStatus>().notNull().default("draft"),
  title: text("title").notNull(),
  overallScore: integer("overall_score"),
  durationSeconds: integer("duration_seconds").notNull().default(18 * 60),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const transcriptTurns = pgTable("transcript_turns", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => interviewSessions.id, { onDelete: "cascade" }),
  speaker: text("speaker").$type<TranscriptSpeaker>().notNull(),
  body: text("body").notNull(),
  seconds: integer("seconds").notNull(),
  sequenceIndex: integer("sequence_index").notNull().default(0),
  confidence: integer("confidence").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const feedbackReports = pgTable("feedback_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => interviewSessions.id, { onDelete: "cascade" }),
  promptVersionId: uuid("prompt_version_id").references(() => promptVersions.id, {
    onDelete: "set null",
  }),
  summary: text("summary").notNull(),
  scorecard: jsonb("scorecard").$type<Scorecard>().notNull(),
  strengths: jsonb("strengths").$type<readonly string[]>(),
  gaps: jsonb("gaps").$type<readonly string[]>(),
  citations: jsonb("citations").$type<readonly CitationBlock[]>(),
  rewrites: jsonb("rewrites").$type<readonly AnswerRewrite[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const practicePlans = pgTable("practice_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => interviewSessions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  focus: text("focus").notNull(),
  steps: jsonb("steps").$type<
    readonly { title: string; description: string; length: string }[]
  >(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const promptVersions = pgTable("prompt_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  model: text("model").notNull(),
  hash: text("hash").notNull(),
  notes: text("notes").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evalCases = pgTable("eval_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  mode: text("mode").$type<InterviewMode>().notNull(),
  expectedBand: text("expected_band").$type<ScoreBand>().notNull(),
  fixturePath: text("fixture_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ProfileRow = InferSelectModel<typeof profiles>;
export type TargetRoleRow = InferSelectModel<typeof targetRoles>;
export type ResumeAssetRow = InferSelectModel<typeof resumeAssets>;
export type JobTargetRow = InferSelectModel<typeof jobTargets>;
export type RubricDimensionRow = InferSelectModel<typeof rubricDimensions>;
export type QuestionBankRow = InferSelectModel<typeof questionBank>;
export type InterviewSessionRow = InferSelectModel<typeof interviewSessions>;
export type TranscriptTurnRow = InferSelectModel<typeof transcriptTurns>;
export type FeedbackReportRow = InferSelectModel<typeof feedbackReports>;
export type PracticePlanRow = InferSelectModel<typeof practicePlans>;
export type PromptVersionRow = InferSelectModel<typeof promptVersions>;
export type EvalCaseRow = InferSelectModel<typeof evalCases>;

export type NewProfileRow = InferInsertModel<typeof profiles>;
export type NewTargetRoleRow = InferInsertModel<typeof targetRoles>;
export type NewResumeAssetRow = InferInsertModel<typeof resumeAssets>;
export type NewJobTargetRow = InferInsertModel<typeof jobTargets>;
export type NewRubricDimensionRow = InferInsertModel<typeof rubricDimensions>;
export type NewQuestionBankRow = InferInsertModel<typeof questionBank>;
export type NewInterviewSessionRow = InferInsertModel<typeof interviewSessions>;
export type NewTranscriptTurnRow = InferInsertModel<typeof transcriptTurns>;
export type NewFeedbackReportRow = InferInsertModel<typeof feedbackReports>;
export type NewPracticePlanRow = InferInsertModel<typeof practicePlans>;
export type NewPromptVersionRow = InferInsertModel<typeof promptVersions>;
export type NewEvalCaseRow = InferInsertModel<typeof evalCases>;
