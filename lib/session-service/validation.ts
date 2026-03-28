import { z } from "zod";

export const interviewModeSchema = z.enum([
  "behavioral",
  "resume",
  "project",
  "system-design",
]);

export const transcriptSpeakerSchema = z.enum([
  "interviewer",
  "candidate",
]);

export const createInterviewSessionRequestSchema = z.object({
  targetRoleId: z.string().trim().min(1),
  mode: interviewModeSchema,
  title: z.string().trim().min(1).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
});

export const appendTranscriptTurnSchema = z.object({
  speaker: transcriptSpeakerSchema,
  body: z.string().trim().min(1),
  seconds: z.number().int().nonnegative(),
  confidence: z.number().int().min(0).max(100).optional(),
});

export const appendTranscriptTurnsRequestSchema = z.object({
  batchId: z.string().trim().min(1).optional(),
  baseSequenceIndex: z.number().int().nonnegative().optional(),
  turns: z.array(appendTranscriptTurnSchema).min(1),
});

export const completeSessionRequestSchema = z.object({
  overallScore: z.number().int().min(0).max(100).optional(),
});
