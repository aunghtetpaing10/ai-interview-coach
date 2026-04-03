import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/session";
import { getEnv, isE2EDemoMode } from "@/lib/env";
import {
  createRealtimeOpenAIClient,
  createRealtimeClientSecret,
  toRealtimeSessionSecretPayload,
} from "@/lib/openai/realtime-session";
import { buildRateLimitResponse } from "@/lib/rate-limit/http";
import { evaluateRateLimit, getRequestIp } from "@/lib/rate-limit/upstash";
import {
  companyStyleSchema,
  interviewDifficultySchema,
  interviewModeSchema,
  practiceStyleSchema,
} from "@/lib/session-service/validation";

const realtimeSessionRequestSchema = z.object({
  candidateName: z.string().trim().min(1),
  targetRole: z.string().trim().min(1),
  mode: interviewModeSchema,
  practiceStyle: practiceStyleSchema,
  difficulty: interviewDifficultySchema,
  companyStyle: companyStyleSchema.nullable(),
  questionId: z.string().trim().min(1),
  questionTitle: z.string().trim().min(1),
  stageIndex: z.number().int().nonnegative(),
  stageLabel: z.string().trim().min(1),
  focus: z.string().trim().min(1),
  interviewerGoal: z.string().trim().min(1),
  followUpPolicy: z.string().trim().min(1),
  openingPrompt: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const user = await getWorkspaceUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }
  const rateLimitEvaluation = await evaluateRateLimit("realtime_session", {
    ip: getRequestIp(request),
    user: user.id,
  });
  if (!rateLimitEvaluation.success && rateLimitEvaluation.enforced) {
    return buildRateLimitResponse(rateLimitEvaluation);
  }
  const rateLimitHeaders = rateLimitEvaluation.headers;

  if (isE2EDemoMode()) {
    return NextResponse.json(
      { error: "OpenAI Realtime is disabled in demo mode." },
      { status: 503, headers: rateLimitHeaders },
    );
  }

  const env = getEnv();

  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI Realtime is not configured." },
      { status: 503, headers: rateLimitHeaders },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = realtimeSessionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid realtime session request.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const openaiClient = createRealtimeOpenAIClient(env.OPENAI_API_KEY);
  const session = await createRealtimeClientSecret({
    openaiClient,
    input: parsed.data,
    options: {
      model: env.OPENAI_REALTIME_MODEL,
    },
  });

  return NextResponse.json({
    ...toRealtimeSessionSecretPayload(session),
  }, { headers: rateLimitHeaders });
}
