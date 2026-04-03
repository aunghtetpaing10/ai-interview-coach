ALTER TABLE "interview_sessions" DROP CONSTRAINT IF EXISTS "interview_sessions_mode_check";--> statement-breakpoint
DROP INDEX IF EXISTS "transcript_turns_session_id_idx";--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "practice_style" text DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "difficulty" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "company_style" text;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "question_id" text;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "question_family" text;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "difficulty" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "company_tags" jsonb;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "interviewer_goal" text;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "follow_up_policy" text;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "coaching_outline" jsonb;--> statement-breakpoint
UPDATE "question_bank"
SET
  "title" = COALESCE(
    NULLIF(trim("title"), ''),
    NULLIF(trim(split_part("prompt", E'\n', 1)), ''),
    'Interview question'
  ),
  "question_family" = COALESCE(
    NULLIF(trim("question_family"), ''),
    "mode"
  ),
  "difficulty" = COALESCE("difficulty", 'standard'),
  "interviewer_goal" = COALESCE(
    NULLIF(trim("interviewer_goal"), ''),
    'Assess candidate judgment and communication under realistic interview constraints.'
  ),
  "follow_up_policy" = COALESCE(
    NULLIF(trim("follow_up_policy"), ''),
    'Probe for specificity, trade-offs, and measurable impact without revealing answers.'
  ),
  "coaching_outline" = COALESCE("coaching_outline", '[]'::jsonb);--> statement-breakpoint
ALTER TABLE "question_bank" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ALTER COLUMN "question_family" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ALTER COLUMN "difficulty" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ALTER COLUMN "interviewer_goal" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ALTER COLUMN "follow_up_policy" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_practice_style_check" CHECK ("interview_sessions"."practice_style" in ('guided', 'live'));--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_difficulty_check" CHECK ("interview_sessions"."difficulty" in ('standard', 'challenging', 'stretch'));--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_company_style_check" CHECK ("interview_sessions"."company_style" is null or "interview_sessions"."company_style" in ('general', 'amazon', 'google', 'meta', 'stripe'));--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_mode_check" CHECK ("interview_sessions"."mode" in ('behavioral', 'coding', 'resume', 'project', 'system-design'));
