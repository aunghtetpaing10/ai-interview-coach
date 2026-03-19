import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import {
  createRealtimeOpenAIClient,
  createRealtimeClientSecret,
  toRealtimeSessionSecretPayload,
} from "@/lib/openai/realtime-session";

const realtimeSessionRequestSchema = z.object({
  candidateName: z.string().trim().min(1),
  targetRole: z.string().trim().min(1),
  mode: z.enum(["behavioral", "resume", "project", "system-design"]),
  focus: z.string().trim().min(1),
  openingPrompt: z.string().trim().min(1),
});

export async function POST(request: Request) {
  if (!(await getWorkspaceUser())) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const env = getEnv();

  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI Realtime is not configured." },
      { status: 503 },
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
      { status: 400 },
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
  });
}
