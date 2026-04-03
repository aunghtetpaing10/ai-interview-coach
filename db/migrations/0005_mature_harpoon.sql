CREATE TABLE "report_generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"report_id" uuid,
	"error_message" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_generation_jobs_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "report_generation_jobs_status_check" CHECK ("report_generation_jobs"."status" in ('queued', 'running', 'completed', 'failed')),
	CONSTRAINT "report_generation_jobs_attempt_count_check" CHECK ("report_generation_jobs"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "transcript_append_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"batch_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"turn_count" integer NOT NULL,
	"first_sequence_index" integer NOT NULL,
	"last_sequence_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transcript_append_batches_turn_count_check" CHECK ("transcript_append_batches"."turn_count" > 0),
	CONSTRAINT "transcript_append_batches_sequence_range_check" CHECK ("transcript_append_batches"."first_sequence_index" <= "transcript_append_batches"."last_sequence_index")
);
--> statement-breakpoint
ALTER TABLE "interview_sessions" DROP CONSTRAINT "interview_sessions_mode_check";--> statement-breakpoint
DROP INDEX "transcript_turns_session_id_idx";--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD COLUMN "artifact" jsonb;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "practice_style" text DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "difficulty" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "company_style" text;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "question_id" text;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "next_transcript_sequence_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "question_family" text NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "difficulty" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "company_tags" jsonb;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "interviewer_goal" text NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "follow_up_policy" text NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "coaching_outline" jsonb;--> statement-breakpoint
ALTER TABLE "report_generation_jobs" ADD CONSTRAINT "report_generation_jobs_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_generation_jobs" ADD CONSTRAINT "report_generation_jobs_report_id_feedback_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."feedback_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_append_batches" ADD CONSTRAINT "transcript_append_batches_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_generation_jobs_user_id_updated_at_idx" ON "report_generation_jobs" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "report_generation_jobs_status_idx" ON "report_generation_jobs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_append_batches_session_id_batch_id_idx" ON "transcript_append_batches" USING btree ("session_id","batch_id");--> statement-breakpoint
CREATE INDEX "transcript_append_batches_session_id_created_at_idx" ON "transcript_append_batches" USING btree ("session_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feedback_reports_session_id_created_at_idx" ON "feedback_reports" USING btree ("session_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "practice_plans_session_id_created_at_idx" ON "practice_plans" USING btree ("session_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_practice_style_check" CHECK ("interview_sessions"."practice_style" in ('guided', 'live'));--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_difficulty_check" CHECK ("interview_sessions"."difficulty" in ('standard', 'challenging', 'stretch'));--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_company_style_check" CHECK ("interview_sessions"."company_style" is null or "interview_sessions"."company_style" in ('general', 'amazon', 'google', 'meta', 'stripe'));--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_next_transcript_sequence_index_check" CHECK ("interview_sessions"."next_transcript_sequence_index" >= 0);--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_mode_check" CHECK ("interview_sessions"."mode" in ('behavioral', 'coding', 'resume', 'project', 'system-design'));