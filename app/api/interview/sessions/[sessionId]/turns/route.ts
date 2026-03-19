import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createDatabaseInterviewSessionStore } from "@/lib/session-service/database-store";
import {
  createInterviewSessionService,
  SessionServiceError,
} from "@/lib/session-service/session-service";
import type { TranscriptSpeaker } from "@/db/schema";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

type IncomingTurn = {
  speaker?: TranscriptSpeaker;
  body?: string;
  seconds?: number;
  confidence?: number;
};

type ValidIncomingTurn = {
  speaker: TranscriptSpeaker;
  body: string;
  seconds: number;
  confidence?: number;
};

interface AppendTurnsBody {
  turns?: IncomingTurn[];
}

function parseBody(body: unknown): AppendTurnsBody {
  if (!body || typeof body !== "object") {
    return {};
  }

  return body as AppendTurnsBody;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const body = parseBody(await request.json().catch(() => null));

  if (!Array.isArray(body.turns) || body.turns.length === 0) {
    return NextResponse.json({ error: "turns are required." }, { status: 400 });
  }

  const turns = body.turns.filter(
    (turn): turn is ValidIncomingTurn =>
      Boolean(turn.speaker) &&
      typeof turn.body === "string" &&
      typeof turn.seconds === "number",
  ).map((turn) => ({
    speaker: turn.speaker,
    body: turn.body,
    seconds: turn.seconds,
    confidence: turn.confidence,
  }));

  if (turns.length !== body.turns.length) {
    return NextResponse.json({ error: "Invalid transcript turns." }, { status: 400 });
  }

  const service = createInterviewSessionService(createDatabaseInterviewSessionStore());

  try {
    const session = await service.appendTranscriptTurns({
      userId: user.id,
      sessionId,
      turns,
    });

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof SessionServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    throw error;
  }
}
