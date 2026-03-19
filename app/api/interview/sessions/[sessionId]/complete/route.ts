import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createDatabaseInterviewSessionStore } from "@/lib/session-service/database-store";
import {
  createInterviewSessionService,
  SessionServiceError,
} from "@/lib/session-service/session-service";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

interface CompleteSessionBody {
  overallScore?: number;
}

function parseBody(body: unknown): CompleteSessionBody {
  if (!body || typeof body !== "object") {
    return {};
  }

  return body as CompleteSessionBody;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const body = parseBody(await request.json().catch(() => null));

  const service = createInterviewSessionService(createDatabaseInterviewSessionStore());

  try {
    const session = await service.completeSession({
      userId: user.id,
      sessionId,
      overallScore: body.overallScore,
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
