import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createInterviewSessionService } from "@/lib/session-service/session-service";
import { createInterviewSessionRequestSchema } from "@/lib/session-service/validation";
import { createWorkspaceInterviewSessionStore } from "@/lib/workspace/runtime";

export async function POST(request: Request) {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createInterviewSessionRequestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid session request.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const store = await createWorkspaceInterviewSessionStore();
  const targetRole = await store.getTargetRoleById(user.id, parsed.data.targetRoleId);

  if (!targetRole) {
    return NextResponse.json({ error: "Target role not found." }, { status: 404 });
  }

  const service = createInterviewSessionService(store);
  const session = await service.createSession({
    userId: user.id,
    targetRoleId: parsed.data.targetRoleId,
    mode: parsed.data.mode,
    title: parsed.data.title ?? `${targetRole.title} interview`,
    durationSeconds: parsed.data.durationSeconds,
  });

  return NextResponse.json(session, { status: 201 });
}
