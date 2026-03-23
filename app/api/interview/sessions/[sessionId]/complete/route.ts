import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import {
  createInterviewSessionService,
  SessionServiceError,
} from "@/lib/session-service/session-service";
import { completeSessionRequestSchema } from "@/lib/session-service/validation";
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

  const { sessionId } = await context.params;
  const parsed = completeSessionRequestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid completion request.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const service = createInterviewSessionService(await createWorkspaceInterviewSessionStore());

  try {
    const session = await service.completeSession({
      userId: user.id,
      sessionId,
      overallScore: parsed.data.overallScore,
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
