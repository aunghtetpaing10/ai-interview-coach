import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/session";
import { createPostgresProgressStore } from "@/lib/progress-service/database-store";
import { createProgressService } from "@/lib/progress-service/progress-service";

export async function GET() {
  const user = await getWorkspaceUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const progressService = createProgressService(createPostgresProgressStore());
  const sessions = await progressService.listProgressSessions(user.id);
  const snapshot = await progressService.getProgressSnapshot(user.id);

  return NextResponse.json({
    sessions,
    snapshot,
  });
}
