import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createDatabaseInterviewSessionStore } from "@/lib/session-service/database-store";
import {
  createInterviewSessionService,
  SessionServiceError,
} from "@/lib/session-service/session-service";
import { appendTranscriptTurnsRequestSchema } from "@/lib/session-service/validation";

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
      { status: 400 },
    );
  }

  const service = createInterviewSessionService(createDatabaseInterviewSessionStore());

  try {
    const session = await service.appendTranscriptTurns({
      userId: user.id,
      sessionId,
      turns: parsed.data.turns,
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
