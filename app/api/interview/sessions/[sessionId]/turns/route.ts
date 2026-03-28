import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { buildRateLimitResponse } from "@/lib/rate-limit/http";
import { evaluateRateLimit, getRequestIp } from "@/lib/rate-limit/upstash";
import {
  createInterviewSessionService,
  SessionServiceError,
} from "@/lib/session-service/session-service";
import { appendTranscriptTurnsRequestSchema } from "@/lib/session-service/validation";
import { createWorkspaceInterviewSessionStore } from "@/lib/workspace/runtime";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitEvaluation = await evaluateRateLimit("transcript_append", {
    ip: getRequestIp(request),
    user: user.id,
  });
  if (!rateLimitEvaluation.success && rateLimitEvaluation.enforced) {
    return buildRateLimitResponse(rateLimitEvaluation);
  }
  const rateLimitHeaders = rateLimitEvaluation.headers;

  const { sessionId } = await context.params;
  const parsed = appendTranscriptTurnsRequestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid transcript turns.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const service = createInterviewSessionService(await createWorkspaceInterviewSessionStore());

  try {
    const session = await service.appendTranscriptTurnsWithAck({
      userId: user.id,
      sessionId,
      batchId: parsed.data.batchId,
      baseSequenceIndex: parsed.data.baseSequenceIndex,
      turns: parsed.data.turns,
    });
    const sessionView = await service.getSession({
      userId: user.id,
      sessionId,
    });

    return NextResponse.json(
      {
        session: session.session,
        transcriptTurns: sessionView?.transcriptTurns ?? [],
        batchId: session.batchId,
        replayed: session.replayed,
        firstSequenceIndex: session.firstSequenceIndex,
        nextSequenceIndex: session.nextSequenceIndex,
        appendedTurns: session.appendedTurns,
        data: session,
      },
      { headers: rateLimitHeaders },
    );
  } catch (error) {
    if (error instanceof SessionServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status, headers: rateLimitHeaders },
      );
    }

    throw error;
  }
}
