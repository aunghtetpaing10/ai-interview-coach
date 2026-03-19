import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createDatabaseInterviewSessionStore } from "@/lib/session-service/database-store";
import { createInterviewSessionService } from "@/lib/session-service/session-service";
import type { InterviewMode } from "@/lib/types/interview";

interface CreateSessionBody {
  targetRoleId?: string;
  mode?: InterviewMode;
  title?: string;
  durationSeconds?: number;
}

function parseBody(body: unknown): CreateSessionBody {
  if (!body || typeof body !== "object") {
    return {};
  }

  return body as CreateSessionBody;
}

export async function POST(request: Request) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = parseBody(await request.json().catch(() => null));

  if (!body.targetRoleId || !body.mode) {
    return NextResponse.json(
      { error: "targetRoleId and mode are required." },
      { status: 400 },
    );
  }

  const store = createDatabaseInterviewSessionStore();
  const targetRole = await store.getTargetRoleById(user.id, body.targetRoleId);

  if (!targetRole) {
    return NextResponse.json({ error: "Target role not found." }, { status: 404 });
  }

  const service = createInterviewSessionService(store);
  const session = await service.createSession({
    userId: user.id,
    targetRoleId: body.targetRoleId,
    mode: body.mode,
    title: body.title ?? `${targetRole.title} interview`,
    durationSeconds: body.durationSeconds,
  });

  return NextResponse.json(session, { status: 201 });
}
