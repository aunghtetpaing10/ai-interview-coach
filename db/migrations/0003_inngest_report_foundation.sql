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
  CONSTRAINT "report_generation_jobs_session_id_unique" UNIQUE("session_id")
);--> statement-breakpoint
ALTER TABLE "report_generation_jobs" ADD CONSTRAINT "report_generation_jobs_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_generation_jobs" ADD CONSTRAINT "report_generation_jobs_report_id_feedback_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."feedback_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_generation_jobs_user_id_updated_at_idx" ON "report_generation_jobs" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "report_generation_jobs_status_idx" ON "report_generation_jobs" USING btree ("status");--> statement-breakpoint
ALTER TABLE "report_generation_jobs" ADD CONSTRAINT "report_generation_jobs_status_check" CHECK ("report_generation_jobs"."status" in ('queued', 'running', 'completed', 'failed'));--> statement-breakpoint
ALTER TABLE "report_generation_jobs" ADD CONSTRAINT "report_generation_jobs_attempt_count_check" CHECK ("report_generation_jobs"."attempt_count" >= 0);
