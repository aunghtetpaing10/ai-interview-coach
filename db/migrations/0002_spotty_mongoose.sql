CREATE UNIQUE INDEX "feedback_reports_session_id_idx" ON "feedback_reports" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "feedback_reports_session_id_created_at_idx" ON "feedback_reports" USING btree ("session_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feedback_reports_prompt_version_id_idx" ON "feedback_reports" USING btree ("prompt_version_id");--> statement-breakpoint
CREATE INDEX "interview_sessions_user_id_updated_at_idx" ON "interview_sessions" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interview_sessions_target_role_id_idx" ON "interview_sessions" USING btree ("target_role_id");--> statement-breakpoint
CREATE INDEX "job_targets_user_id_updated_at_idx" ON "job_targets" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_targets_target_role_id_idx" ON "job_targets" USING btree ("target_role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_plans_session_id_idx" ON "practice_plans" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "practice_plans_session_id_created_at_idx" ON "practice_plans" USING btree ("session_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "resume_assets_user_id_uploaded_at_idx" ON "resume_assets" USING btree ("user_id","uploaded_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "target_roles_user_id_idx" ON "target_roles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_turns_session_id_sequence_index_idx" ON "transcript_turns" USING btree ("session_id","sequence_index");--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_mode_check" CHECK ("interview_sessions"."mode" in ('behavioral', 'resume', 'project', 'system-design'));--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_status_check" CHECK ("interview_sessions"."status" in ('draft', 'active', 'paused', 'completed', 'archived'));--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_duration_seconds_check" CHECK ("interview_sessions"."duration_seconds" >= 0);--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_overall_score_check" CHECK ("interview_sessions"."overall_score" is null or "interview_sessions"."overall_score" between 0 and 100);--> statement-breakpoint
ALTER TABLE "transcript_turns" ADD CONSTRAINT "transcript_turns_speaker_check" CHECK ("transcript_turns"."speaker" in ('interviewer', 'candidate'));--> statement-breakpoint
ALTER TABLE "transcript_turns" ADD CONSTRAINT "transcript_turns_seconds_check" CHECK ("transcript_turns"."seconds" >= 0);--> statement-breakpoint
ALTER TABLE "transcript_turns" ADD CONSTRAINT "transcript_turns_confidence_check" CHECK ("transcript_turns"."confidence" between 0 and 100);
