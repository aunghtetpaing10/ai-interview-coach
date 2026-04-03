import OpenAI from "openai";
import { getEnv } from "@/lib/env";
import {
  getCompanyStyleLabel,
  getInterviewDifficultyLabel,
  getInterviewModeLabel,
  getPracticeStyleLabel,
} from "@/lib/domain/interview";
import type { ClientSecretCreateParams, ClientSecretCreateResponse } from "openai/resources/realtime/client-secrets";
import type {
  RealtimeAudioConfigOutput,
  RealtimeSessionCreateRequest,
} from "openai/resources/realtime/realtime";
import type {
  CompanyStyle,
  InterviewDifficulty,
  InterviewMode,
  PracticeStyle,
} from "@/lib/types/interview";
import type { RealtimeSessionSnapshot } from "@/lib/interview-session/types";

export interface RealtimeSessionConfigInput {
  candidateName: string;
  targetRole: string;
  mode: InterviewMode;
  practiceStyle: PracticeStyle;
  difficulty: InterviewDifficulty;
  companyStyle: CompanyStyle | null;
  questionId: string;
  questionTitle: string;
  stageIndex: number;
  stageLabel: string;
  focus: string;
  interviewerGoal: string;
  followUpPolicy: string;
  openingPrompt: string;
}

export interface RealtimeSessionConfigOptions {
  clientSecretTtlSeconds?: number;
  includeTranscriptionLogprobs?: boolean;
  maxOutputTokens?: number | "inf";
  model?: string;
  transcriptionModel?: string;
  voice?: RealtimeAudioConfigOutput["voice"];
}

export interface RealtimeOpenAIClient {
  realtime: {
    clientSecrets: {
      create(body: ClientSecretCreateParams): Promise<ClientSecretCreateResponse>;
    };
  };
}

export interface RealtimeSessionSecretPayload {
  provider: "openai";
  clientSecret: {
    expiresAt: number;
    value: string;
  };
  session: ClientSecretCreateResponse["session"];
}

export function createRealtimeOpenAIClient(apiKey: string): RealtimeOpenAIClient {
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: process.env.NODE_ENV === "test",
  });
}

const DEFAULT_CLIENT_SECRET_TTL_SECONDS = 600;
const DEFAULT_MAX_OUTPUT_TOKENS = 512;
const DEFAULT_OUTPUT_VOICE: RealtimeAudioConfigOutput["voice"] = "marin";
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_MODEL = "gpt-realtime";
const DEFAULT_AUDIO_FORMAT = {
  type: "audio/pcm",
  rate: 24000,
} as const;
const DEFAULT_TURN_DETECTION = {
  type: "server_vad",
  create_response: true,
  prefix_padding_ms: 300,
  silence_duration_ms: 500,
  threshold: 0.5,
} as const;

export function createRealtimeSessionSnapshot(): RealtimeSessionSnapshot {
  const env = getEnv();
  const configured = Boolean(env.OPENAI_API_KEY);

  return {
    provider: configured ? "openai" : "mock",
    label: configured ? `${env.OPENAI_REALTIME_MODEL} realtime` : "Browser mock transport",
    transportHint: configured
      ? "Server-side realtime wiring can be enabled when an API key is available."
      : "No OpenAI API key is set, so the session uses deterministic local fallback behavior.",
    fallbackReason: configured
      ? "Realtime transport configured."
      : "OPENAI_API_KEY missing; using mock transport.",
    instructionPreview:
      "Probe the candidate's claims, keep the follow-up tight, and ground every question in the resume, target role, and transcript.",
  };
}

export function buildRealtimeInstructions(input: RealtimeSessionConfigInput) {
  return [
    `You are a senior interviewer coaching ${input.candidateName} for ${input.targetRole}.`,
    `Interview mode: ${getInterviewModeLabel(input.mode)}.`,
    `Practice style: ${getPracticeStyleLabel(input.practiceStyle)}.`,
    `Difficulty: ${getInterviewDifficultyLabel(input.difficulty)}.`,
    `Company style: ${input.companyStyle ? getCompanyStyleLabel(input.companyStyle) : "Generalist"}.`,
    `Question id: ${input.questionId}.`,
    `Question title: ${input.questionTitle}.`,
    `Current stage: ${input.stageLabel} (${input.stageIndex + 1}).`,
    `Focus area: ${input.focus}.`,
    `Interviewer goal: ${input.interviewerGoal}.`,
    `Follow-up policy: ${input.followUpPolicy}.`,
    `Opening prompt: ${input.openingPrompt}.`,
    "",
    "Behavior:",
    "- Keep follow-ups short, specific, and evidence-based.",
    "- Ground every question in the candidate's transcript and resume claims.",
    "- Ask for concrete tradeoffs, ownership, and outcomes.",
    "- Guided mode can scaffold the answer structure, but live mode must not reveal the solution.",
    "- If voice transport is unavailable, continue the same interview flow in text mode.",
  ].join("\n");
}

export function buildRealtimeSessionConfig(
  input: RealtimeSessionConfigInput,
  options: RealtimeSessionConfigOptions = {},
): RealtimeSessionCreateRequest {
  return {
    type: "realtime",
    model: options.model ?? DEFAULT_MODEL,
    output_modalities: ["audio"],
    max_output_tokens: options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    instructions: buildRealtimeInstructions(input),
    include: options.includeTranscriptionLogprobs
      ? ["item.input_audio_transcription.logprobs"]
      : undefined,
    audio: {
      input: {
        format: DEFAULT_AUDIO_FORMAT,
        transcription: {
          model: options.transcriptionModel ?? DEFAULT_TRANSCRIPTION_MODEL,
        },
        turn_detection: DEFAULT_TURN_DETECTION,
      },
      output: {
        format: DEFAULT_AUDIO_FORMAT,
        voice: options.voice ?? DEFAULT_OUTPUT_VOICE,
      },
    },
    truncation: "auto",
  };
}

export function buildRealtimeSessionCreateParams(
  input: RealtimeSessionConfigInput,
  options: RealtimeSessionConfigOptions = {},
): ClientSecretCreateParams {
  return {
    expires_after: {
      anchor: "created_at",
      seconds: options.clientSecretTtlSeconds ?? DEFAULT_CLIENT_SECRET_TTL_SECONDS,
    },
    session: buildRealtimeSessionConfig(input, options),
  };
}

export async function createRealtimeClientSecret({
  openaiClient,
  input,
  options,
}: {
  openaiClient: RealtimeOpenAIClient;
  input: RealtimeSessionConfigInput;
  options?: RealtimeSessionConfigOptions;
}): Promise<ClientSecretCreateResponse> {
  return openaiClient.realtime.clientSecrets.create(
    buildRealtimeSessionCreateParams(input, options),
  );
}

export function toRealtimeSessionSecretPayload(
  response: ClientSecretCreateResponse,
): RealtimeSessionSecretPayload {
  return {
    provider: "openai",
    clientSecret: {
      value: response.value,
      expiresAt: response.expires_at,
    },
    session: response.session,
  };
}
