ALTER TABLE "interview_sessions"
ADD COLUMN "next_transcript_sequence_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_sessions"
ADD CONSTRAINT "interview_sessions_next_transcript_sequence_index_check" CHECK ("interview_sessions"."next_transcript_sequence_index" >= 0);--> statement-breakpoint
CREATE TABLE "transcript_append_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "batch_id" text NOT NULL,
  "request_hash" text NOT NULL,
  "turn_count" integer NOT NULL,
  "first_sequence_index" integer NOT NULL,
  "last_sequence_index" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "transcript_append_batches"
ADD CONSTRAINT "transcript_append_batches_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_append_batches_session_id_batch_id_idx" ON "transcript_append_batches" USING btree ("session_id","batch_id");--> statement-breakpoint
CREATE INDEX "transcript_append_batches_session_id_created_at_idx" ON "transcript_append_batches" USING btree ("session_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "transcript_append_batches"
ADD CONSTRAINT "transcript_append_batches_turn_count_check" CHECK ("transcript_append_batches"."turn_count" > 0);--> statement-breakpoint
ALTER TABLE "transcript_append_batches"
ADD CONSTRAINT "transcript_append_batches_sequence_range_check" CHECK ("transcript_append_batches"."first_sequence_index" <= "transcript_append_batches"."last_sequence_index");--> statement-breakpoint
ALTER TABLE "feedback_reports"
ADD COLUMN "artifact" jsonb;
