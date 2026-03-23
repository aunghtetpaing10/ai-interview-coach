import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createInterviewSessionService } from "@/lib/session-service/session-service";
import { createWorkspaceInterviewSessionStore } from "@/lib/workspace/runtime";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const service = createInterviewSessionService(await createWorkspaceInterviewSessionStore());
  const session = await service.getSession({ userId: user.id, sessionId });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json(session);
}
